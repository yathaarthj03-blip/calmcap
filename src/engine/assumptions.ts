import type { Allocation, Band, Bucket, GoalId, HoldingCategory } from './types';

// Every planning constant lives here. All returns are illustrative, not forecasts.

export interface Rates {
  low: number;
  base: number;
  high: number;
}

export const RETURNS: Record<Bucket, Rates> = {
  safe: { low: 4.0, base: 5.0, high: 6.0 },
  mid: { low: 4.0, base: 7.0, high: 8.5 },
  long: { low: 5.0, base: 11.0, high: 15.0 },
};

/** The Sooner band is a savings-and-short-FD mix, so its safe bucket uses these instead. */
export const SOONER_SAFE_RETURNS: Rates = { low: 4.0, base: 5.5, high: 6.5 };

/** Typical fall in a bad year, used in copy. */
export const BAD_YEAR_FALL: Record<Bucket, number> = { safe: 0, mid: 0.07, long: 0.38 };

export const INFLATION_PCT = 6;
export const CASH_RETURN_PCT = 3;

export const ALLOCATIONS: Record<Band, Allocation> = {
  SOONER: { safe: 100, mid: 0, long: 0 },
  MID: { safe: 20, mid: 60, long: 20 },
  LONG: { safe: 10, mid: 20, long: 70 },
};

export const BAND_LIMITS: Record<Band, { min: number; max: number; rep: number }> = {
  SOONER: { min: 3, max: 12, rep: 12 },
  MID: { min: 13, max: 60, rep: 60 },
  LONG: { min: 61, max: 240, rep: 120 },
};

export const BAND_ORDER: Band[] = ['SOONER', 'MID', 'LONG'];

export const BAND_LABEL: Record<Band, string> = {
  SOONER: 'Sooner',
  MID: 'Mid range',
  LONG: 'Long term',
};

export const BAND_SPAN: Record<Band, string> = {
  SOONER: 'Up to 1 year',
  MID: '1 to 5 years',
  LONG: 'Over 5 years',
};

export const COMFORT_RATIO = 0.7;
export const LIMIT_RATIO = 1.0;
export const DEFAULT_CAPACITY_RATIO = 0.35;
export const SIDE_INCOME_WEIGHT = 0.5;
export const DEFAULT_USD_INR = 88;

export const FALLBACK_AFFORDABLE_RATIO = 0.9;
export const HARM_CAPACITY_RATIO = 0.85;
export const HARM_DELAY_MONTHS = 3;
export const HARM_SHORT_TENURE = 24;
export const HARM_SHORT_LONG_SHARE = 10;

export const PANIC_MIN = 2000;
export const PANIC_MAX = 60000;
export const PANIC_STEP = 1000;
export const PANIC_DEFAULT = 15000;
export const POCKET_MONEY = 8000;

export const INCOME_MAX = 10_000_000;

export const GOAL_LABEL: Record<GoalId, string> = {
  TEN_LAKH: '₹10 lakh',
  ONE_CRORE: '₹1 crore',
  USD_1M: '$1 million',
};

export function goalAmountFor(id: GoalId, usdInr: number): number {
  if (id === 'TEN_LAKH') return 1_000_000;
  if (id === 'ONE_CRORE') return 10_000_000;
  const rate = Number.isFinite(usdInr) && usdInr > 0 ? usdInr : DEFAULT_USD_INR;
  return Math.round(1_000_000 * rate);
}

export const CATEGORY_INFO: Record<HoldingCategory, { label: string; bucket: Bucket; basePct: number }> = {
  SAVINGS_ACCOUNT: { label: 'Savings account', bucket: 'safe', basePct: 3.0 },
  LIQUID_FUND: { label: 'Liquid fund', bucket: 'safe', basePct: 5.0 },
  FIXED_DEPOSIT: { label: 'Fixed deposit', bucket: 'mid', basePct: 7.0 },
  DEBT_FUND: { label: 'Debt fund', bucket: 'mid', basePct: 7.0 },
  GOLD_ETF: { label: 'Gold ETF', bucket: 'mid', basePct: 7.0 },
  INDEX_FUND: { label: 'Index fund', bucket: 'long', basePct: 11.0 },
  OTHER: { label: 'Other', bucket: 'safe', basePct: 5.0 },
};

export const BUCKET_LABEL: Record<Bucket, string> = {
  safe: 'Safe',
  mid: 'Mid-term',
  long: 'Long-term',
};

export const BUCKET_ORDER: Bucket[] = ['safe', 'mid', 'long'];
