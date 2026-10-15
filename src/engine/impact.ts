import { BUCKET_LABEL, INFLATION_PCT } from './assumptions';
import { finite, futureValue, todaysMoney } from './finance';
import { inr, pct } from './format';
import { blendedRates, bucketRates } from './plan';
import type { Bucket, PlanSpec } from './types';

// "What this means for you": every number is computed from the user's live plan.

export type ImpactRule =
  | { kind: 'returnDelta'; delta: number; what: string } // forward returns move by `delta` points on affected buckets
  | { kind: 'drawdown'; fall: number } // affected buckets fall by `fall` (0.15 = 15%) for a while
  | { kind: 'inflation'; delta: number } // inflation moves by `delta` points
  | { kind: 'sipHabit' } // explains how regular buying behaves
  | { kind: 'costDrag'; deltaPct: number }; // yearly cost difference on affected buckets

export interface ImpactContext {
  spec: PlanSpec;
  savingsByBucket: Record<Bucket, number>;
  panicBudget?: number;
  remainingMonths: number;
}

function joinBuckets(bs: Bucket[]): string {
  const names = bs.map((b) => BUCKET_LABEL[b].toLowerCase());
  if (names.length <= 1) return names[0] ?? 'your';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function impactText(rule: ImpactRule, affects: Bucket[], ctx: ImpactContext): string {
  const { spec } = ctx;
  const months = Math.max(1, Math.round(finite(ctx.remainingMonths, spec.months)));
  const share = affects.reduce((s, b) => s + finite(spec.allocation[b]), 0) / 100;
  const part = Math.round(spec.monthlyAmount * share);
  const names = joinBuckets(affects);
  if (affects.length && share <= 0 && rule.kind !== 'inflation') {
    return `Your plan has nothing in ${names} money right now, so this mostly passes you by.`;
  }

  switch (rule.kind) {
    case 'returnDelta': {
      const rate = affects.length
        ? affects.reduce((s, b) => s + finite(spec.allocation[b]) * bucketRates(b, spec.band).base, 0) /
          Math.max(1, affects.reduce((s, b) => s + finite(spec.allocation[b]), 0))
        : blendedRates(spec.allocation, spec.band).base;
      const a = futureValue({ monthly: part, months, annualRate: rate, stepUpPct: spec.stepUpPct });
      const b = futureValue({ monthly: part, months, annualRate: rate + rule.delta, stepUpPct: spec.stepUpPct });
      const diff = Math.abs(Math.round(a - b));
      const dir = rule.delta < 0 ? 'less' : 'more';
      return `Your ${names} money is ${inr(part)} of your ${inr(spec.monthlyAmount)} monthly plan. If ${rule.what} by about ${pct(Math.abs(rule.delta), 1).replace('%', '')} point${Math.abs(rule.delta) === 1 ? '' : 's'}, that part grows about ${inr(diff)} ${dir} over the ${months} months left.`;
    }
    case 'drawdown': {
      const now = affects.reduce((s, b) => s + finite(ctx.savingsByBucket[b]), 0);
      const drop = Math.round(now * rule.fall);
      const budget = ctx.panicBudget;
      const verdict =
        typeof budget === 'number'
          ? drop <= budget
            ? ` That is inside your ${inr(budget)} panic budget.`
            : ` That is past your ${inr(budget)} panic budget, so read your promise again before you act.`
          : '';
      if (now <= 0) {
        return `You have not put money into ${names} yet, so a ${pct(rule.fall * 100)} fall would only change the price of what your next ${inr(part)} buys.`;
      }
      return `You hold about ${inr(now)} in ${names} money. A ${pct(rule.fall * 100)} fall would show it about ${inr(drop)} lower for a while, and your next ${inr(part)} would buy more units.${verdict}`;
    }
    case 'inflation': {
      const base = todaysMoney(spec.goalAmount, months, INFLATION_PCT);
      const alt = todaysMoney(spec.goalAmount, months, INFLATION_PCT + rule.delta);
      return `Your ${inr(spec.goalAmount)} goal is worth about ${inr(base)} in today's money at ${INFLATION_PCT}% inflation. At ${pct(INFLATION_PCT + rule.delta, 1)} it would be about ${inr(alt)}, a gap of ${inr(Math.abs(base - alt))}.`;
    }
    case 'sipHabit': {
      return `You put ${inr(part)} a month into ${names} money. When prices dip, that same amount buys more units, which is why skipping a month during a fall usually costs more than it saves.`;
    }
    case 'costDrag': {
      const rate = blendedRates(spec.allocation, spec.band).base;
      const a = futureValue({ monthly: part, months, annualRate: rate, stepUpPct: spec.stepUpPct });
      const b = futureValue({ monthly: part, months, annualRate: rate - rule.deltaPct, stepUpPct: spec.stepUpPct });
      return `On ${inr(part)} a month over ${months} months, an extra ${pct(rule.deltaPct, 1)} a year in costs would leave you about ${inr(Math.round(a - b))} poorer.`;
    }
  }
}
