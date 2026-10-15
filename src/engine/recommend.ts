import {
  ALLOCATIONS,
  BAND_LIMITS,
  BAND_ORDER,
  COMFORT_RATIO,
  DEFAULT_CAPACITY_RATIO,
  INFLATION_PCT,
  LIMIT_RATIO,
  SIDE_INCOME_WEIGHT,
} from './assumptions';
import { monthLabel, targetMonthKey } from './dates';
import { finite, requiredMonthly, safeRatio, todaysMoney } from './finance';
import { inr, pct, yearsText } from './format';
import { blendedRates } from './plan';
import type { Band } from './types';

export function reliableIncome(primary: number, side: number): number {
  return Math.max(0, finite(primary)) + SIDE_INCOME_WEIGHT * Math.max(0, finite(side));
}

export function capacityFor(
  primary: number,
  side: number,
  expenses: number | undefined,
  ratio: number = DEFAULT_CAPACITY_RATIO,
): number {
  const reliable = reliableIncome(primary, side);
  if (typeof expenses === 'number' && Number.isFinite(expenses)) return Math.max(0, Math.round(reliable - expenses));
  const r = Number.isFinite(ratio) && ratio > 0 && ratio <= 1 ? ratio : DEFAULT_CAPACITY_RATIO;
  return Math.max(0, Math.round(r * reliable));
}

export interface BandEvaluation {
  band: Band;
  months: number;
  required: number;
  ratio: number;
  rates: { low: number; base: number; high: number };
}

export type RecommendationLabel = 'RECOMMENDED' | 'TIGHT' | 'STRETCH';

export interface Recommendation {
  band: Band;
  label: RecommendationLabel;
  stretch: boolean;
  evaluations: Record<Band, BandEvaluation>;
}

export function evaluateBand(band: Band, capacity: number, goalAmount: number, existing = 0, months?: number): BandEvaluation {
  const m = months ?? BAND_LIMITS[band].rep;
  const rates = blendedRates(ALLOCATIONS[band], band);
  const required = requiredMonthly({ goal: goalAmount, months: m, annualRate: rates.base, existing });
  return { band, months: m, required, ratio: safeRatio(required, capacity), rates };
}

export function recommendBand(capacity: number, goalAmount: number, existing = 0): Recommendation {
  const evaluations = {} as Record<Band, BandEvaluation>;
  for (const b of BAND_ORDER) evaluations[b] = evaluateBand(b, capacity, goalAmount, existing);
  const comfy = BAND_ORDER.find((b) => evaluations[b].ratio <= COMFORT_RATIO);
  if (comfy) return { band: comfy, label: 'RECOMMENDED', stretch: false, evaluations };
  const tight = BAND_ORDER.find((b) => evaluations[b].ratio <= LIMIT_RATIO);
  if (tight) return { band: tight, label: 'TIGHT', stretch: false, evaluations };
  return { band: 'LONG', label: 'STRETCH', stretch: true, evaluations };
}

export function ratioText(ratio: number): string {
  if (!Number.isFinite(ratio)) return 'more than you can set aside today';
  return `${pct(ratio * 100)} of what you can set aside`;
}

export function reasonFor(ev: BandEvaluation): string {
  if (ev.required === 0) return 'Your savings already cover this goal.';
  return `Needs ${inr(ev.required)} a month, about ${ratioText(ev.ratio)}.`;
}

export interface ConsResult {
  cons: string[];
  pro: string | null;
}

export interface ConsContext {
  capacity: number;
  goalAmount: number;
  startMonth: string;
  evaluations: Record<Band, BandEvaluation>;
}

/** Up to 3 cons and 1 pro for choosing `band` over `recommended`, every line with real numbers. */
export function consFor(band: Band, recommended: Band, ctx: ConsContext): ConsResult {
  if (band === recommended) return { cons: [], pro: null };
  const ev = ctx.evaluations[band];
  const rec = ctx.evaluations[recommended];
  const shorter = BAND_ORDER.indexOf(band) < BAND_ORDER.indexOf(recommended);
  if (shorter) {
    const room = ctx.capacity - ev.required;
    const ownShare = ctx.goalAmount > 0 ? Math.min(100, (ev.required * ev.months * 100) / ctx.goalAmount) : 0;
    const cons = [
      `Needs ${inr(ev.required)} a month, ${ratioText(ev.ratio)}.`,
      `Money with only ${yearsText(ev.months)} to grow has to sit in steadier places (about ${pct(ev.rates.low, 1)} to ${pct(ev.rates.high, 1)} a year), so about ${pct(ownShare)} of the goal comes from your own pocket.`,
      room > 0
        ? `Leaves only ${inr(room)} a month for an emergency cushion; one missed month breaks the plan.`
        : `Leaves no room for an emergency cushion; one missed month breaks the plan.`,
    ];
    return { cons, pro: `You finish ${yearsText(rec.months - ev.months)} sooner.` };
  }
  const finish = monthLabel(targetMonthKey(ctx.startMonth, ev.months));
  const later = yearsText(ev.months - rec.months);
  const real = todaysMoney(ctx.goalAmount, ev.months, INFLATION_PCT);
  const cons = [
    `Finishes ${finish}, ${later} later than the recommended plan.`,
    `Inflation at ${INFLATION_PCT}% means the goal buys only about ${inr(real)} in today's money by then.`,
    `Your money rides market ups and downs for ${yearsText(ev.months)} instead of ${yearsText(rec.months)}; more falls to sit through, more chances to panic and quit.`,
  ];
  return { cons, pro: `Lighter load: ${inr(ev.required)} a month, ${ratioText(ev.ratio)}.` };
}
