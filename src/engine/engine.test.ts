import { describe, expect, it } from 'vitest';
import { assessChange } from './assess';
import { ALLOCATIONS } from './assumptions';
import { expectedNextQuarter, expenseSplit } from './budget';
import { addMonthsKey, countdown, dayKey, monthKey, monthsBetween, targetMonthKey } from './dates';
import { calculateCareerBoostImpact, getEducationActionHub } from './education';
import { fallbackCore, projectFinish } from './fallback';
import { futureValue, monthsToGoal, requiredMonthly, todaysMoney } from './finance';
import { inr, inrCompact, num, parseMoney, pct } from './format';
import { holdingValue, savingsBreakdown } from './holdings';
import { evaluateMilestones, generateMilestones, regenerateMilestones } from './milestones';
import { blendedRates, planRange, roadmap } from './plan';
import { capacityFor, consFor, recommendBand, reliableIncome } from './recommend';
import { fitToPanicBudget, replay, scenarioById, stressTest } from './replay';
import { pickSeeded, pickSeededDistinct, seededShuffle, hashString } from './seed';
import type { Holding, LedgerEntry, PlanSpec, PlanVersion } from './types';

const near = (actual: number, expected: number, tol = 2) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('test vectors (8.7)', () => {
  it('futureValue', () => {
    near(futureValue({ monthly: 3000, months: 120, annualRate: 11 }), 631_771);
    near(futureValue({ monthly: 5000, months: 60, annualRate: 7.4 }), 359_453);
  });
  it('requiredMonthly', () => {
    near(requiredMonthly({ goal: 1_000_000, months: 120, annualRate: 9.6 }), 5_109);
    near(requiredMonthly({ goal: 1_000_000, months: 60, annualRate: 7.4 }), 13_910);
    near(requiredMonthly({ goal: 1_000_000, months: 12, annualRate: 5.5 }), 81_304);
    near(requiredMonthly({ goal: 10_000_000, months: 120, annualRate: 9.6 }), 51_089);
    near(requiredMonthly({ goal: 1_000_000, months: 120, annualRate: 9.6, existing: 20_000 }), 4_853);
  });
  it('blended rates match the allocation table', () => {
    expect(blendedRates(ALLOCATIONS.LONG, 'LONG')).toEqual({ low: 4.7, base: 9.6, high: 12.8 });
    expect(blendedRates(ALLOCATIONS.MID, 'MID')).toEqual({ low: 4.2, base: 7.4, high: 9.3 });
    expect(blendedRates(ALLOCATIONS.SOONER, 'SOONER')).toEqual({ low: 4, base: 5.5, high: 6.5 });
  });
  const range = (band: 'LONG' | 'MID' | 'SOONER', months: number) =>
    planRange({ goalAmount: 1_000_000, months, existing: 0, stepUpPct: 0, allocation: ALLOCATIONS[band], band });
  it('Long band range', () => {
    const r = range('LONG', 120);
    near(r.min, 4_320);
    near(r.base, 5_109);
    near(r.max, 6_578);
  });
  it('Mid band range', () => {
    const r = range('MID', 60);
    near(r.min, 13_284);
    near(r.base, 13_910);
    near(r.max, 15_037);
  });
  it('Sooner band range', () => {
    const r = range('SOONER', 12);
    near(r.min, 80_949);
    near(r.base, 81_304);
    near(r.max, 81_843);
    expect(r.min).toBeLessThanOrEqual(r.base);
    expect(r.base).toBeLessThanOrEqual(r.max);
  });
  it("today's money", () => {
    near(todaysMoney(1_000_000, 120, 6), 558_395);
  });
});

describe('finance edge cases', () => {
  it('existing already reaches the goal', () => {
    expect(requiredMonthly({ goal: 100_000, months: 12, annualRate: 5, existing: 200_000 })).toBe(0);
    expect(monthsToGoal({ monthly: 0, goal: 100_000, annualRate: 5, existing: 200_000 })).toBe(0);
  });
  it('never NaN on bad input', () => {
    expect(futureValue({ monthly: NaN, months: NaN, annualRate: NaN })).toBe(0);
    expect(Number.isNaN(requiredMonthly({ goal: NaN, months: 10, annualRate: 5 }))).toBe(false);
  });
  it('unreachable returns Infinity', () => {
    expect(monthsToGoal({ monthly: 0, goal: 1_000_000, annualRate: 5 })).toBe(Infinity);
  });
  it('step-up raises the amount every 12 months', () => {
    const flat = futureValue({ monthly: 1000, months: 24, annualRate: 0 });
    const up = futureValue({ monthly: 1000, months: 24, annualRate: 0, stepUpPct: 10 });
    expect(flat).toBe(24_000);
    near(up, 12_000 + 13_200, 0.01);
  });
  it('monthsToGoal agrees with requiredMonthly', () => {
    const req = requiredMonthly({ goal: 1_000_000, months: 120, annualRate: 9.6 });
    expect(monthsToGoal({ monthly: req, goal: 1_000_000, annualRate: 9.6 })).toBe(120);
  });
});

describe('recommendation (8.7)', () => {
  it('₹20k + ₹5k side, ₹10 lakh → Long', () => {
    expect(reliableIncome(20_000, 5_000)).toBe(22_500);
    const cap = capacityFor(20_000, 5_000, undefined);
    expect(cap).toBe(7_875);
    const r = recommendBand(cap, 1_000_000);
    expect(r.evaluations.SOONER.ratio).toBeCloseTo(10.32, 1);
    expect(r.evaluations.MID.ratio).toBeCloseTo(1.77, 1);
    expect(r.evaluations.LONG.ratio).toBeCloseTo(0.65, 2);
    expect(r.band).toBe('LONG');
    expect(r.label).toBe('RECOMMENDED');
  });
  it('₹80k → Mid', () => {
    const cap = capacityFor(80_000, 0, undefined);
    expect(cap).toBe(28_000);
    expect(recommendBand(cap, 1_000_000).band).toBe('MID');
  });
  it('₹4L → Sooner', () => {
    const cap = capacityFor(400_000, 0, undefined);
    expect(cap).toBe(140_000);
    expect(recommendBand(cap, 1_000_000).band).toBe('SOONER');
  });
  it('$1M at ₹20k → Long stretch', () => {
    const r = recommendBand(capacityFor(20_000, 0, undefined), 88_000_000);
    expect(r.band).toBe('LONG');
    expect(r.label).toBe('STRETCH');
    expect(r.stretch).toBe(true);
  });
  it('income 0 → capacity 0 and Infinity ratios, no crash', () => {
    const cap = capacityFor(0, 0, undefined);
    expect(cap).toBe(0);
    const r = recommendBand(cap, 1_000_000);
    expect(r.evaluations.LONG.ratio).toBe(Infinity);
    expect(r.stretch).toBe(true);
  });
  it('expenses override the ratio', () => {
    expect(capacityFor(20_000, 0, 15_000)).toBe(5_000);
    expect(capacityFor(20_000, 0, 25_000)).toBe(0);
  });
  it('cons carry real numbers', () => {
    const cap = capacityFor(20_000, 5_000, undefined);
    const r = recommendBand(cap, 1_000_000);
    const c = consFor('MID', 'LONG', { capacity: cap, goalAmount: 1_000_000, startMonth: '2026-10', evaluations: r.evaluations });
    expect(c.cons.length).toBeLessThanOrEqual(3);
    expect(c.cons[0]).toContain('₹13,910');
    expect(c.pro).toContain('5 years sooner');
    const longer = consFor('LONG', 'MID', { capacity: 28_000, goalAmount: 1_000_000, startMonth: '2026-10', evaluations: recommendBand(28_000, 1_000_000).evaluations });
    expect(longer.cons[0]).toContain('Oct 2036');
    expect(longer.cons[1]).toContain('₹5,58,395');
  });
});

describe('replay and stress test', () => {
  it('matches the ₹3,000 20/20/60 sanity check', () => {
    const r = replay(scenarioById('crash2008'), { safe: 20, mid: 20, long: 60 }, 3000);
    expect(r.troughMonth).toBeGreaterThanOrEqual(42);
    expect(r.troughMonth).toBeLessThanOrEqual(45);
    expect(r.marketDropPct).toBeGreaterThan(33);
    expect(r.marketDropPct).toBeLessThan(43);
    expect(r.putInAtTrough).toBeGreaterThan(125_000);
    expect(r.putInAtTrough).toBeLessThan(136_000);
    expect(r.worthAtTrough).toBeGreaterThan(100_000);
    expect(r.worthAtTrough).toBeLessThan(124_000);
    expect(r.finalKept).toBeGreaterThan(520_000);
    expect(r.finalKept).toBeLessThan(640_000);
    expect(r.finalSold).toBeGreaterThan(370_000);
    expect(r.finalSold).toBeLessThan(470_000);
    expect(r.finalKept).toBeGreaterThan(r.finalSold);
  });
  it('is reproducible', () => {
    const a = replay(scenarioById('bear'), ALLOCATIONS.LONG, 5000);
    const b = replay(scenarioById('bear'), ALLOCATIONS.LONG, 5000);
    expect(a).toEqual(b);
  });
  it('shallower scenarios fall less', () => {
    const c = replay(scenarioById('correction'), ALLOCATIONS.LONG, 5000);
    const b = replay(scenarioById('bear'), ALLOCATIONS.LONG, 5000);
    const x = replay(scenarioById('crash2008'), ALLOCATIONS.LONG, 5000);
    expect(c.fallAtTrough).toBeLessThan(b.fallAtTrough);
    expect(b.fallAtTrough).toBeLessThan(x.fallAtTrough);
  });
  it('all-safe plan never falls', () => {
    expect(stressTest({ allocation: ALLOCATIONS.SOONER, monthlyAmount: 5000, existing: 0 }, 1000).fall).toBe(0);
  });
  it('fitToPanicBudget lowers growth share until it fits', () => {
    const spec: PlanSpec = { goalAmount: 1_000_000, months: 120, existing: 0, stepUpPct: 0, allocation: ALLOCATIONS.LONG, band: 'LONG', monthlyAmount: 5109 };
    const before = stressTest(spec, 5000);
    expect(before.fits).toBe(false);
    const fit = fitToPanicBudget(spec, 5000);
    expect(fit.allocation.long).toBeLessThan(70);
    expect(fit.allocation.safe + fit.allocation.mid + fit.allocation.long).toBe(100);
    expect(fit.fits || fit.allocation.long === 0).toBe(true);
    expect(fit.monthlyAmount).toBeGreaterThan(5109);
  });
});

describe('roadmap and milestones', () => {
  const spec: PlanSpec = { goalAmount: 1_000_000, months: 120, existing: 0, stepUpPct: 0, allocation: ALLOCATIONS.LONG, band: 'LONG', monthlyAmount: 5109 };
  it('has one row per month and ends near the goal', () => {
    const rows = roadmap(spec, '2026-10');
    expect(rows).toHaveLength(120);
    expect(rows[0].month).toBe('2026-11');
    expect(rows[119].month).toBe('2036-10');
    near(rows[119].cumulative, 1_000_000, 300);
    expect(rows[0].total[0]).toBeLessThanOrEqual(rows[0].total[1]);
  });
  it('step-up raises amounts after 12 months', () => {
    const rows = roadmap({ ...spec, stepUpPct: 10 }, '2026-10');
    expect(rows[12].total[0]).toBeGreaterThan(rows[11].total[0]);
  });
  it('milestones at quarter ends with growing targets', () => {
    const ms = generateMilestones(spec, '2026-10');
    expect(ms[0].quarterEnd).toBe('2026-12-31');
    expect(ms.at(-1)?.quarterEnd).toBe('2036-10-31');
    for (let i = 1; i < ms.length; i++) expect(ms[i].targetValue).toBeGreaterThan(ms[i - 1].targetValue);
  });
  it('evaluate marks achieved once and never changes achieved', () => {
    const ms = generateMilestones(spec, '2026-10');
    const r1 = evaluateMilestones(ms, ms[1].targetValue + 1, '2027-01-01T10:00:00');
    expect(r1.newlyAchieved).toHaveLength(2);
    const r2 = evaluateMilestones(r1.milestones, 10_000_000, '2028-01-01T10:00:00');
    expect(r2.milestones[0].achievedAt).toBe('2027-01-01T10:00:00');
  });
  it('regenerate keeps achieved and past, replaces future', () => {
    const ms = generateMilestones(spec, '2026-10');
    const achieved = evaluateMilestones(ms, ms[0].targetValue, 'x').milestones;
    const next = generateMilestones({ ...spec, monthlyAmount: 9000, months: 60 }, '2026-10', 'v2');
    const merged = regenerateMilestones(achieved, next, '2027-02-01');
    expect(merged[0].achievedAt).toBe('x');
    expect(merged[0].id).toBe(ms[0].id);
    expect(merged.every((m, i) => m.index === i + 1)).toBe(true);
    expect(merged.some((m) => m.id.startsWith('v2'))).toBe(true);
  });
});

describe('holdings and ledger', () => {
  const h: Holding = { id: 'h1', name: 'FD', category: 'FIXED_DEPOSIT', bucket: 'mid', startDate: '2025-01-01', initialAmount: 10_000, annualReturnPct: 7 };
  it('compounds daily', () => {
    near(holdingValue(h, [], new Date(2026, 0, 1)), 10_700, 1);
  });
  it('assigned entries count once; CASH compounds at 3%', () => {
    const ledger: LedgerEntry[] = [
      { id: 'a', month: '2025-01', amount: 1000, holdingId: 'h1', incomeAtTime: 0, loggedAt: '2025-01-01T00:00:00' },
      { id: 'b', month: '2025-01', amount: 1000, holdingId: 'CASH', incomeAtTime: 0, loggedAt: '2025-01-01T00:00:00' },
    ];
    const s = savingsBreakdown([h], ledger, new Date(2026, 0, 1));
    near(s.byHolding.h1, 11_770, 1);
    near(s.cash, 1030, 1);
    near(s.total, 12_800, 2);
    expect(s.putIn).toBe(12_000);
  });
  it('future contributions do not count yet', () => {
    const s = savingsBreakdown([h], [], new Date(2024, 0, 1));
    expect(s.total).toBe(0);
  });
});

describe('assessChange', () => {
  const base: PlanVersion = {
    version: 1,
    createdAt: '2026-10-15T10:00:00',
    reason: 'ONBOARDING',
    goal: { id: 'TEN_LAKH', amount: 1_000_000, band: 'LONG', months: 120, startMonth: '2026-10', existing: 0 },
    plan: { monthlyAmount: 5109, tier: 'RECOMMENDED', stepUpPct: 0, allocation: ALLOCATIONS.LONG, panicBudget: 15000 },
  };
  const ctx = { savingsNow: 0, currentMonth: '2026-10', capacityPrev: 7875, capacityNext: 7875 };
  it('harmless edit (same plan, new promise) is not harmful', () => {
    const next = { ...base, plan: { ...base.plan, promise: 'keep going' } };
    expect(assessChange(base, next, ctx).harmful).toBe(false);
  });
  it('shorter tenure that becomes unaffordable is harmful', () => {
    const next = { ...base, goal: { ...base.goal, months: 60 }, plan: { ...base.plan, monthlyAmount: 14_500 } };
    const a = assessChange(base, next, ctx);
    expect(a.harmful).toBe(true);
    expect(a.reasons.join(' ')).toContain('%');
  });
  it('lower amount below Lean is harmful (delay + below minimum)', () => {
    const next = { ...base, plan: { ...base.plan, monthlyAmount: 3000, tier: 'CUSTOM' as const } };
    const a = assessChange(base, next, ctx);
    expect(a.harmful).toBe(true);
    expect(a.reasons.length).toBeGreaterThanOrEqual(2);
  });
  it('short tenure with growth assets is harmful', () => {
    const next = { ...base, goal: { ...base.goal, months: 18, band: 'MID' as const }, plan: { ...base.plan, monthlyAmount: 52_000 } };
    const a = assessChange(base, next, { ...ctx, capacityPrev: 100_000, capacityNext: 100_000 });
    expect(a.reasons.some((r) => r.includes('index funds'))).toBe(true);
  });
});

describe('fallback', () => {
  it('holds the date or the amount', () => {
    const spec: PlanSpec = { goalAmount: 1_000_000, months: 120, existing: 0, stepUpPct: 0, allocation: ALLOCATIONS.LONG, band: 'LONG', monthlyAmount: 5109 };
    const core = fallbackCore({
      spec, startMonth: '2026-01', currentMonth: '2027-01',
      savingsByBucket: { safe: 6000, mid: 12000, long: 45000 }, capacity: 7875, scenario: scenarioById('crash2008'),
    });
    expect(core.afterTotal).toBeLessThan(core.beforeTotal);
    expect(core.after.safe).toBe(6000);
    expect(core.optionA.monthlyAmount).toBeGreaterThan(5109);
    expect(core.optionA.finishMonth).toBe('2036-01');
    expect(core.doNothing.shortfallAtTarget).toBeGreaterThan(0);
    expect(['A', 'B']).toContain(core.recommended);
  });
  it('projectFinish says on track for a fresh plan', () => {
    const spec: PlanSpec = { goalAmount: 1_000_000, months: 120, existing: 0, stepUpPct: 0, allocation: ALLOCATIONS.LONG, band: 'LONG', monthlyAmount: 5110 };
    expect(projectFinish(spec, '2026-10', 0, '2026-10').status).toBe('ON_TRACK');
  });
});

describe('budget tiles', () => {
  it('splits the rest 65/35', () => {
    const s = expenseSplit(25_000, 5_000);
    expect(s).toMatchObject({ save: 5000, needs: 13000, wants: 7000 });
    expect(expenseSplit(0, 5000).save).toBe(0);
  });
  it('quarter forecast includes a raise inside the quarter', () => {
    const f = expectedNextQuarter({ primary: 20_000, side: 5_000, expectedRaisePct: 10, expectedRaiseDate: '2027-02-01' }, [], new Date(2026, 9, 15));
    expect(f.label).toBe('Q1 2027');
    expect(f.low).toBe(75_000);
    expect(f.high).toBe(79_000);
  });
});

describe('dates', () => {
  it('local keys without toISOString shifts', () => {
    expect(dayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(monthKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12');
  });
  it('month arithmetic across year end', () => {
    expect(addMonthsKey('2026-11', 3)).toBe('2027-02');
    expect(monthsBetween('2026-11', '2027-02')).toBe(3);
    expect(targetMonthKey('2026-10', 120)).toBe('2036-10');
  });
  it('leap day countdown', () => {
    const c = countdown(new Date(2028, 1, 29), new Date(2029, 1, 28));
    expect(c.passed).toBe(false);
    expect(c.years * 12 + c.months).toBeGreaterThanOrEqual(11);
  });
  it('passed targets never go negative', () => {
    expect(countdown(new Date(2040, 0, 1), new Date(2036, 9, 31))).toMatchObject({ passed: true, years: 0, days: 0 });
  });
});

describe('seeded selection', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  it('stable within a day, can change across days', () => {
    expect(pickSeeded('2026-10-15', items)).toBe(pickSeeded('2026-10-15', items));
    const picks = new Set(Array.from({ length: 20 }, (_, i) => pickSeeded(`2026-10-${10 + i}`, items)));
    expect(picks.size).toBeGreaterThan(1);
  });
  it('distinct pick differs', () => {
    for (let d = 1; d < 28; d++) {
      const k = `2026-10-${String(d).padStart(2, '0')}`;
      expect(pickSeededDistinct(k + ':ach', k, items)).not.toBe(pickSeeded(k, items));
    }
  });
  it('shuffle is a permutation and deterministic', () => {
    const s = seededShuffle(items, hashString('x'));
    expect([...s].sort()).toEqual(items);
    expect(seededShuffle(items, hashString('x'))).toEqual(s);
  });
});

describe('money formatting', () => {
  it('formats Indian style and compact', () => {
    expect(inr(120000)).toBe('₹1,20,000');
    expect(inr(0)).toBe('₹0');
    expect(inr(-0)).toBe('₹0');
    expect(inrCompact(1_000_000)).toBe('₹10 L');
    expect(inrCompact(10_000_000)).toBe('₹1 Cr');
    expect(inrCompact(88_000_000)).toBe('₹8.8 Cr');
    expect(num(1e12)).toBe('10,00,00,00,00,000');
  });
  it('never prints NaN or Infinity', () => {
    for (const v of [NaN, Infinity, -Infinity, undefined, null]) {
      expect(inr(v as number)).toBe('—');
      expect(inrCompact(v as number)).toBe('—');
      expect(pct(v as number)).toBe('—');
    }
  });
  it('parses pasted money', () => {
    expect(parseMoney('₹ 1,20,000')).toBe(120000);
    expect(parseMoney(' 5 000 ')).toBe(5000);
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
    expect(parseMoney('')).toBeNull();
  });
});

describe('education & career to-dos', () => {
  it('returns appropriate career tracks and market platforms', () => {
    const hub = getEducationActionHub({
      level: 'UNDERGRADUATE',
      field: 'Computer Science & Engineering',
      year: '2nd Year',
      careerTrack: 'TECH_SOFTWARE',
    });
    expect(hub.trackInfo.track).toBe('TECH_SOFTWARE');
    expect(hub.trackInfo.primaryMarketPlatforms).toContain('Wellfound (AngelList)');
    expect(hub.tasks.length).toBeGreaterThanOrEqual(4);
    expect(hub.yearStageNote).toContain('2nd Year Strategy');
  });

  it('calculates significant timeline acceleration when landing internships', () => {
    const impact = calculateCareerBoostImpact(1_000_000, 0, 5000, 15000, 0.5, 9.0);
    expect(impact.boostMonthlySavings).toBe(12500);
    expect(impact.boostedMonthsToGoal).toBeLessThan(impact.originalMonthsToGoal);
    expect(impact.shavedMonths).toBeGreaterThan(30);
  });

  it('supports non-tech career tracks accurately', () => {
    const finHub = getEducationActionHub({
      level: 'UNDERGRADUATE',
      field: 'Commerce & Accounting',
      year: '3rd Year',
      careerTrack: 'FINANCE_COMMERCE',
    });
    expect(finHub.trackInfo.track).toBe('FINANCE_COMMERCE');
    expect(finHub.tasks.some((t) => t.title.includes('Financial Modeling'))).toBe(true);
    expect(finHub.yearStageNote).toContain('3rd Year Strategy');
  });
});

