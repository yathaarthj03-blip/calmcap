import { addMonths, startOfMonth } from 'date-fns';
import { monthKey, parseDayKey } from './dates';
import { finite } from './finance';
import { inr, pct } from './format';
import type { Income, IncomeChange } from './types';

export interface ExpenseSplit {
  income: number;
  save: number;
  needs: number;
  wants: number;
  over: boolean;
}

/** Save-and-invest = the plan amount; the rest splits 65% needs, 35% wants. */
export function expenseSplit(totalIncome: number, planMonthly: number): ExpenseSplit {
  const income = Math.max(0, Math.round(finite(totalIncome)));
  const want = Math.max(0, Math.round(finite(planMonthly)));
  const save = Math.min(income, want);
  const rest = income - save;
  const needs = Math.round(rest * 0.65);
  return { income, save, needs, wants: rest - needs, over: want > income };
}

export interface QuarterForecast {
  label: string;
  low: number;
  high: number;
  base: number;
  explanation: string;
}

/** Expected income for the next calendar quarter, as a range with its working shown. */
export function expectedNextQuarter(income: Income, history: IncomeChange[], asOf: Date): QuarterForecast {
  const total = Math.max(0, finite(income.primary)) + Math.max(0, finite(income.side));
  const qStartMonth = Math.floor(asOf.getMonth() / 3) * 3 + 3;
  const qStart = startOfMonth(new Date(asOf.getFullYear(), qStartMonth, 1));
  const months = [0, 1, 2].map((i) => addMonths(qStart, i));
  const label = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`;
  const base = total * 3;
  const notes: string[] = [`Flat: 3 × ${inr(total)} = ${inr(base)}.`];
  let high = base;

  if (finite(income.expectedRaisePct) > 0 && income.expectedRaiseDate) {
    const raiseDate = parseDayKey(income.expectedRaiseDate);
    const raiseKey = monthKey(raiseDate);
    const raised = months.filter((m) => monthKey(m) >= raiseKey).length;
    if (raised > 0 && raiseKey <= monthKey(months[2])) {
      const extra = finite(income.primary) * (finite(income.expectedRaisePct) / 100) * raised;
      high = Math.max(high, base + extra);
      notes.push(`Your expected ${pct(income.expectedRaisePct, 1)} raise adds ${inr(extra)} over ${raised} month${raised === 1 ? '' : 's'}.`);
    }
  }

  const sorted = [...history].sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1));
  if (sorted.length >= 2) {
    const growth: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1].primary + sorted[i - 1].side;
      const b = sorted[i].primary + sorted[i].side;
      if (a > 0) growth.push(b / a - 1);
    }
    const avg = growth.length ? growth.reduce((s, g) => s + g, 0) / growth.length : 0;
    if (avg > 0) {
      const withGrowth = total * 3 * (1 + avg);
      high = Math.max(high, withGrowth);
      notes.push(`Your recorded changes average ${pct(avg * 100, 1)} growth, which gives up to ${inr(withGrowth)}.`);
    }
  }

  return { label, low: Math.round(Math.min(base, high)), high: Math.round(high), base: Math.round(base), explanation: notes.join(' ') };
}
