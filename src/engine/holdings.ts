import { endOfMonth } from 'date-fns';
import { CASH_RETURN_PCT } from './assumptions';
import { parseDayKey, parseMonthKey, parseStamp } from './dates';
import { finite } from './finance';
import type { Bucket, Holding, LedgerEntry, Scenario } from './types';

// Holding and ledger values. Daily compounding: value × (1 + r)^(days / 365).

export function grow(amount: number, annualPct: number, from: Date, asOf: Date): number {
  const ms = asOf.getTime() - from.getTime();
  const days = Math.max(0, ms / 86_400_000);
  const r = finite(annualPct) / 100;
  return finite(amount) * Math.pow(1 + r, days / 365);
}

export function contributionDate(e: LedgerEntry): Date {
  const logged = parseStamp(e.loggedAt);
  const monthEnd = endOfMonth(parseMonthKey(e.month));
  return logged.getTime() < monthEnd.getTime() ? logged : monthEnd;
}

function counts(date: Date, asOf: Date): boolean {
  return date.getTime() <= asOf.getTime();
}

export function holdingValue(h: Holding, ledger: LedgerEntry[], asOf: Date): number {
  const start = parseDayKey(h.startDate);
  let v = counts(start, asOf) ? grow(h.initialAmount, h.annualReturnPct, start, asOf) : 0;
  for (const e of ledger) {
    if (e.holdingId !== h.id) continue;
    const d = contributionDate(e);
    if (counts(d, asOf)) v += grow(e.amount, h.annualReturnPct, d, asOf);
  }
  return finite(v);
}

export function cashValue(ledger: LedgerEntry[], asOf: Date, holdingIds?: Set<string>): number {
  let v = 0;
  for (const e of ledger) {
    const isCash = e.holdingId === 'CASH' || (holdingIds && !holdingIds.has(e.holdingId));
    if (!isCash) continue;
    const d = contributionDate(e);
    if (counts(d, asOf)) v += grow(e.amount, CASH_RETURN_PCT, d, asOf);
  }
  return finite(v);
}

export interface SavingsBreakdown {
  total: number;
  byBucket: Record<Bucket, number>;
  byHolding: Record<string, number>;
  cash: number;
  putIn: number;
}

/** Savings so far = Σ holding values + CASH value. Optional scenario applies a simulated fall. */
export function savingsBreakdown(
  holdings: Holding[],
  ledger: LedgerEntry[],
  asOf: Date,
  shock?: Scenario['shocks'] | null,
): SavingsBreakdown {
  const ids = new Set(holdings.map((h) => h.id));
  const byBucket: Record<Bucket, number> = { safe: 0, mid: 0, long: 0 };
  const byHolding: Record<string, number> = {};
  for (const h of holdings) {
    const raw = holdingValue(h, ledger, asOf);
    const v = raw * (1 - (shock ? finite(shock[h.bucket]) : 0));
    byHolding[h.id] = v;
    byBucket[h.bucket] += v;
  }
  const cash = cashValue(ledger, asOf, ids) * (1 - (shock ? finite(shock.safe) : 0));
  byBucket.safe += cash;
  const total = byBucket.safe + byBucket.mid + byBucket.long;
  let putIn = 0;
  for (const h of holdings) if (counts(parseDayKey(h.startDate), asOf)) putIn += finite(h.initialAmount);
  for (const e of ledger) if (counts(contributionDate(e), asOf)) putIn += finite(e.amount);
  return { total: finite(total), byBucket, byHolding, cash, putIn };
}

export function savingsAt(holdings: Holding[], ledger: LedgerEntry[], asOf: Date): number {
  return savingsBreakdown(holdings, ledger, asOf).total;
}

export function loggedByMonth(ledger: LedgerEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of ledger) out[e.month] = (out[e.month] ?? 0) + finite(e.amount);
  return out;
}

/** Consecutive logged months ending at `currentMonth` (or the month before, if current not logged yet). */
export function streak(ledger: LedgerEntry[], months: string[]): number {
  const logged = new Set(ledger.filter((e) => e.amount > 0).map((e) => e.month));
  let s = 0;
  for (let i = months.length - 1; i >= 0; i--) {
    if (logged.has(months[i])) s++;
    else if (i === months.length - 1) continue;
    else break;
  }
  return s;
}
