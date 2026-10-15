import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  History,
  Flame,
} from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../../store/useStore';
import {
  selectActivePlan,
  selectCapacity,
  selectPlanSpec,
  selectSavingsBreakdown,
} from '../../store/selectors';
import { SCENARIOS, scenarioById, replay, fitToPanicBudget } from '../../engine/replay';
import { fallbackCore, proposalVersion } from '../../engine/fallback';
import { monthKey, monthLabel, targetMonthKey } from '../../engine/dates';
import { inr, inrCompact, pct } from '../../engine/format';
import { corridorSeries } from '../../engine/plan';
import type { Scenario } from '../../engine/types';
import { CorridorChart } from '../../components/ui/CorridorChart';

export const FallbackPage: React.FC = () => {
  const activePlan = useStore(selectActivePlan);
  const spec = useStore(selectPlanSpec);
  const capacity = useStore(selectCapacity);
  const calamity = useStore((s) => s.calamity);
  const calamityHistory = useStore((s) => s.calamityHistory);
  const startCalamity = useStore((s) => s.startCalamity);
  const resolveCalamity = useStore((s) => s.resolveCalamity);
  const markCalamityRecovered = useStore((s) => s.markCalamityRecovered);
  const addPlanVersion = useStore((s) => s.addPlanVersion);
  const undoPlanVersion = useStore((s) => s.undoPlanVersion);
  const showToast = useStore((s) => s.showToast);

  const currentM = monthKey(new Date());

  // 1. Identify active scenario (or default to 2008 crash for previewing)
  const activeScenarioId = calamity?.scenarioId || 'crash2008';
  const scenario: Scenario = useMemo(() => scenarioById(activeScenarioId), [activeScenarioId]);

  // Current savings before shock
  const rawSavings = useStore(selectSavingsBreakdown);

  // Current stage: 1 to 4
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(calamity ? 2 : 1);

  // Fallback engine calculations
  const fallbackData = useMemo(() => {
    return fallbackCore({
      spec,
      startMonth: activePlan.goal.startMonth,
      currentMonth: currentM,
      savingsByBucket: rawSavings.byBucket,
      capacity,
      scenario,
    });
  }, [spec, activePlan.goal.startMonth, currentM, rawSavings.byBucket, capacity, scenario]);

  // User chosen option: A (hold date) or B (hold amount)
  const [chosenOption, setChosenOption] = useState<'A' | 'B'>(fallbackData.recommended);

  // Decline flow sub-state: 'CONSEQUENCES' | 'FINAL_DECISION'
  const [decliningState, setDecliningState] = useState<null | 'CONSEQUENCES' | 'FINAL'>(null);
  const [understandRiskChecked, setUnderstandRiskChecked] = useState(false);

  // Time-machine Replay series
  const replayResult = useMemo(() => {
    return replay(scenario, activePlan.plan.allocation, activePlan.plan.monthlyAmount, rawSavings.total);
  }, [scenario, activePlan.plan.allocation, activePlan.plan.monthlyAmount, rawSavings.total]);

  // Fallback proposal version
  const fallbackProposal = useMemo(() => {
    // If panic budget breached, fit allocation
    let allocation = activePlan.plan.allocation;
    let monthly = chosenOption === 'A' ? fallbackData.optionA.monthlyAmount : fallbackData.optionB.monthlyAmount;

    if (activePlan.plan.panicBudget && replayResult.fallAtTrough > activePlan.plan.panicBudget) {
      const fit = fitToPanicBudget(
        { ...spec, monthlyAmount: monthly },
        activePlan.plan.panicBudget,
      );
      allocation = fit.allocation;
      monthly = fit.monthlyAmount;
    }

    return proposalVersion(activePlan, fallbackData, chosenOption, currentM, allocation, monthly);
  }, [activePlan, fallbackData, chosenOption, currentM, replayResult.fallAtTrough, spec]);

  // Corridor points for proposed fallback plan
  const fallbackChartPoints = useMemo(() => {
    const pSpec = {
      ...spec,
      allocation: fallbackProposal.plan.allocation,
      monthlyAmount: fallbackProposal.plan.monthlyAmount,
      months: fallbackProposal.goal.months,
      existing: fallbackProposal.goal.existing || 0,
    };
    return corridorSeries(pSpec, currentM);
  }, [spec, fallbackProposal, currentM]);

  // -------------------------------------------------------------
  // Decisions Handlers
  // -------------------------------------------------------------
  const handleAcceptFallback = () => {
    const newVer = addPlanVersion(fallbackProposal);
    resolveCalamity('ACCEPTED', newVer);
    showToast('Fallback plan applied successfully', 'undo', () => {
      undoPlanVersion();
      showToast('Restored previous plan version', 'info');
    });
    setStage(4);
  };

  const handleStartDecline = () => {
    setDecliningState('CONSEQUENCES');
  };

  const handleConfirmKeepCurrent = () => {
    resolveCalamity('DECLINED_KEPT_PLAN');
    showToast('Kept current plan. Plan marked under stress.', 'warn');
    setDecliningState(null);
    setStage(4);
  };

  const panicBudget = activePlan.plan.panicBudget || 15000;
  const fallAmount = replayResult.fallAtTrough;
  const isInsideBudget = fallAmount <= panicBudget;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
          Fallback Plans & Market Stress Test
        </h1>
        <p className="text-sm text-muted mt-1">
          Experience market drawdowns safely, verify your Panic Budget, and decide on a course correction with zero guesswork.
        </p>
      </div>

      {/* Calamity Lab (Demo Control) */}
      <div className="p-4 sm:p-5 rounded-panel bg-surface border-2 border-dashed border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-mid" />
            <span className="font-semibold text-sm text-ink">Calamity Lab (Demo Control)</span>
          </div>
          <span className="text-xs text-muted font-medium">Simulated market conditions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SCENARIOS.map((sc) => {
            const isActive = calamity?.scenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => {
                  startCalamity(sc.id);
                  setStage(1);
                  setDecliningState(null);
                }}
                className={`p-3 rounded-ctl border text-left transition-colors ${
                  isActive
                    ? 'border-loss bg-loss/10 font-semibold text-loss'
                    : 'border-line bg-surface hover:bg-surface-2 text-ink'
                }`}
              >
                <div className="text-xs font-bold">{sc.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{sc.short}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guided 4-Stage Flow */}
      <div className="panel p-6 sm:p-8 space-y-6">
        {/* Stage Tabs Navigation */}
        <div className="flex items-center border-b border-line pb-4 overflow-x-auto gap-4 sm:gap-8 text-xs font-semibold">
          {[
            { s: 1, label: '1. What Happened' },
            { s: 2, label: '2. Impact on You' },
            { s: 3, label: '3. Fallback Plan' },
            { s: 4, label: '4. Decision' },
          ].map(({ s, label }) => (
            <button
              key={s}
              onClick={() => setStage(s as 1 | 2 | 3 | 4)}
              className={`pb-1 border-b-2 transition-colors whitespace-nowrap ${
                stage === s
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---------------- STAGE 1: What happened ---------------- */}
        {stage === 1 && (
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-loss/10 text-loss">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Simulated Scenario: {scenario.name}</span>
            </div>

            <h2 className="text-xl font-display font-semibold text-ink">
              Understanding the Market Event
            </h2>

            <div className="space-y-2 text-sm text-muted leading-relaxed">
              {scenario.story.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <p className="text-xs text-muted/80 pt-2 border-t border-line">
                * Note: This is an educational replay with simulated historical numbers to test your emotional and financial resilience.
              </p>
            </div>

            <button
              onClick={() => setStage(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90 transition-opacity"
            >
              <span>See what it does to you</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- STAGE 2: What it does to you ---------------- */}
        {stage === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-semibold text-ink">
                What this fall does to your portfolio
              </h2>
              <p className="text-xs text-muted">
                How your money reacts in rupees across buckets during this simulated drawdown.
              </p>
            </div>

            {/* Before vs After by Bucket */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-ctl bg-surface-2 border border-line">
                <div className="text-[10px] uppercase font-bold text-muted">Total Portfolio</div>
                <div className="text-lg font-bold text-loss num mt-1">
                  {inr(fallbackData.afterTotal)}
                </div>
                <div className="text-xs text-muted line-through num">
                  was {inr(fallbackData.beforeTotal)}
                </div>
              </div>

              <div className="p-3.5 rounded-ctl bg-surface border border-line">
                <div className="text-[10px] uppercase font-bold text-safe">Safe Bucket (0% fall)</div>
                <div className="text-lg font-bold text-ink num mt-1">
                  {inr(fallbackData.after.safe)}
                </div>
                <div className="text-xs text-muted">Holds completely steady</div>
              </div>

              <div className="p-3.5 rounded-ctl bg-surface border border-line">
                <div className="text-[10px] uppercase font-bold text-mid">Mid Bucket</div>
                <div className="text-lg font-bold text-ink num mt-1">
                  {inr(fallbackData.after.mid)}
                </div>
                <div className="text-xs text-muted">Down {pct(scenario.shocks.mid * 100)}</div>
              </div>

              <div className="p-3.5 rounded-ctl bg-surface border border-line">
                <div className="text-[10px] uppercase font-bold text-accent">Growth Bucket</div>
                <div className="text-lg font-bold text-ink num mt-1">
                  {inr(fallbackData.after.long)}
                </div>
                <div className="text-xs text-muted">Down {pct(scenario.shocks.long * 100)}</div>
              </div>
            </div>

            {/* Replay Chart (Time-machine) */}
            <div className="p-4 rounded-panel bg-surface border border-line space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Replay: Market Fall & Recovery Cycle</span>
                <span className="text-muted">Green: Worth · Dashed: Total put in · Red: Under water</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={replayResult.points} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 3" opacity={0.6} />
                    <XAxis dataKey="k" stroke="rgb(var(--muted))" fontSize={10} tickFormatter={(m) => `Mo ${m}`} minTickGap={30} />
                    <YAxis stroke="rgb(var(--muted))" fontSize={10} tickFormatter={(v) => inrCompact(v)} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="rounded-ctl bg-ink p-2 text-[11px] text-surface shadow">
                            <div>Month {p.k}</div>
                            <div className="text-accent num">Worth: {inr(p.worth)}</div>
                            <div className="text-muted num">Total put in: {inr(p.putIn)}</div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={replayResult.troughMonth} stroke="rgb(var(--loss))" strokeDasharray="3 3" label={{ value: 'Trough', fill: 'rgb(var(--loss))', fontSize: 10 }} />
                    <Line type="monotone" dataKey="putIn" stroke="rgb(var(--muted))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="worth" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="under" stroke="rgb(var(--loss))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panic Budget Comparison & Promise shown back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-ctl border text-xs space-y-1.5 ${
                isInsideBudget ? 'bg-accent/10 border-accent/30' : 'bg-loss/10 border-loss/30'
              }`}>
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Panic Budget Test</span>
                </div>
                <div className="text-muted leading-relaxed">
                  Your panic budget was <strong className="num text-ink">{inr(panicBudget)}</strong>.
                  At the deepest point of this fall, your plan sits about <strong className="num text-loss">{inr(fallAmount)}</strong> below what you put in. That is{' '}
                  <strong className={isInsideBudget ? 'text-accent' : 'text-loss'}>
                    {isInsideBudget ? 'inside' : 'past'}
                  </strong>{' '}
                  your comfort budget.
                </div>
              </div>

              <div className="p-4 rounded-ctl bg-surface-2 border border-line text-xs space-y-1.5">
                <div className="font-semibold text-ink">Your Promise (from onboarding)</div>
                <blockquote className="italic text-muted border-l-2 border-accent pl-2.5 py-0.5">
                  "{activePlan.plan.promise || 'keep my SIP running and do nothing else'}"
                </blockquote>
                <div className="text-[11px] text-muted">
                  If you do nothing, your goal finishes in{' '}
                  <strong className="text-ink">
                    {fallbackData.doNothing.finishMonth
                      ? monthLabel(fallbackData.doNothing.finishMonth)
                      : 'over 50 years'}
                  </strong>{' '}
                  ({fallbackData.doNothing.delayMonths} mos delay).
                </div>
              </div>
            </div>

            <button
              onClick={() => setStage(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
            >
              <span>Review your recommended fallback plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------- STAGE 3: Your fallback plan ---------------- */}
        {stage === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-semibold text-ink">
                Your Adjusted Fallback Plan
              </h2>
              <p className="text-xs text-muted">
                Calculated automatically to either preserve your original deadline or maintain your monthly budget.
              </p>
            </div>

            {/* Option A vs Option B selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setChosenOption('A')}
                className={`p-4 rounded-panel border text-left transition-all ${
                  chosenOption === 'A'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">Option A: Hold the Date</span>
                  {fallbackData.recommended === 'A' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent text-on-accent">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-xl font-display font-bold text-ink num mt-1">
                  {inr(fallbackData.optionA.monthlyAmount)}
                  <span className="text-xs font-normal text-muted">/mo</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Finishes on time in {monthLabel(fallbackData.optionA.finishMonth)}. Uses {pct(fallbackData.optionA.capacityShare * 100)} of your capacity.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChosenOption('B')}
                className={`p-4 rounded-panel border text-left transition-all ${
                  chosenOption === 'B'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-line bg-surface hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">Option B: Hold the Amount</span>
                  {fallbackData.recommended === 'B' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent text-on-accent">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-xl font-display font-bold text-ink num mt-1">
                  {inr(fallbackData.optionB.monthlyAmount)}
                  <span className="text-xs font-normal text-muted">/mo</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Keeps monthly amount, finishes in {monthLabel(fallbackData.optionB.finishMonth)} ({fallbackData.optionB.months} mos).
                </div>
              </button>
            </div>

            {/* Side by side comparison: Current vs Proposed */}
            <div className="p-4 rounded-panel bg-surface-2 border border-line space-y-3 text-xs">
              <div className="font-semibold text-ink">Side-by-Side Comparison</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-muted border-r border-line pr-4">
                  <div className="font-semibold text-ink">Current Plan (v{activePlan.version})</div>
                  <div>Monthly: <strong className="num text-ink">{inr(activePlan.plan.monthlyAmount)}</strong></div>
                  <div>Target: <strong className="num text-ink">{monthLabel(fallbackData.targetMonth)}</strong></div>
                  <div>Growth share: <strong className="num text-ink">{activePlan.plan.allocation.long}%</strong></div>
                </div>

                <div className="space-y-1 text-muted">
                  <div className="font-semibold text-accent">Proposed Fallback (v{activePlan.version + 1})</div>
                  <div>Monthly: <strong className="num text-accent">{inr(fallbackProposal.plan.monthlyAmount)}</strong></div>
                  <div>Target: <strong className="num text-accent">{monthLabel(targetMonthKey(currentM, fallbackProposal.goal.months))}</strong></div>
                  <div>Growth share: <strong className="num text-accent">{fallbackProposal.plan.allocation.long}%</strong></div>
                </div>
              </div>
            </div>

            {/* New Corridor Chart */}
            <div className="p-4 rounded-panel bg-surface border border-line space-y-2">
              <div className="text-xs font-semibold text-ink">New Projected Corridor</div>
              <CorridorChart data={fallbackChartPoints} goalAmount={spec.goalAmount} height={200} />
            </div>

            {/* Stage 3 Two Buttons */}
            {!decliningState && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptFallback}
                  className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90 transition-opacity"
                >
                  Yes, switch to this plan
                </button>
                <button
                  type="button"
                  onClick={handleStartDecline}
                  className="flex-1 px-5 py-2.5 text-sm font-semibold rounded-ctl border border-line text-ink hover:bg-surface-2 transition-colors"
                >
                  No, keep my current plan
                </button>
              </div>
            )}

            {/* Decline Consequences Section */}
            {decliningState === 'CONSEQUENCES' && (
              <div className="p-5 rounded-panel bg-loss/5 border border-loss/30 space-y-4 text-xs">
                <div className="font-semibold text-loss text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>What could happen if you don't adjust your plan</span>
                </div>

                <ul className="space-y-2 text-ink">
                  <li>
                    • <strong>Projected Delay:</strong> Without adjustment, you reach your goal in{' '}
                    <strong className="num text-loss">
                      {fallbackData.doNothing.finishMonth
                        ? monthLabel(fallbackData.doNothing.finishMonth)
                        : 'over 50 years'}
                    </strong>{' '}
                    ({fallbackData.doNothing.delayMonths} extra months of delay).
                  </li>
                  <li>
                    • <strong>Shortfall at Target Date:</strong> You would face a shortfall of{' '}
                    <strong className="num text-loss">
                      {inr(fallbackData.doNothing.shortfallAtTarget)}
                    </strong>{' '}
                    at your original goal date.
                  </li>
                  {!isInsideBudget && (
                    <li>
                      • <strong>Panic Budget Breach:</strong> Your loss remains beyond your ₹{inr(panicBudget)} threshold, putting you at risk of panic selling during future dips.
                    </li>
                  )}
                </ul>

                <div className="pt-2 border-t border-loss/20 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-ink font-medium">
                    <input
                      type="checkbox"
                      checked={understandRiskChecked}
                      onChange={(e) => setUnderstandRiskChecked(e.target.checked)}
                      className="rounded text-loss"
                    />
                    <span>I understand the risks of keeping an unadjusted plan during a drawdown.</span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleAcceptFallback}
                      className="px-4 py-2 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
                    >
                      Switch to fallback plan instead
                    </button>
                    <button
                      type="button"
                      disabled={!understandRiskChecked}
                      onClick={handleConfirmKeepCurrent}
                      className="px-4 py-2 text-xs font-semibold rounded-ctl bg-loss text-white hover:opacity-90 disabled:opacity-40"
                    >
                      Keep my current plan anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- STAGE 4: Decision Summary ---------------- */}
        {stage === 4 && (
          <div className="space-y-4 max-w-md">
            <div className="p-4 rounded-ctl bg-accent/10 border border-accent/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
              <div>
                <div className="font-semibold text-sm text-ink">Simulation Concluded</div>
                <div className="text-xs text-muted">
                  Your decision has been recorded into the decision history below.
                </div>
              </div>
            </div>

            <p className="text-xs text-muted">
              You can return to Dashboard or Roadmap to see updated countdown numbers, or test another scenario from the Calamity Lab above.
            </p>
          </div>
        )}
      </div>

      {/* Decision History List */}
      <div className="p-5 rounded-panel bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            <h3 className="font-semibold text-sm text-ink">Fallback Decision History</h3>
          </div>
          {calamityHistory.some((c) => c.decision === 'DECLINED_KEPT_PLAN' && !c.recoveredAt) && (
            <button
              onClick={() => {
                markCalamityRecovered();
                showToast('Marked market fall recovered', 'success');
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Mark market as recovered
            </button>
          )}
        </div>

        {calamityHistory.length === 0 ? (
          <p className="text-xs text-muted">No simulated falls tested yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {calamityHistory.slice().reverse().map((ch) => (
              <div
                key={ch.id}
                className="p-3 rounded bg-surface-2/60 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-semibold text-ink">
                    {scenarioById(ch.scenarioId).name}
                  </span>
                  <span className="text-muted ml-2">({ch.startedAt.slice(0, 10)})</span>
                  <div className="text-[11px] text-muted mt-0.5">
                    Decision:{' '}
                    <strong className="text-ink">
                      {ch.decision === 'ACCEPTED' ? 'Switched to Fallback Plan' : 'Kept Current Plan'}
                    </strong>
                  </div>
                </div>

                <div className="text-right text-[11px]">
                  {ch.recoveredAt ? (
                    <span className="text-accent font-semibold">Recovered</span>
                  ) : ch.decision === 'DECLINED_KEPT_PLAN' ? (
                    <span className="text-loss font-semibold">Under stress</span>
                  ) : (
                    <span className="text-muted">Applied v{ch.versionAfter}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
