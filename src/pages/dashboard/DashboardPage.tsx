import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalendarClock,
  ArrowUpRight,
  PieChart,
  Target,
  GraduationCap,
  Quote as QuoteIcon,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  selectActivePlan,
  selectCountdown,
  selectMonthlyUpdateDue,
  selectNextMilestone,
  selectPlanSpec,
  selectProjectedFinish,
  selectSavingsBreakdown,
} from '../../store/selectors';
import { expectedNextQuarter, expenseSplit } from '../../engine/budget';
import { dayKey, monthLabelLong } from '../../engine/dates';
import { inr, inrCompact } from '../../engine/format';
import { corridorSeries } from '../../engine/plan';
import { pickSeeded } from '../../engine/seed';
import { liveMarketProvider } from '../../data/providers';
import { QUOTES } from '../../data/quotes';
import { Tooltip } from '../../components/ui/Tooltip';
import { CorridorChart } from '../../components/ui/CorridorChart';
import { MonthlyUpdateModal } from '../../components/shell/MonthlyUpdateModal';
import { ScrollReveal } from '../../components/ui/ScrollReveal';

export const DashboardPage: React.FC = () => {
  const [asOf, setAsOf] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);

  // Recompute every minute and on tab focus
  useEffect(() => {
    const tick = () => setAsOf(new Date());
    const interval = setInterval(tick, 60000);
    const handleFocus = () => tick();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const profile = useStore((s) => s.profile);
  const income = useStore((s) => s.income);
  const incomeHistory = useStore((s) => s.incomeHistory);
  const planVersions = useStore((s) => s.planVersions);
  const holdings = useStore((s) => s.holdings);
  const ledger = useStore((s) => s.ledger);
  const milestones = useStore((s) => s.milestones);
  const calamity = useStore((s) => s.calamity);
  const settings = useStore((s) => s.settings);

  const activePlan = useMemo(() => {
    return planVersions.length > 0 ? planVersions[planVersions.length - 1] : selectActivePlan(useStore.getState());
  }, [planVersions]);

  const spec = useStore(selectPlanSpec);

  const savings = useMemo(() => {
    return selectSavingsBreakdown({ ...useStore.getState(), holdings, ledger, calamity }, asOf);
  }, [holdings, ledger, calamity, asOf]);

  const countdown = useMemo(() => {
    return selectCountdown({ ...useStore.getState(), planVersions }, asOf);
  }, [planVersions, asOf]);

  const projection = useMemo(() => {
    return selectProjectedFinish({ ...useStore.getState(), planVersions, holdings, ledger, calamity }, asOf);
  }, [planVersions, holdings, ledger, calamity, asOf]);

  const nextMilestone = useMemo(() => {
    return selectNextMilestone({ ...useStore.getState(), milestones });
  }, [milestones]);

  const updateDue = useMemo(() => {
    return selectMonthlyUpdateDue({ ...useStore.getState(), planVersions, ledger, settings }, asOf);
  }, [planVersions, ledger, settings, asOf]);

  // 1. Quote of the day at the very top (day-seeded pick)
  const todayKeyStr = dayKey(asOf);
  const quoteOfTheDay = useMemo(() => pickSeeded(todayKeyStr, QUOTES), [todayKeyStr]);

  // 2. Budget numbers
  const totalIncome = income.primary + income.side;
  const budget = useMemo(
    () => expenseSplit(totalIncome, activePlan.plan.monthlyAmount),
    [totalIncome, activePlan.plan.monthlyAmount],
  );

  const forecast = useMemo(
    () => expectedNextQuarter(income, incomeHistory, asOf),
    [income, incomeHistory, asOf],
  );

  // 3. Mini corridor series for the savings card
  const miniChartPoints = useMemo(() => {
    return corridorSeries(spec, activePlan.goal.startMonth, Math.min(24, spec.months));
  }, [spec, activePlan.goal.startMonth]);

  // 4. Today's market opportunities (3 cards)
  const marketSnapshot = useMemo(() => liveMarketProvider.getSnapshot(asOf), [asOf]);
  const topOpportunities = marketSnapshot.items.slice(0, 3);

  const goalReached = savings.total >= spec.goalAmount;
  const percentOfGoal = Math.min(100, Math.round((savings.total / Math.max(1, spec.goalAmount)) * 100));

  return (
    <div className="space-y-6">
      {/* 1. Monthly update strip if due */}
      {updateDue && (
        <ScrollReveal direction="down" delay={0}>
          <div className="p-4 rounded-panel glass-card bg-mid/10 border border-mid/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-mid/20 flex items-center justify-center text-mid shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">Monthly savings update due</div>
                <div className="text-xs text-muted">
                  Keep your countdown accurate by logging what you set aside this month.
                </div>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90 shrink-0"
            >
              Log this month's savings
            </button>
          </div>
        </ScrollReveal>
      )}

      {/* 2. Hero Countdown to the goal + Quote of the Day */}
      <ScrollReveal direction="up" delay={0.05}>
        <div className="p-6 sm:p-7 rounded-panel glass-card relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Countdown to your goal */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-2">
                <span className="eyebrow">Countdown to your goal</span>
                <span className="text-xs font-semibold text-accent num">
                  {inrCompact(spec.goalAmount)}
                </span>
              </div>

              {goalReached ? (
                <div className="py-2">
                  <div className="text-3xl sm:text-4xl font-display font-bold text-accent">
                    Goal achieved!
                  </div>
                  <p className="text-sm text-muted mt-2">
                    Congratulations, {profile.name || 'Aarav'}! You have reached your {inrCompact(spec.goalAmount)} milestone.
                  </p>
                </div>
              ) : countdown.passed ? (
                <div className="py-2">
                  <div className="text-2xl font-display font-bold text-ink">Target date has arrived</div>
                  <p className="text-sm text-muted mt-1">
                    You have reached the end of your original scheduled timeline. Review your progress in Admin.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-3 sm:gap-4 flex-wrap">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-display font-bold text-ink num">
                        {countdown.years}
                      </span>
                      <span className="text-xs font-medium text-muted uppercase">years</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-display font-bold text-ink num">
                        {countdown.months}
                      </span>
                      <span className="text-xs font-medium text-muted uppercase">months</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-display font-bold text-ink num">
                        {countdown.days}
                      </span>
                      <span className="text-xs font-medium text-muted uppercase">days</span>
                    </div>
                  </div>

                  {/* Projected finish & Status Chip */}
                  <div className="flex items-center gap-3 mt-4 text-xs flex-wrap">
                    <span className="text-muted">
                      Projected finish:{' '}
                      <strong className="text-ink font-semibold">
                        {projection.finishMonth ? monthLabelLong(projection.finishMonth) : 'Out of reach'}
                      </strong>
                    </span>

                    {projection.status === 'ON_TRACK' && (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-accent/15 text-accent">
                        On track
                      </span>
                    )}
                    {projection.status === 'AHEAD' && (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-accent/20 text-accent">
                        Ahead of schedule
                      </span>
                    )}
                    {projection.status === 'BEHIND' && (
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-loss/15 text-loss">
                        Behind schedule
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Quote of the Day utilizing the empty space */}
            <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-line/70 pt-5 lg:pt-0 lg:pl-8">
              <div className="p-4 sm:p-5 rounded-ctl bg-surface-2/50 border border-line/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-accent flex items-center gap-1.5">
                    <QuoteIcon className="w-3.5 h-3.5" />
                    Quote of the day
                  </span>
                  <span className="text-[10px] text-muted">Refreshes midnight</span>
                </div>
                <blockquote className="font-display text-sm sm:text-base font-medium text-ink leading-snug italic">
                  "{quoteOfTheDay.text}"
                </blockquote>
                <div className="text-xs text-muted font-medium">
                  — <span className="text-ink font-semibold">{quoteOfTheDay.speaker}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Five Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tile 1: Current Income */}
        <ScrollReveal direction="up" delay={0.05}>
          <div className="p-5 rounded-panel glass-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="font-semibold uppercase tracking-wider">Current Income</span>
                <NavLink to="/app/admin" className="text-accent hover:underline flex items-center gap-0.5">
                  <span>Change</span>
                  <ArrowUpRight className="w-3 h-3" />
                </NavLink>
              </div>
              <div className="text-2xl font-display font-bold text-ink num mt-1">
                {inr(totalIncome)}
                <span className="text-xs font-normal text-muted">/mo</span>
              </div>
              <div className="text-xs text-muted mt-2 space-y-0.5 num">
                <div>Primary: <strong className="text-ink">{inr(income.primary)}</strong></div>
                <div>Side gigs: <strong className="text-ink">{inr(income.side)}</strong></div>
              </div>
            </div>
            <div className="text-[11px] text-muted/80 mt-3 pt-2 border-t border-line/60">
              Reliable planning income: {inr(income.primary + income.side * 0.5)}/mo
            </div>
          </div>
        </ScrollReveal>

        {/* Tile 2: Expected Income Next Quarter */}
        <ScrollReveal direction="up" delay={0.1}>
          <div className="p-5 rounded-panel glass-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="font-semibold uppercase tracking-wider">Expected Next Quarter</span>
                <Tooltip content={forecast.explanation}>
                  <span className="text-muted hover:text-ink cursor-help text-[11px] underline">
                    How calculated
                  </span>
                </Tooltip>
              </div>
              <div className="text-2xl font-display font-bold text-ink num mt-1">
                {forecast.low === forecast.high ? (
                  inrCompact(forecast.base)
                ) : (
                  `${inrCompact(forecast.low)} – ${inrCompact(forecast.high)}`
                )}
              </div>
              <div className="text-xs text-muted mt-2">
                Forecast for {forecast.label} based on your reliable baseline and recorded changes.
              </div>
            </div>
            <div className="text-[11px] text-muted/80 mt-3 pt-2 border-t border-line/60">
              3-month base: {inr(forecast.base)}
            </div>
          </div>
        </ScrollReveal>

        {/* Tile 3: Recommended Expenses This Month */}
        <ScrollReveal direction="up" delay={0.15}>
          <div className="p-5 rounded-panel glass-card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="font-semibold uppercase tracking-wider">Monthly Budget Split</span>
                <PieChart className="w-4 h-4 text-muted" />
              </div>
              <div className="text-xl font-display font-bold text-ink num mt-1">
                {inr(budget.income)} total
              </div>

              {/* Stacked bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-2 mt-3">
                <div
                  style={{ width: `${(budget.needs / Math.max(1, budget.income)) * 100}%` }}
                  className="bg-safe h-full"
                  title={`Needs: ${inr(budget.needs)}`}
                />
                <div
                  style={{ width: `${(budget.wants / Math.max(1, budget.income)) * 100}%` }}
                  className="bg-mid h-full"
                  title={`Wants: ${inr(budget.wants)}`}
                />
                <div
                  style={{ width: `${(budget.save / Math.max(1, budget.income)) * 100}%` }}
                  className="bg-accent h-full"
                  title={`Save & Invest: ${inr(budget.save)}`}
                />
              </div>

              <div className="grid grid-cols-3 text-[11px] text-muted mt-2 num">
                <div><span className="inline-block w-2 h-2 rounded-full bg-safe mr-1" />Needs: {inr(budget.needs)}</div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-mid mr-1" />Wants: {inr(budget.wants)}</div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-accent mr-1" />Invest: {inr(budget.save)}</div>
              </div>
            </div>
            <div className="text-[11px] text-muted/80 mt-3 pt-2 border-t border-line/60">
              Splits remainder 65% needs, 35% wants
            </div>
          </div>
        </ScrollReveal>

        {/* Tile 4: Savings So Far - Generously spaced to avoid any collapse */}
        <ScrollReveal direction="up" delay={0.2} className="lg:col-span-2">
          <div className="p-5 sm:p-6 rounded-panel glass-card flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="font-semibold uppercase tracking-wider">Savings So Far</span>
                <span className="font-semibold text-accent num">{percentOfGoal}% of goal</span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <div className="text-3xl font-display font-bold text-ink num">
                  {inr(savings.total)}
                </div>
                <div className="text-xs text-muted num">
                  Total put in: {inr(savings.putIn)}
                </div>
              </div>

              <div className="mt-4">
                <CorridorChart data={miniChartPoints} goalAmount={spec.goalAmount} height={140} />
              </div>
            </div>

            {/* Generously spaced, styled bucket pills that eliminate collision between High and Long */}
            <div className="mt-6 pt-4 border-t border-line/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-ctl bg-safe/10 text-safe font-medium">
                <span className="w-2 h-2 rounded-full bg-safe shrink-0" />
                <span>Safe:</span>
                <strong className="num text-ink font-semibold ml-0.5">{inrCompact(savings.byBucket.safe)}</strong>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-ctl bg-mid/10 text-mid font-medium">
                <span className="w-2 h-2 rounded-full bg-mid shrink-0" />
                <span>Mid:</span>
                <strong className="num text-ink font-semibold ml-0.5">{inrCompact(savings.byBucket.mid)}</strong>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-ctl bg-accent/15 text-accent font-medium">
                <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                <span>Long:</span>
                <strong className="num text-ink font-semibold ml-0.5">{inrCompact(savings.byBucket.long)}</strong>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Tile 5: Next Milestone */}
        <ScrollReveal direction="up" delay={0.25}>
          <div className="p-5 sm:p-6 rounded-panel glass-card flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span className="font-semibold uppercase tracking-wider">Next Milestone</span>
                <Target className="w-4 h-4 text-accent" />
              </div>
              {nextMilestone ? (
                <div className="space-y-3 mt-1">
                  <div>
                    <div className="text-2xl font-display font-bold text-ink num">
                      {inr(nextMilestone.targetValue)}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Target date: {nextMilestone.quarterEnd}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1 num">
                      <span>Progress</span>
                      <span>
                        {Math.min(100, Math.round((savings.total / nextMilestone.targetValue) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((savings.total / nextMilestone.targetValue) * 100),
                          )}%`,
                        }}
                        className="bg-accent h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-xs text-muted">
                  All milestones achieved! Set a higher target in Admin.
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted/80 mt-3 pt-2 border-t border-line/60">
              Quarterly target derived from likely path
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Education & Career Action Spotlight */}
      {profile.education && (
        <ScrollReveal direction="up" delay={0.1}>
          <div className="p-4 sm:p-5 rounded-panel glass-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-l-4 border-l-accent">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-ctl bg-accent/10 text-accent shrink-0">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-accent">
                    Education & Career Focus
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-surface-2 text-ink font-semibold">
                    {profile.education.year} · {profile.education.field}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Curated internship roadmaps, freelance income opportunities, and job preparation tasks ready on your To-Do Calendar.
                </p>
              </div>
            </div>
            <NavLink
              to="/app/calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90 shrink-0 self-start sm:self-auto"
            >
              <span>View Career To-Dos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        </ScrollReveal>
      )}

      {/* 5. New Investment Opportunities */}
      <ScrollReveal direction="up" delay={0.15}>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-ink">Today's research snapshot</h3>
              <p className="text-xs text-muted">
                Opportunities matching your plan duration. Instrument categories only, never named funds.
              </p>
            </div>
            <NavLink
              to="/app/news"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>See in News</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topOpportunities.map((item) => {
              const fitsPlan = spec.allocation[item.bucket] > 0;
              return (
                <div key={item.id} className="p-4 rounded-panel glass-card flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-accent uppercase tracking-wider text-[10px]">
                        {item.bucket} bucket
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        fitsPlan ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted'
                      }`}>
                        {fitsPlan ? 'Fits your plan' : 'Secondary'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-ink">{item.category}</h4>
                    <p className="text-xs text-muted leading-relaxed">{item.why}</p>
                  </div>

                  <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                    <div className="num font-semibold text-ink">
                      {item.rateRange[0]}% – {item.rateRange[1]}%
                      <span className="text-[10px] text-muted font-normal block">illustrative range</span>
                    </div>
                    <span className="text-[10px] font-medium text-muted bg-surface-2 px-2 py-0.5 rounded">
                      Risk: {item.risk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted text-right pt-1">
            {marketSnapshot.updatedLabel}
          </div>
        </div>
      </ScrollReveal>

      {/* Manual Monthly Update Modal */}
      <MonthlyUpdateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
