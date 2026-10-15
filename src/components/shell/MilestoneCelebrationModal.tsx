import React from 'react';
import { Check, Copy } from 'lucide-react';
import { inr } from '../../engine/format';
import { dayKey } from '../../engine/dates';
import { pickSeededDistinct } from '../../engine/seed';
import { streak } from '../../engine/holdings';
import { QUOTES } from '../../data/quotes';
import { useStore } from '../../store/useStore';
import { selectSavingsSoFar } from '../../store/selectors';
import { Dialog } from '../ui/Dialog';

export const MilestoneCelebrationModal: React.FC = () => {
  const milestones = useStore((s) => s.milestones);
  const ledger = useStore((s) => s.ledger);
  const markCelebrated = useStore((s) => s.markMilestoneCelebrated);
  const showToast = useStore((s) => s.showToast);
  const savingsNow = useStore(selectSavingsSoFar);

  // Queue of uncelebrated achieved milestones
  const uncelebrated = milestones.find((m) => m.achievedAt && !m.seenCelebration);

  if (!uncelebrated) return null;

  const totalMilestones = milestones.length;
  const milestoneIndex = uncelebrated.index;

  // Streak of consecutive logged months
  const allMonths = [...new Set(ledger.map((e) => e.month))].sort();
  const currentStreak = streak(ledger, allMonths);

  // Perspective paragraph strictly from prompt:
  let perspective = '';
  if (milestoneIndex === 1) {
    perspective =
      'Starting is where most plans stop. Warren Buffett bought his first stock at 11. You started at 19 and you are already moving.';
  } else if (milestoneIndex <= 3) {
    perspective = `The thread in almost every long-term wealth story is consistency, not timing. You have now done it for ${milestoneIndex} quarters.`;
  } else {
    perspective =
      'Ray Dalio began investing as a teenager and credits patience through bad stretches. You are building the same habit.';
  }

  // Quote: day-seeded distinct from dashboard quote
  const todayStr = dayKey(new Date());
  const quote = pickSeededDistinct(todayStr + ':ach', todayStr, QUOTES);

  const handleKeepGoing = () => {
    markCelebrated(uncelebrated.id);
  };

  const handleCopyProgress = () => {
    const text = `CalmCap Milestone ${milestoneIndex} of ${totalMilestones} reached! Total saved: ${inr(savingsNow)} with a streak of ${currentStreak} months.`;
    navigator.clipboard?.writeText(text);
    showToast('Progress copied to clipboard', 'success');
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) handleKeepGoing();
      }}
      title="Milestone Reached"
      maxWidth="max-w-md"
    >
      <div className="text-center py-4 space-y-4">
        {/* Drawn check ring */}
        <div className="mx-auto w-16 h-16 rounded-full border-2 border-accent flex items-center justify-center bg-accent/10 text-accent">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted font-semibold">
            Milestone {milestoneIndex} of {totalMilestones} reached
          </div>
          <div className="text-3xl font-display font-bold text-ink mt-1 num">
            {inr(uncelebrated.targetValue)}
          </div>
          {currentStreak > 0 && (
            <div className="text-xs text-muted mt-1">
              {currentStreak} month consecutive contribution streak
            </div>
          )}
        </div>

        {/* Perspective paragraph */}
        <div className="p-4 rounded-ctl bg-surface-2 text-sm text-ink leading-relaxed text-left border border-line">
          {perspective}
        </div>

        {/* Motivational quote */}
        <blockquote className="text-xs italic text-muted text-left border-l-2 border-accent pl-3 py-0.5">
          "{quote.text}" — <span className="not-italic font-medium">{quote.speaker}</span>
        </blockquote>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopyProgress}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-ctl border border-line text-ink hover:bg-surface-2 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Copy my progress</span>
          </button>
          <button
            onClick={handleKeepGoing}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90 transition-opacity"
          >
            Keep going
          </button>
        </div>
      </div>
    </Dialog>
  );
};
