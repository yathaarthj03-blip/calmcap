import { countdown, monthKey, targetDate } from '../engine/dates';
import { projectFinish } from '../engine/fallback';
import { savingsBreakdown } from '../engine/holdings';
import { nextMilestone } from '../engine/milestones';
import { roadmap, specFromVersion } from '../engine/plan';
import { capacityFor } from '../engine/recommend';
import type { Milestone, PlanSpec, PlanVersion } from '../engine/types';
import { CorridorState, createDemoState } from './types';

let cachedPlanVersion: PlanVersion | null = null;
let cachedSpec: PlanSpec | null = null;

export function selectActivePlan(state: CorridorState): PlanVersion {
  if (!state.planVersions || state.planVersions.length === 0) {
    return createDemoState().planVersions[0];
  }
  return state.planVersions[state.planVersions.length - 1];
}

export function selectPlanSpec(state: CorridorState): PlanSpec {
  const activePlan = selectActivePlan(state);
  if (cachedPlanVersion === activePlan && cachedSpec) {
    return cachedSpec;
  }
  cachedPlanVersion = activePlan;
  cachedSpec = specFromVersion(activePlan);
  return cachedSpec;
}

export function selectCapacity(state: CorridorState): number {
  if (!state.income) return 2800;
  return capacityFor(
    state.income.primary || 0,
    state.income.side || 0,
    state.income.expenses,
    state.settings?.capacityRatio ?? 0.35,
  );
}

let lastHoldings: unknown = null;
let lastLedger: unknown = null;
let lastShockScenario: string | null | undefined = undefined;
let lastAsOfMinute = 0;
let cachedBreakdown: ReturnType<typeof savingsBreakdown> | null = null;

export function selectSavingsBreakdown(state: CorridorState, asOf: Date = new Date()) {
  const shockScenario = state.calamity ? state.calamity.scenarioId : null;
  const minute = Math.floor(asOf.getTime() / 60000);

  if (
    cachedBreakdown &&
    lastHoldings === state.holdings &&
    lastLedger === state.ledger &&
    lastShockScenario === shockScenario &&
    lastAsOfMinute === minute
  ) {
    return cachedBreakdown;
  }

  lastHoldings = state.holdings;
  lastLedger = state.ledger;
  lastShockScenario = shockScenario;
  lastAsOfMinute = minute;
  const shock = state.calamity ? getScenarioShock(state.calamity.scenarioId) : null;
  cachedBreakdown = savingsBreakdown(state.holdings || [], state.ledger || [], asOf, shock);
  return cachedBreakdown;
}

export function selectSavingsSoFar(state: CorridorState, asOf: Date = new Date()): number {
  return selectSavingsBreakdown(state, asOf).total;
}

let lastProjSpec: PlanSpec | null = null;
let lastProjStartM: string | null = null;
let lastProjCurSavings = 0;
let lastProjCurM: string | null = null;
let cachedProj: ReturnType<typeof projectFinish> | null = null;

export function selectProjectedFinish(state: CorridorState, asOf: Date = new Date()) {
  const spec = selectPlanSpec(state);
  const activePlan = selectActivePlan(state);
  const curM = monthKey(asOf);
  const curSavings = selectSavingsSoFar(state, asOf);
  const startM = activePlan?.goal?.startMonth || curM;

  if (
    cachedProj &&
    lastProjSpec === spec &&
    lastProjStartM === startM &&
    lastProjCurSavings === curSavings &&
    lastProjCurM === curM
  ) {
    return cachedProj;
  }

  lastProjSpec = spec;
  lastProjStartM = startM;
  lastProjCurSavings = curSavings;
  lastProjCurM = curM;
  cachedProj = projectFinish(spec, startM, curSavings, curM);
  return cachedProj;
}

let lastCountdownStartM: string | null = null;
let lastCountdownMonths = 0;
let lastCountdownAsOfMinute = 0;
let cachedCountdown: ReturnType<typeof countdown> | null = null;

export function selectCountdown(state: CorridorState, asOf: Date = new Date()) {
  const activePlan = selectActivePlan(state);
  const startM = activePlan?.goal?.startMonth || monthKey(asOf);
  const months = activePlan?.goal?.months || 120;
  const minute = Math.floor(asOf.getTime() / 60000);

  if (
    cachedCountdown &&
    lastCountdownStartM === startM &&
    lastCountdownMonths === months &&
    lastCountdownAsOfMinute === minute
  ) {
    return cachedCountdown;
  }

  lastCountdownStartM = startM;
  lastCountdownMonths = months;
  lastCountdownAsOfMinute = minute;
  const target = targetDate(startM, months);
  cachedCountdown = countdown(asOf, target);
  return cachedCountdown;
}

export function selectMonthlyUpdateDue(state: CorridorState, asOf: Date = new Date()): boolean {
  if (!state.settings?.onboardingComplete) return false;
  const currentMonthKey = monthKey(asOf);
  const activePlan = selectActivePlan(state);
  if (!activePlan?.goal?.startMonth) return false;
  // Onboarding month counts as done
  if (currentMonthKey <= activePlan.goal.startMonth) return false;
  const hasEntry = (state.ledger || []).some((e) => e.month === currentMonthKey);
  return !hasEntry;
}

let lastRoadmapSpec: PlanSpec | null = null;
let lastRoadmapStartM: string | null = null;
let cachedRoadmapRows: ReturnType<typeof roadmap> | null = null;

export function selectRoadmapRows(state: CorridorState) {
  const spec = selectPlanSpec(state);
  const activePlan = selectActivePlan(state);
  const startM = activePlan?.goal?.startMonth || monthKey(new Date());

  if (cachedRoadmapRows && lastRoadmapSpec === spec && lastRoadmapStartM === startM) {
    return cachedRoadmapRows;
  }

  lastRoadmapSpec = spec;
  lastRoadmapStartM = startM;
  cachedRoadmapRows = roadmap(spec, startM);
  return cachedRoadmapRows;
}

export function selectNextMilestone(state: CorridorState): Milestone | undefined {
  if (!state.milestones || state.milestones.length === 0) return undefined;
  return nextMilestone(state.milestones);
}

export function selectIsUnderStress(state: CorridorState): boolean {
  if (state.calamity && state.calamity.status === 'ACTIVE') return true;
  if (!state.calamityHistory || state.calamityHistory.length === 0) return false;
  const last = state.calamityHistory[state.calamityHistory.length - 1];
  if (last && last.decision === 'DECLINED_KEPT_PLAN' && !last.recoveredAt) {
    return true;
  }
  return false;
}

function getScenarioShock(scenarioId: string) {
  switch (scenarioId) {
    case 'correction':
      return { safe: 0, mid: 0, long: 0.15 };
    case 'bear':
      return { safe: 0, mid: 0, long: 0.28 };
    case 'crash2008':
      return { safe: 0, mid: 0.07, long: 0.38 };
    case 'rateCut':
    default:
      return { safe: 0, mid: 0, long: 0 };
  }
}

