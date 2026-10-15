// Money formatting. Never prints NaN, Infinity, undefined or -0.

const full = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

function clean(n: number): number {
  const r = Math.round(n);
  return Object.is(r, -0) ? 0 : r;
}

/** ₹1,20,000 */
export function inr(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const v = clean(n);
  return (v < 0 ? '−₹' : '₹') + full.format(Math.abs(v));
}

/** Plain number with Indian grouping: 1,20,000 */
export function num(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return full.format(clean(n));
}

function trim(v: number): string {
  const s = one.format(v);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** ₹10 L, ₹1 Cr, ₹8.8 Cr, ₹45K, ₹900 */
export function inrCompact(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const v = clean(n);
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 10_000_000) return `${sign}₹${trim(a / 10_000_000)} Cr`;
  if (a >= 100_000) return `${sign}₹${trim(a / 100_000)} L`;
  if (a >= 1_000) return `${sign}₹${trim(a / 1_000)}K`;
  return `${sign}₹${a}`;
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const v = Number(n.toFixed(digits));
  return `${Object.is(v, -0) ? 0 : v}%`;
}

/** Accepts "₹ 1,20,000", "120000", " 5 000 ". Returns null when it is not a whole non-negative number. */
export function parseMoney(input: string): number | null {
  const s = String(input ?? '').replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  if (s === '') return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) ? n : null;
}

export function yearsText(months: number): string {
  if (!Number.isFinite(months)) return 'a very long time';
  const m = Math.max(0, Math.round(months));
  if (m < 12) return `${m} month${m === 1 ? '' : 's'}`;
  const y = m / 12;
  const yr = Number.isInteger(y) ? String(y) : trim(y);
  return `${yr} year${y === 1 ? '' : 's'}`;
}
