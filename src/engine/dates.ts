import { addMonths, differenceInCalendarMonths, endOfMonth, format, isValid, parse } from 'date-fns';

// Local-time date helpers. Never use toISOString() for keys.

export function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function localStamp(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
}

export function parseDayKey(key: string): Date {
  const d = parse(key, 'yyyy-MM-dd', new Date(2000, 0, 1));
  return isValid(d) ? d : new Date(2000, 0, 1);
}

export function parseMonthKey(key: string): Date {
  const d = parse(key, 'yyyy-MM', new Date(2000, 0, 1));
  return isValid(d) ? d : new Date(2000, 0, 1);
}

export function parseStamp(stamp: string): Date {
  const d = parse(stamp.slice(0, 19), "yyyy-MM-dd'T'HH:mm:ss", new Date(2000, 0, 1));
  if (isValid(d)) return d;
  return parseDayKey(stamp.slice(0, 10));
}

export function addMonthsKey(key: string, n: number): string {
  return monthKey(addMonths(parseMonthKey(key), Math.round(n)));
}

/** Whole months from a to b (b - a). */
export function monthsBetween(a: string, b: string): number {
  return differenceInCalendarMonths(parseMonthKey(b), parseMonthKey(a));
}

export function monthLabel(key: string): string {
  return format(parseMonthKey(key), 'MMM yyyy');
}

export function monthLabelLong(key: string): string {
  return format(parseMonthKey(key), 'MMMM yyyy');
}

/** Plan target date: end of (startMonth + months). */
export function targetMonthKey(startMonth: string, months: number): string {
  return addMonthsKey(startMonth, months);
}

export function targetDate(startMonth: string, months: number): Date {
  return endOfMonth(parseMonthKey(targetMonthKey(startMonth, months)));
}

export interface Countdown {
  passed: boolean;
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export function countdown(asOf: Date, target: Date): Countdown {
  const from = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const to = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  if (to.getTime() <= from.getTime()) return { passed: true, years: 0, months: 0, days: 0, totalDays: 0 };
  let totalMonths = differenceInCalendarMonths(to, from);
  let cursor = addMonths(from, totalMonths);
  if (cursor.getTime() > to.getTime()) {
    totalMonths -= 1;
    cursor = addMonths(from, totalMonths);
  }
  const days = Math.round((to.getTime() - cursor.getTime()) / 86_400_000);
  const totalDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return {
    passed: false,
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: Math.max(0, days),
    totalDays,
  };
}

export function isValidTime(t: string | undefined): t is string {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function quarterOf(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}
