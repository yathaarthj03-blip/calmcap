import { BAND_LIMITS } from './assumptions';
import { addMonthsKey, monthsBetween, targetMonthKey } from './dates';
import { finite, futureValue, monthsToGoal, requiredMonthly } from './finance';
import { blendedRates } from './plan';
import type { Bucket, PlanSpec, PlanVersion, Scenario } from './types';

export interface Projection {
  finishMonth: string | null; // null if not reachable within 50 years
  monthsLeft: number; // Infinity if not reachable
  targetMonth: string;
  diffMonths: number; // finish - target; negative = ahead
  status: 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'REACHED' | 'UNREACHABLE';
}

/** Projected finish from actual savings today, continuing the plan's monthly amount at base return. */
export function projectFinish(
  spec: PlanSpec,
  startMonth: string,
  savingsNow: number,
  currentMonth: string,
  delta: Partial<Record<Bucket, number>> = {},
): Projection {
  const targetMonth = targetMonthKey(startMonth, spec.months);
  if (savingsNow >= spec.goalAmount) {
    return { finishMonth: currentMonth, monthsLeft: 0, targetMonth, diffMonths: monthsBetween(targetMonth, currentMonth), status: 'REACHED' };
  }
  const rate = blendedRates(spec.allocation, spec.band, delta).base;
  const elapsed = Math.max(0, monthsBetween(startMonth, currentMonth));
  const stepYears = Math.floor(elapsed / 12);
  const monthly = spec.monthlyAmount * Math.pow(1 + finite(spec.stepUpPct) / 100, stepYears);
  const n = monthsToGoal({ monthly, goal: spec.goalAmount, annualRate: rate, existing: savingsNow, stepUpPct: spec.stepUpPct });
  if (!Number.isFinite(n)) {
    return { finishMonth: null, monthsLeft: Infinity, targetMonth, diffMonths: Infinity, status: 'UNREACHABLE' };
  }
  const finishMonth = addMonthsKey(currentMonth, n);
  const diff = monthsBetween(targetMonth, finishMonth);
  const status = diff < -1 ? 'AHEAD' : diff > 1 ? 'BEHIND' : 'ON_TRACK';
  return { finishMonth, monthsLeft: n, targetMonth, diffMonths: diff, status };
}

export interface FallbackOption {
  key: 'A' | 'B';
  title: string;
  monthlyAmount: number;
  months: number; // from currentMonth
  finishMonth: string;
  reachable: boolean;
  capacityShare: number;
}

export interface DoNothing {
  finishMonth: string | null;
  delayMonths: number; // Infinity if unreachable
  shortfallAtTarget: number;
  valueAtTarget: number;
}

export interface FallbackInput {
  spec: PlanSpec;
  startMonth: string;
  currentMonth: string;
  savingsByBucket: Record<Bucket, number>;
  capacity: number;
  scenario: Scenario;
}

export interface FallbackCore {
  before: Record<Bucket, number>;
  after: Record<Bucket, number>;
  beforeTotal: number;
  afterTotal: number;
  remaining: number;
  targetMonth: string;
  rates: { low: number; base: number; high: number };
  doNothing: DoNothing;
  optionA: FallbackOption;
  optionB: FallbackOption;
  recommended: 'A' | 'B';
}

/** Impact of a scenario and the two ways to respond (hold the date, hold the amount). */
export function fallbackCore({ spec, startMonth, currentMonth, savingsByBucket, capacity, scenario }: FallbackInput): FallbackCore {
  const before = { ...savingsByBucket };
  const after: Record<Bucket, number> = {
    safe: before.safe * (1 - scenario.shocks.safe),
    mid: before.mid * (1 - scenario.shocks.mid),
    long: before.long * (1 - scenario.shocks.long),
  };
  const beforeTotal = before.safe + before.mid + before.long;
  const afterTotal = after.safe + after.mid + after.long;
  const targetMonth = targetMonthKey(startMonth, spec.months);
  const remaining = Math.max(1, monthsBetween(currentMonth, targetMonth));
  const rates = blendedRates(spec.allocation, spec.band, scenario.forwardReturnDelta);
  const elapsed = Math.max(0, monthsBetween(startMonth, currentMonth));
  const monthlyNow = spec.monthlyAmount * Math.pow(1 + finite(spec.stepUpPct) / 100, Math.floor(elapsed / 12));

  const nothingMonths = monthsToGoal({ monthly: monthlyNow, goal: spec.goalAmount, annualRate: rates.base, existing: afterTotal, stepUpPct: spec.stepUpPct });
  const valueAtTarget = futureValue({ monthly: monthlyNow, months: remaining, annualRate: rates.base, existing: afterTotal, stepUpPct: spec.stepUpPct });
  const doNothing: DoNothing = {
    finishMonth: Number.isFinite(nothingMonths) ? addMonthsKey(currentMonth, nothingMonths) : null,
    delayMonths: Number.isFinite(nothingMonths) ? Math.max(0, nothingMonths - remaining) : Infinity,
    shortfallAtTarget: Math.max(0, Math.round(spec.goalAmount - valueAtTarget)),
    valueAtTarget: Math.round(valueAtTarget),
  };

  // Option A: hold the date.
  const reqA = requiredFrom(spec.goalAmount, remaining, rates.base, afterTotal, spec.stepUpPct);
  const optionA: FallbackOption = {
    key: 'A',
    title: 'Hold the date',
    monthlyAmount: reqA,
    months: remaining,
    finishMonth: targetMonth,
    reachable: Number.isFinite(reqA),
    capacityShare: capacity > 0 ? reqA / capacity : Infinity,
  };

  // Option B: hold the amount, extend up to the band's maximum.
  const cap = BAND_LIMITS[spec.band].max;
  const bMonths = Number.isFinite(nothingMonths) ? Math.min(nothingMonths, cap) : cap;
  const optionB: FallbackOption = {
    key: 'B',
    title: 'Hold the amount',
    monthlyAmount: Math.round(monthlyNow),
    months: Math.max(1, bMonths),
    finishMonth: addMonthsKey(currentMonth, Math.max(1, bMonths)),
    reachable: Number.isFinite(nothingMonths) && nothingMonths <= cap,
    capacityShare: capacity > 0 ? monthlyNow / capacity : Infinity,
  };

  const recommended = optionA.reachable && optionA.capacityShare <= 0.9 ? 'A' : 'B';
  return { before, after, beforeTotal, afterTotal, remaining, targetMonth, rates, doNothing, optionA, optionB, recommended };
}

function requiredFrom(goal: number, months: number, rate: number, existing: number, step: number): number {
  return requiredMonthly({ goal, months, annualRate: rate, existing, stepUpPct: step });
}

/** Build the PlanVersion proposal (rebased: starts this month from the post-fall savings). */
export function proposalVersion(
  current: PlanVersion,
  core: FallbackCore,
  pick: 'A' | 'B',
  currentMonth: string,
  allocation = current.plan.allocation,
  monthlyOverride?: number,
): Omit<PlanVersion, 'version' | 'createdAt'> {
  const opt = pick === 'A' ? core.optionA : core.optionB;
  return {
    reason: 'FALLBACK',
    goal: {
      ...current.goal,
      startMonth: currentMonth,
      months: opt.months,
      existing: Math.round(core.afterTotal),
    },
    plan: {
      ...current.plan,
      allocation,
      monthlyAmount: Math.round(monthlyOverride ?? opt.monthlyAmount),
      tier: 'CUSTOM',
    },
  };
}
