import { endOfMonth } from 'date-fns';
import { dayKey, parseMonthKey } from './dates';
import { roadmap } from './plan';
import type { Milestone, PlanSpec } from './types';

// Quarterly milestones: one at every calendar quarter end inside the plan, plus the final month.

export function generateMilestones(spec: PlanSpec, startMonth: string, idPrefix = 'ms'): Milestone[] {
  const rows = roadmap(spec, startMonth);
  const out: Milestone[] = [];
  for (const r of rows) {
    if (!r.isQuarterEnd && !r.isFinal) continue;
    const quarterEnd = dayKey(endOfMonth(parseMonthKey(r.month)));
    out.push({
      id: `${idPrefix}-${quarterEnd}`,
      index: out.length + 1,
      quarterEnd,
      targetValue: r.isFinal ? Math.max(r.cumulative, spec.goalAmount) : r.cumulative,
    });
  }
  return out;
}

/**
 * After a plan change: achieved milestones and past quarters are kept as they were;
 * every future quarter is regenerated from the new plan. Indexes are renumbered.
 */
export function regenerateMilestones(existing: Milestone[], generated: Milestone[], todayKey: string): Milestone[] {
  const keep = existing.filter((m) => m.achievedAt || m.quarterEnd < todayKey);
  const taken = new Set(keep.map((m) => m.quarterEnd));
  const fresh = generated.filter((g) => g.quarterEnd >= todayKey && !taken.has(g.quarterEnd));
  return [...keep, ...fresh]
    .sort((a, b) => (a.quarterEnd < b.quarterEnd ? -1 : a.quarterEnd > b.quarterEnd ? 1 : 0))
    .map((m, i) => ({ ...m, index: i + 1 }));
}

export interface EvalResult {
  milestones: Milestone[];
  newlyAchieved: string[];
}

/** Mark every unachieved milestone whose target is covered by savings. Achieved ones never change. */
export function evaluateMilestones(milestones: Milestone[], savings: number, stamp: string): EvalResult {
  const newlyAchieved: string[] = [];
  const next = milestones.map((m) => {
    if (m.achievedAt || !(m.targetValue <= savings)) return m;
    newlyAchieved.push(m.id);
    return { ...m, achievedAt: stamp, seenCelebration: false };
  });
  return { milestones: newlyAchieved.length ? next : milestones, newlyAchieved };
}

export function nextMilestone(milestones: Milestone[]): Milestone | undefined {
  return milestones.find((m) => !m.achievedAt);
}

export function achievedCount(milestones: Milestone[]): number {
  return milestones.filter((m) => m.achievedAt).length;
}
