// Core time-value-of-money maths. Pure, deterministic, never returns NaN.
// Convention: contributions at the END of each month; monthly rate = (1 + r)^(1/12) - 1.

export const MAX_MONTHS = 600;

export function finite(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function monthlyRate(annualPct: number): number {
  const r = finite(annualPct) / 100;
  if (r <= -1) return -1;
  return Math.pow(1 + r, 1 / 12) - 1;
}

export interface FVInput {
  monthly: number;
  months: number;
  annualRate: number; // percent, 11 = 11%
  existing?: number;
  stepUpPct?: number; // percent, raises the monthly amount every 12 months
}

export function futureValue({ monthly, months, annualRate, existing = 0, stepUpPct = 0 }: FVInput): number {
  const i = monthlyRate(annualRate);
  const n = Math.max(0, Math.floor(finite(months)));
  const step = 1 + finite(stepUpPct) / 100;
  let amount = Math.max(0, finite(monthly));
  let value = Math.max(0, finite(existing));
  for (let m = 1; m <= n; m++) {
    value = value * (1 + i) + amount;
    if (m % 12 === 0) amount *= step;
  }
  return finite(value);
}

/** Value after each month, index 0 = start. Length months + 1. */
export function futureValueSeries({ monthly, months, annualRate, existing = 0, stepUpPct = 0 }: FVInput): number[] {
  const i = monthlyRate(annualRate);
  const n = Math.max(0, Math.floor(finite(months)));
  const step = 1 + finite(stepUpPct) / 100;
  let amount = Math.max(0, finite(monthly));
  let value = Math.max(0, finite(existing));
  const out = [value];
  for (let m = 1; m <= n; m++) {
    value = value * (1 + i) + amount;
    out.push(finite(value));
    if (m % 12 === 0) amount *= step;
  }
  return out;
}

export interface RequiredInput {
  goal: number;
  months: number;
  annualRate: number;
  existing?: number;
  stepUpPct?: number;
}

/**
 * First-month amount needed to reach `goal` in `months`. Bisection, 80 iterations.
 * Returns 0 if existing savings already get there, Infinity if months is 0 and the goal is not met.
 */
export function requiredMonthly({ goal, months, annualRate, existing = 0, stepUpPct = 0 }: RequiredInput): number {
  const g = Math.max(0, finite(goal));
  const n = Math.max(0, Math.floor(finite(months)));
  const base = futureValue({ monthly: 0, months: n, annualRate, existing });
  if (base >= g) return 0;
  if (n === 0) return Infinity;
  let lo = 0;
  let hi = Math.max(1, g);
  let guard = 0;
  while (futureValue({ monthly: hi, months: n, annualRate, existing, stepUpPct }) < g && guard < 60) {
    hi *= 2;
    guard++;
  }
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    const fv = futureValue({ monthly: mid, months: n, annualRate, existing, stepUpPct });
    if (fv >= g) hi = mid;
    else lo = mid;
    if (hi - lo < 0.001) break;
  }
  return Math.round(hi);
}

export interface MonthsInput {
  monthly: number;
  goal: number;
  annualRate: number;
  existing?: number;
  stepUpPct?: number;
}

/** Months until the goal is reached, simulating up to 600 months. Infinity if never. */
export function monthsToGoal({ monthly, goal, annualRate, existing = 0, stepUpPct = 0 }: MonthsInput): number {
  const g = Math.max(0, finite(goal));
  let value = Math.max(0, finite(existing));
  if (value >= g) return 0;
  const i = monthlyRate(annualRate);
  const step = 1 + finite(stepUpPct) / 100;
  let amount = Math.max(0, finite(monthly));
  for (let m = 1; m <= MAX_MONTHS; m++) {
    value = value * (1 + i) + amount;
    if (value >= g - 0.5) return m;
    if (m % 12 === 0) amount *= step;
  }
  return Infinity;
}

/** What `amount` received after `months` is worth in today's money. */
export function todaysMoney(amount: number, months: number, inflationPct: number): number {
  const years = Math.max(0, finite(months)) / 12;
  const f = Math.pow(1 + finite(inflationPct) / 100, years);
  return f > 0 ? finite(amount) / f : 0;
}

export function safeRatio(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  if (b <= 0) return a <= 0 ? 0 : Infinity;
  return a / b;
}
