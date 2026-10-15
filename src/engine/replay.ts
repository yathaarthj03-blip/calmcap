import { RETURNS } from './assumptions';
import { finite } from './finance';
import { allocationShift, blendedRates, planRange } from './plan';
import { mulberry32 } from './seed';
import type { Allocation, PlanSpec, Scenario } from './types';

// Scripted market replays. Fixed keyframes + seeded noise so every demo run is identical.

export const SCENARIOS: Scenario[] = [
  {
    id: 'correction',
    name: 'Correction',
    short: 'Long-term −15%',
    shocks: { safe: 0, mid: 0, long: 0.15 },
    forwardReturnDelta: {},
    story: [
      'Share prices slide about 15% over a few months. Corrections like this happen every few years and usually pass.',
      'Index funds feel it. Your FDs and savings do not move.',
    ],
  },
  {
    id: 'bear',
    name: 'Bear market',
    short: 'Long-term −28%',
    shocks: { safe: 0, mid: 0, long: 0.28 },
    forwardReturnDelta: {},
    story: [
      'Markets fall about 28% from their high and stay low for over a year. Headlines get loud and friends talk about selling.',
      'Your index fund money drops the most. Safe money holds still.',
    ],
  },
  {
    id: 'crash2008',
    name: 'Crash like 2008',
    short: 'Long-term −38%, mid −7%',
    shocks: { safe: 0, mid: 0.07, long: 0.38 },
    forwardReturnDelta: {},
    story: [
      'A crisis hits and share prices fall about 38% from their high over a year and a half. Even some bonds and gold wobble, down about 7%.',
      'It takes a few years to climb back. People who kept their SIP running bought cheap units on the way down.',
    ],
  },
  {
    id: 'rateCut',
    name: 'Rate cut cycle',
    short: 'Safe and mid returns −1.5 points',
    shocks: { safe: 0, mid: 0, long: 0 },
    forwardReturnDelta: { safe: -1.5, mid: -1.5 },
    story: [
      'Interest rates come down over a year. Nothing crashes, but new FDs, liquid funds and debt funds pay about 1.5 points less.',
      'Your existing money is fine. What it earns from here on is lower, so the safe part of the plan grows more slowly.',
    ],
  },
];

export function scenarioById(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[2];
}

export const REPLAY_MONTHS = 120;

const LONG_KEYS: [number, number][] = [
  [0, 100], [12, 112], [24, 126], [30, 134], [34, 118], [38, 98], [42, 86], [44, 82],
  [48, 86], [56, 98], [68, 118], [80, 138], [100, 170], [120, 215],
];
const MID_KEYS: [number, number][] = [
  [0, 100], [30, 117], [38, 112], [46, 111], [58, 125], [120, 200],
];
const LONG_WINDOW: [number, number] = [30, 80];
const MID_WINDOW: [number, number] = [30, 58];
const BASE_LONG_DEPTH = 1 - 82 / 134;
const BASE_MID_DEPTH = 0.07;

function logInterp(keys: [number, number][], k: number): number {
  for (let i = 1; i < keys.length; i++) {
    const [k1, v1] = keys[i];
    const [k0, v0] = keys[i - 1];
    if (k <= k1) {
      const t = (k - k0) / (k1 - k0);
      return Math.exp(Math.log(v0) + t * (Math.log(v1) - Math.log(v0)));
    }
  }
  return keys[keys.length - 1][1];
}

function windowBaseline(keys: [number, number][], win: [number, number], k: number): number {
  const a = logInterp(keys, win[0]);
  const b = logInterp(keys, win[1]);
  const t = (k - win[0]) / (win[1] - win[0]);
  return Math.exp(Math.log(a) + t * (Math.log(b) - Math.log(a)));
}

/** Scale the dip inside the window so the fall depth matches `depth` (0 removes the dip). */
function scaledLevel(keys: [number, number][], win: [number, number], k: number, depth: number, baseDepth: number): number {
  const raw = logInterp(keys, k);
  if (k <= win[0] || k >= win[1]) return raw;
  const baseline = windowBaseline(keys, win, k);
  if (depth <= 0) return baseline;
  const e = Math.log(1 - Math.min(depth, 0.95)) / Math.log(1 - baseDepth);
  return baseline * Math.pow(raw / baseline, e);
}

let noiseCache: { long: number[]; mid: number[] } | null = null;
function noise(): { long: number[]; mid: number[] } {
  if (noiseCache) return noiseCache;
  const rnd = mulberry32(2026);
  const long: number[] = [];
  const mid: number[] = [];
  for (let k = 0; k <= REPLAY_MONTHS; k++) long.push(k === 0 ? 1 : 1 + (rnd() * 2 - 1) * 0.0175);
  for (let k = 0; k <= REPLAY_MONTHS; k++) mid.push(k === 0 ? 1 : 1 + (rnd() * 2 - 1) * 0.004);
  noiseCache = { long, mid };
  return noiseCache;
}

export interface MarketLevels {
  safe: number[];
  mid: number[];
  long: number[];
}

export function marketLevels(scenario: Scenario): MarketLevels {
  const n = noise();
  const longDepth = scenario.shocks.long;
  const midDepth = scenario.shocks.mid;
  const safeRate = RETURNS.safe.base + finite(scenario.forwardReturnDelta.safe);
  const midDelta = finite(scenario.forwardReturnDelta.mid);
  const midAdj = (1 + (RETURNS.mid.base + midDelta) / 100) / (1 + RETURNS.mid.base / 100);
  const safe: number[] = [];
  const mid: number[] = [];
  const long: number[] = [];
  for (let k = 0; k <= REPLAY_MONTHS; k++) {
    safe.push(100 * Math.pow(1 + safeRate / 100, k / 12));
    const m = scaledLevel(MID_KEYS, MID_WINDOW, k, midDepth, BASE_MID_DEPTH) * Math.pow(midAdj, k / 12);
    mid.push(m * n.mid[k]);
    long.push(scaledLevel(LONG_KEYS, LONG_WINDOW, k, longDepth, BASE_LONG_DEPTH) * n.long[k]);
  }
  return { safe, mid, long };
}

export interface ReplayPoint {
  k: number;
  worth: number;
  putIn: number;
  sold: number;
  under: number | null; // worth when below what was put in, for red highlighting
}

export interface Replay {
  points: ReplayPoint[];
  troughMonth: number;
  hasFall: boolean;
  worthAtTrough: number;
  putInAtTrough: number;
  fallAtTrough: number;
  marketDropPct: number;
  finalKept: number;
  finalSold: number;
  finalPutIn: number;
}

export function replay(scenario: Scenario, allocation: Allocation, monthly: number, existing = 0): Replay {
  const lv = marketLevels(scenario);
  const amt = Math.max(0, finite(monthly));
  const start = Math.max(0, finite(existing));
  const share = { safe: finite(allocation.safe) / 100, mid: finite(allocation.mid) / 100, long: finite(allocation.long) / 100 };
  const units = { safe: 0, mid: 0, long: 0 };
  const buy = (rupees: number, k: number) => {
    units.safe += (rupees * share.safe) / lv.safe[k];
    units.mid += (rupees * share.mid) / lv.mid[k];
    units.long += (rupees * share.long) / lv.long[k];
  };
  buy(start, 0);
  const worthAt = (k: number) => units.safe * lv.safe[k] + units.mid * lv.mid[k] + units.long * lv.long[k];

  // Trough = lowest long-term level after the pre-crash peak.
  const hasFall = scenario.shocks.long > 0 || scenario.shocks.mid > 0;
  let troughMonth = 0;
  let peak = 0;
  if (hasFall) {
    const series = scenario.shocks.long > 0 ? lv.long : lv.mid;
    let low = Infinity;
    for (let k = LONG_WINDOW[0] - 6; k <= LONG_WINDOW[1]; k++) {
      if (series[k] < low) {
        low = series[k];
        troughMonth = k;
      }
    }
    for (let k = 0; k <= troughMonth; k++) peak = Math.max(peak, series[k]);
    peak = peak > 0 ? 1 - low / peak : 0;
  }

  const safeMonthly = Math.pow(1 + RETURNS.safe.base / 100, 1 / 12) - 1;
  const points: ReplayPoint[] = [];
  let sold = start;
  let worthAtTrough = start;
  for (let k = 0; k <= REPLAY_MONTHS; k++) {
    if (k > 0) buy(amt, k);
    const worth = worthAt(k);
    const putIn = start + amt * k;
    if (k <= troughMonth || !hasFall) sold = worth;
    else sold = sold * (1 + safeMonthly) + amt;
    if (k === troughMonth) worthAtTrough = worth;
    points.push({
      k,
      worth: Math.round(worth),
      putIn: Math.round(putIn),
      sold: Math.round(sold),
      under: worth < putIn - 0.5 ? Math.round(worth) : null,
    });
  }
  const putInAtTrough = start + amt * troughMonth;
  const last = points[points.length - 1];
  return {
    points,
    troughMonth,
    hasFall,
    worthAtTrough: Math.round(worthAtTrough),
    putInAtTrough: Math.round(putInAtTrough),
    fallAtTrough: hasFall ? Math.max(0, Math.round(putInAtTrough - worthAtTrough)) : 0,
    marketDropPct: hasFall ? peak * 100 : 0,
    finalKept: last.worth,
    finalSold: last.sold,
    finalPutIn: last.putIn,
  };
}

export interface StressResult {
  fall: number;
  fits: boolean;
  troughMonth: number;
  putIn: number;
  worth: number;
}

/** The one Panic Budget check used everywhere: replay "Crash like 2008" for this plan. */
export function stressTest(spec: Pick<PlanSpec, 'allocation' | 'monthlyAmount' | 'existing'>, panicBudget?: number): StressResult {
  const r = replay(scenarioById('crash2008'), spec.allocation, spec.monthlyAmount, spec.existing);
  const budget = typeof panicBudget === 'number' && Number.isFinite(panicBudget) ? panicBudget : Infinity;
  return { fall: r.fallAtTrough, fits: r.fallAtTrough <= budget, troughMonth: r.troughMonth, putIn: r.putInAtTrough, worth: r.worthAtTrough };
}

export interface FitResult {
  allocation: Allocation;
  monthlyAmount: number;
  fits: boolean;
  stress: StressResult;
  steps: number;
}

/**
 * Lower the long-term share 10 points at a time (half to safe, half to mid) until the
 * 2008-style fall fits the budget. The monthly amount is re-solved at base return so the date holds.
 */
export function fitToPanicBudget(spec: PlanSpec, panicBudget: number, keepAmount = false): FitResult {
  let allocation = { ...spec.allocation };
  let monthlyAmount = spec.monthlyAmount;
  let stress = stressTest({ allocation, monthlyAmount, existing: spec.existing }, panicBudget);
  let steps = 0;
  while (!stress.fits && allocation.long > 0 && steps < 20) {
    allocation = allocationShift(allocation, 10);
    if (!keepAmount) monthlyAmount = planRange({ ...spec, allocation }).base;
    stress = stressTest({ allocation, monthlyAmount, existing: spec.existing }, panicBudget);
    steps++;
  }
  return { allocation, monthlyAmount, fits: stress.fits, stress, steps };
}

export function forwardRates(spec: PlanSpec, scenario: Scenario) {
  return blendedRates(spec.allocation, spec.band, scenario.forwardReturnDelta);
}
