import { ALLOCATIONS, BUCKET_ORDER, RETURNS, SOONER_SAFE_RETURNS, type Rates } from './assumptions';
import { addMonthsKey, parseMonthKey } from './dates';
import { finite, futureValueSeries, monthsToGoal, requiredMonthly } from './finance';
import type { Allocation, Band, Bucket, PlanSpec, PlanVersion, Tier } from './types';

export type Scenario3 = 'low' | 'base' | 'high';

export function bucketRates(bucket: Bucket, band: Band): Rates {
  if (bucket === 'safe' && band === 'SOONER') return SOONER_SAFE_RETURNS;
  return RETURNS[bucket];
}

/** Normalise any allocation to whole percentages that add to 100. */
export function normaliseAllocation(a: Partial<Allocation> | undefined, band: Band = 'LONG'): Allocation {
  const raw = {
    safe: Math.max(0, finite(a?.safe)),
    mid: Math.max(0, finite(a?.mid)),
    long: Math.max(0, finite(a?.long)),
  };
  const total = raw.safe + raw.mid + raw.long;
  if (total <= 0) return { ...ALLOCATIONS[band] };
  const safe = Math.round((raw.safe / total) * 100);
  const mid = Math.round((raw.mid / total) * 100);
  return { safe, mid, long: Math.max(0, 100 - safe - mid) };
}

/** Blended annual return for an allocation, per scenario. */
export function blendedRates(
  allocation: Allocation,
  band: Band,
  delta: Partial<Record<Bucket, number>> = {},
): Rates {
  const out: Rates = { low: 0, base: 0, high: 0 };
  for (const b of BUCKET_ORDER) {
    const share = finite(allocation[b]) / 100;
    const r = bucketRates(b, band);
    const d = finite(delta[b]);
    out.low += share * (r.low + d);
    out.base += share * (r.base + d);
    out.high += share * (r.high + d);
  }
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { low: round(out.low), base: round(out.base), high: round(out.high) };
}

export function specFromVersion(v: PlanVersion): PlanSpec {
  return {
    goalAmount: v.goal.amount,
    months: v.goal.months,
    existing: v.goal.existing ?? 0,
    stepUpPct: v.plan.stepUpPct,
    allocation: v.plan.allocation,
    band: v.goal.band,
    monthlyAmount: v.plan.monthlyAmount,
  };
}

export interface PlanRange {
  min: number; // Lean: needed if markets do well
  base: number; // Recommended
  max: number; // Cushion: needed if markets disappoint
}

export function planRange(spec: Omit<PlanSpec, 'monthlyAmount'>): PlanRange {
  const rates = blendedRates(spec.allocation, spec.band);
  const req = (annualRate: number) =>
    requiredMonthly({
      goal: spec.goalAmount,
      months: spec.months,
      annualRate,
      existing: spec.existing,
      stepUpPct: spec.stepUpPct,
    });
  const a = req(rates.high);
  const b = req(rates.base);
  const c = req(rates.low);
  const min = Math.min(a, b, c);
  const max = Math.max(a, b, c);
  return { min, base: Math.min(Math.max(b, min), max), max };
}

export function amountForTier(range: PlanRange, tier: Tier, custom: number): number {
  if (tier === 'LEAN') return range.min;
  if (tier === 'RECOMMENDED') return range.base;
  if (tier === 'CUSHION') return range.max;
  return custom;
}

export interface CorridorPoint {
  k: number;
  month: string;
  low: number;
  likely: number;
  high: number;
  band: [number, number];
  actual?: number;
}

/** Projected value at each month for a given monthly amount, in three scenarios. */
export function corridorSeries(spec: PlanSpec, startMonth: string, monthsOverride?: number): CorridorPoint[] {
  const months = Math.max(1, Math.round(monthsOverride ?? spec.months));
  const rates = blendedRates(spec.allocation, spec.band);
  const common = { monthly: spec.monthlyAmount, months, existing: spec.existing, stepUpPct: spec.stepUpPct };
  const low = futureValueSeries({ ...common, annualRate: rates.low });
  const base = futureValueSeries({ ...common, annualRate: rates.base });
  const high = futureValueSeries({ ...common, annualRate: rates.high });
  return base.map((v, k) => ({
    k,
    month: addMonthsKey(startMonth, k),
    low: Math.round(low[k]),
    likely: Math.round(v),
    high: Math.round(high[k]),
    band: [Math.round(low[k]), Math.round(high[k])] as [number, number],
  }));
}

export interface Outcome {
  low: number;
  likely: number;
  high: number;
  status: 'ON_TARGET' | 'AHEAD' | 'BEHIND' | 'REACHED';
  gap: number; // rupees ahead (+) or behind (-) at the likely case
  finishMonths: number; // months to reach goal at the likely case (Infinity if never)
}

export function outcomeAt(spec: PlanSpec): Outcome {
  const rates = blendedRates(spec.allocation, spec.band);
  const common = { monthly: spec.monthlyAmount, months: spec.months, existing: spec.existing, stepUpPct: spec.stepUpPct };
  const at = (r: number) => futureValueSeries({ ...common, annualRate: r }).at(-1) ?? 0;
  const low = Math.round(at(rates.low));
  const likely = Math.round(at(rates.base));
  const high = Math.round(at(rates.high));
  const finishMonths = monthsToGoal({
    monthly: spec.monthlyAmount,
    goal: spec.goalAmount,
    annualRate: rates.base,
    existing: spec.existing,
    stepUpPct: spec.stepUpPct,
  });
  const gap = likely - spec.goalAmount;
  const tolerance = Math.max(1000, spec.goalAmount * 0.01);
  let status: Outcome['status'] = 'ON_TARGET';
  if (spec.existing >= spec.goalAmount) status = 'REACHED';
  else if (gap > tolerance) status = 'AHEAD';
  else if (gap < -tolerance) status = 'BEHIND';
  return { low, likely, high, status, gap, finishMonths };
}

export interface RoadmapRow {
  k: number;
  month: string; // yyyy-MM
  saving: [number, number];
  investing: [number, number];
  total: [number, number];
  recommended: number;
  cumulative: number; // likely-path value at end of month
  isQuarterEnd: boolean;
  isFinal: boolean;
  stepFactor: number;
}

/**
 * Month-by-month roadmap from the month after startMonth to the target month.
 * Ranges: min = needed if markets do well, max = needed if markets disappoint.
 */
export function roadmap(spec: PlanSpec, startMonth: string): RoadmapRow[] {
  const months = Math.max(0, Math.round(finite(spec.months)));
  if (months === 0) return [];
  const range = planRange(spec);
  const rates = blendedRates(spec.allocation, spec.band);
  const cum = futureValueSeries({
    monthly: spec.monthlyAmount,
    months,
    annualRate: rates.base,
    existing: spec.existing,
    stepUpPct: spec.stepUpPct,
  });
  const safeShare = finite(spec.allocation.safe) / 100;
  const step = 1 + finite(spec.stepUpPct) / 100;
  const rows: RoadmapRow[] = [];
  for (let k = 1; k <= months; k++) {
    const f = Math.pow(step, Math.floor((k - 1) / 12));
    const min = range.min * f;
    const max = range.max * f;
    const month = addMonthsKey(startMonth, k);
    const m = parseMonthKey(month).getMonth() + 1;
    rows.push({
      k,
      month,
      saving: [Math.round(min * safeShare), Math.round(max * safeShare)],
      investing: [Math.round(min * (1 - safeShare)), Math.round(max * (1 - safeShare))],
      total: [Math.round(min), Math.round(max)],
      recommended: Math.round(range.base * f),
      cumulative: Math.round(cum[k] ?? 0),
      isQuarterEnd: m % 3 === 0,
      isFinal: k === months,
      stepFactor: f,
    });
  }
  return rows;
}

export type RowStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'NOT_LOGGED' | 'UPCOMING' | 'CURRENT';

export function rowStatus(logged: number | undefined, range: [number, number], isPast: boolean, isCurrent: boolean): RowStatus {
  if (logged === undefined) return isCurrent ? 'CURRENT' : isPast ? 'NOT_LOGGED' : 'UPCOMING';
  if (logged > range[1]) return 'AHEAD';
  if (logged >= range[0]) return 'ON_TRACK';
  return 'BEHIND';
}

export function allocationShift(a: Allocation, longDown: number): Allocation {
  const cut = Math.min(a.long, longDown);
  const half = cut / 2;
  return { safe: a.safe + half, mid: a.mid + (cut - half), long: a.long - cut };
}

export function defaultAllocation(band: Band): Allocation {
  return { ...ALLOCATIONS[band] };
}
