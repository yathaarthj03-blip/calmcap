import {
  HARM_CAPACITY_RATIO,
  HARM_DELAY_MONTHS,
  HARM_SHORT_LONG_SHARE,
  HARM_SHORT_TENURE,
} from './assumptions';
import { monthLabel } from './dates';
import { projectFinish } from './fallback';
import { inr, pct, yearsText } from './format';
import { planRange, specFromVersion } from './plan';
import type { PlanVersion } from './types';

export interface ChangeContext {
  savingsNow: number;
  currentMonth: string;
  capacityPrev: number;
  capacityNext: number;
}

export interface Assessment {
  harmful: boolean;
  reasons: string[];
}

/** Warn only when a change does real harm. Harmless edits return harmful: false. */
export function assessChange(prev: PlanVersion, next: Omit<PlanVersion, 'version' | 'createdAt'>, ctx: ChangeContext): Assessment {
  const reasons: string[] = [];
  const p = specFromVersion(prev as PlanVersion);
  const n = specFromVersion(next as PlanVersion);

  // (a) projected finish moves later by 3+ months
  const pf = projectFinish(p, prev.goal.startMonth, ctx.savingsNow, ctx.currentMonth);
  const nf = projectFinish(n, next.goal.startMonth, ctx.savingsNow, ctx.currentMonth);
  if (Number.isFinite(pf.monthsLeft) && !Number.isFinite(nf.monthsLeft)) {
    reasons.push(`At ${inr(n.monthlyAmount)} a month the goal is out of reach within 50 years.`);
  } else if (Number.isFinite(pf.monthsLeft) && Number.isFinite(nf.monthsLeft)) {
    const delay = nf.monthsLeft - pf.monthsLeft;
    if (delay >= HARM_DELAY_MONTHS && nf.finishMonth && pf.finishMonth) {
      reasons.push(`Your projected finish moves from ${monthLabel(pf.finishMonth)} to ${monthLabel(nf.finishMonth)}, ${yearsText(delay)} later.`);
    }
  }

  // (b) monthly amount crosses 85% of capacity
  const prevShare = ctx.capacityPrev > 0 ? p.monthlyAmount / ctx.capacityPrev : p.monthlyAmount > 0 ? Infinity : 0;
  const nextShare = ctx.capacityNext > 0 ? n.monthlyAmount / ctx.capacityNext : n.monthlyAmount > 0 ? Infinity : 0;
  if (nextShare > HARM_CAPACITY_RATIO && prevShare <= HARM_CAPACITY_RATIO) {
    reasons.push(
      Number.isFinite(nextShare)
        ? `${inr(n.monthlyAmount)} a month is ${pct(nextShare * 100)} of what you can set aside (${inr(ctx.capacityNext)}). Above ${pct(HARM_CAPACITY_RATIO * 100)} one surprise expense breaks the plan.`
        : `You have no room to set money aside at this income, so ${inr(n.monthlyAmount)} a month is not affordable.`,
    );
  }

  // (c) short tenure with growth assets
  if (n.months <= HARM_SHORT_TENURE && n.allocation.long > HARM_SHORT_LONG_SHARE) {
    reasons.push(
      `${pct(n.allocation.long)} sits in index funds with only ${yearsText(n.months)} to go. A fall like 2008 can take longer than that to recover.`,
    );
  }

  // (d) below the Lean minimum
  const range = planRange(n);
  if (n.monthlyAmount < range.min) {
    reasons.push(
      `${inr(n.monthlyAmount)} is below the ${inr(range.min)} needed even if markets do well, so the goal will not be reached by the target date.`,
    );
  }

  return { harmful: reasons.length > 0, reasons };
}
