import { countdown, monthKey, targetDate } from '../engine/dates';
import { projectFinish } from '../engine/fallback';
import { savingsBreakdown } from '../engine/holdings';
import { nextMilestone } from '../engine/milestones';
import { roadmap, specFromVersion } from '../engine/plan';
import { capacityFor } from '../engine/recommend';
import type { Milestone, PlanSpec, PlanVersion } from '../engine/types';
import { CorridorState, createDemoState } from './types';

export function selectActivePlan(state: CorridorState): PlanVersion {
  if (!state.planVersions || state.planVersions.length === 0) {
    return createDemoState().planVersions[0];
  }
  return state.planVersions[state.planVersions.length - 1];
}

export function selectPlanSpec(state: CorridorState): PlanSpec {
  return specFromVersion(selectActivePlan(state));
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

export function selectSavingsBreakdown(state: CorridorState, asOf: Date = new Date()) {
  const shock = state.calamity ? getScenarioShock(state.calamity.scenarioId) : null;
  return savingsBreakdown(state.holdings || [], state.ledger || [], asOf, shock);
}

export function selectSavingsSoFar(state: CorridorState, asOf: Date = new Date()): number {
  return selectSavingsBreakdown(state, asOf).total;
}

export function selectProjectedFinish(state: CorridorState, asOf: Date = new Date()) {
  const spec = selectPlanSpec(state);
  const activePlan = selectActivePlan(state);
  const curM = monthKey(asOf);
  const curSavings = selectSavingsSoFar(state, asOf);
  const startM = activePlan?.goal?.startMonth || curM;
  return projectFinish(spec, startM, curSavings, curM);
}

export function selectCountdown(state: CorridorState, asOf: Date = new Date()) {
  const activePlan = selectActivePlan(state);
  const startM = activePlan?.goal?.startMonth || monthKey(asOf);
  const months = activePlan?.goal?.months || 120;
  const target = targetDate(startM, months);
  return countdown(asOf, target);
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

export function selectRoadmapRows(state: CorridorState) {
  const spec = selectPlanSpec(state);
  const activePlan = selectActivePlan(state);
  const startM = activePlan?.goal?.startMonth || monthKey(new Date());
  return roadmap(spec, startM);
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
