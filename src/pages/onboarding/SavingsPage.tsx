import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  ALLOCATIONS,
  BAND_SPAN,
  PANIC_DEFAULT,
  PANIC_MAX,
  PANIC_MIN,
  PANIC_STEP,
  POCKET_MONEY,
} from '../../engine/assumptions';
import { targetMonthKey, monthLabel } from '../../engine/dates';
import { inr, inrCompact, pct } from '../../engine/format';
import {
  corridorSeries,
  outcomeAt,
  planRange,
  type PlanRange,
} from '../../engine/plan';
import { capacityFor } from '../../engine/recommend';
import { fitToPanicBudget, stressTest } from '../../engine/replay';
import type { Allocation, Band, PlanSpec, Tier } from '../../engine/types';
import { CorridorChart } from '../../components/ui/CorridorChart';

const PROMISE_OPTIONS = [
  'keep my SIP running and do nothing else',
  'put in a little extra if I can',
  'pause my SIP until it recovers',
  'sell everything and wait in cash',
];

export const SavingsPage: React.FC = () => {
  const navigate = useNavigate();
  const incomeState = useStore((s) => s.income);
  const activePlan = useStore((s) => s.planVersions[s.planVersions.length - 1]);
  const settings = useStore((s) => s.settings);

  // If user navigated directly here without step 2 data, redirect back
  if (incomeState.primary <= 0) {
    navigate('/setup/income');
  }

  const band = (activePlan.goal.band || 'LONG') as Band;
  const months = activePlan.goal.months || 120;
  const startMonth = activePlan.goal.startMonth;
  const goalAmount = activePlan.goal.amount || 1_000_000;
  const existing = activePlan.goal.existing || 0;

  const capacity = useMemo(
    () => capacityFor(incomeState.primary, incomeState.side, incomeState.expenses, settings.capacityRatio),
    [incomeState.primary, incomeState.side, incomeState.expenses, settings.capacityRatio],
  );

  const [currentAllocation, setCurrentAllocation] = useState<Allocation>({
    ...ALLOCATIONS[band],
  });

  // Calculate Lean, Recommended, Cushion
  const specNoAmount = useMemo(
    () => ({
      goalAmount,
      months,
      existing,
      stepUpPct: 0,
      allocation: currentAllocation,
      band,
    }),
    [goalAmount, months, existing, currentAllocation, band],
  );

  const range: PlanRange = useMemo(() => planRange(specNoAmount), [specNoAmount]);

  const [tier, setTier] = useState<Tier>('RECOMMENDED');
  const [monthlyAmount, setMonthlyAmount] = useState<number>(range.base);

  // Slider bounds
  const sliderMin = 500;
  const sliderMax = Math.max(Math.round(capacity * 1.2), Math.round(range.base * 1.5), 10000);

  // Panic Budget state
  const [panicBudget, setPanicBudget] = useState<number>(PANIC_DEFAULT);
  const [selectedPromise, setSelectedPromise] = useState<string>(PROMISE_OPTIONS[0]);
  const [customPromise, setCustomPromise] = useState<string>('');

  const activePromise = customPromise.trim() || selectedPromise;

  // Sizing plan spec
  const currentSpec: PlanSpec = useMemo(
    () => ({
      ...specNoAmount,
      monthlyAmount,
    }),
    [specNoAmount, monthlyAmount],
  );

  // Outcome & corridor series
  const outcome = useMemo(() => outcomeAt(currentSpec), [currentSpec]);
  const chartPoints = useMemo(
    () => corridorSeries(currentSpec, startMonth),
    [currentSpec, startMonth],
  );

  // Stress test against 2008 crash
  const stress = useMemo(
    () => stressTest({ allocation: currentAllocation, monthlyAmount, existing }, panicBudget),
    [currentAllocation, monthlyAmount, existing, panicBudget],
  );

  // Handle tier clicks
  const selectTier = (t: Tier) => {
    setTier(t);
    if (t === 'LEAN') setMonthlyAmount(range.min);
    if (t === 'RECOMMENDED') setMonthlyAmount(range.base);
    if (t === 'CUSHION') setMonthlyAmount(range.max);
  };

  const handleSliderChange = (val: number) => {
    setMonthlyAmount(val);
    if (val === range.min) setTier('LEAN');
    else if (val === range.base) setTier('RECOMMENDED');
    else if (val === range.max) setTier('CUSHION');
    else setTier('CUSTOM');
  };

  // Fit plan to panic budget
  const handleFitPanicBudget = () => {
    const fit = fitToPanicBudget(currentSpec, panicBudget);
    setCurrentAllocation(fit.allocation);
    setMonthlyAmount(fit.monthlyAmount);
    setTier('CUSTOM');
  };

  const finishDateLabel = monthLabel(targetMonthKey(startMonth, months));

  const handleBuildDashboard = () => {
    // Save chosen plan into active version
    const versions = useStore.getState().planVersions;
    const current = versions[versions.length - 1];
    const updated = {
      ...current,
      plan: {
        ...current.plan,
        monthlyAmount,
        tier,
        stepUpPct: 0,
        allocation: currentAllocation,
        panicBudget,
        promise: activePromise,
      },
    };
    useStore.setState({
      planVersions: [...versions.slice(0, -1), updated],
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/loading');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="panel p-6 sm:p-8 space-y-8"
    >
      <div>
        <span className="eyebrow">Step 3 of 3</span>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink mt-1">
          Your savings plan
        </h1>
        <p className="text-sm font-medium text-accent mt-1 num">
          Save for {months} months, until {finishDateLabel}.
        </p>
      </div>

      {/* 1. Three Plan Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(
          [
            { t: 'LEAN', label: 'Lean', amt: range.min, desc: 'If markets do well' },
            { t: 'RECOMMENDED', label: 'Recommended', amt: range.base, desc: 'Base return scenario' },
            { t: 'CUSHION', label: 'Cushion', amt: range.max, desc: 'If markets disappoint' },
          ] as const
        ).map(({ t, label, amt, desc }) => {
          const isSelected = tier === t;
          const share = capacity > 0 ? (amt / capacity) * 100 : 0;
          return (
            <button
              type="button"
              key={t}
              onClick={() => selectTier(t)}
              className={`p-4 rounded-ctl border text-left transition-all ${
                isSelected
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {label}
                </span>
                {t === 'RECOMMENDED' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-xl font-display font-bold text-ink mt-1 num">
                {inr(amt)}
                <span className="text-xs font-normal text-muted">/mo</span>
              </div>
              <div className="text-xs text-muted mt-1">
                {desc} · {pct(share)} capacity
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Amount Slider */}
      <div className="p-4 sm:p-5 rounded-panel bg-surface-2 border border-line space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Monthly contribution amount:</span>
          <span className="text-2xl font-display font-bold text-accent num">
            {inr(monthlyAmount)}
          </span>
        </div>

        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={250}
          value={monthlyAmount}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="range"
          style={{
            ['--fill' as string]: `${((monthlyAmount - sliderMin) / (sliderMax - sliderMin)) * 100}%`,
          }}
        />

        <div className="flex justify-between text-xs text-muted num">
          <span>Min: {inr(sliderMin)}</span>
          <span>Max: {inr(sliderMax)}</span>
        </div>
      </div>

      {/* 3. What you would get + Corridor Chart */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-ink">What you could get</h3>
          <div className="text-xs">
            {outcome.status === 'ON_TARGET' && (
              <span className="text-accent font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> On target for {inrCompact(goalAmount)}
              </span>
            )}
            {outcome.status === 'AHEAD' && (
              <span className="text-accent font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Ahead by {inr(outcome.gap)}
              </span>
            )}
            {outcome.status === 'BEHIND' && (
              <span className="text-loss font-semibold">
                Behind by {inr(Math.abs(outcome.gap))} · Finishes in{' '}
                {outcome.finishMonths < 600 ? `${outcome.finishMonths} mos` : 'over 50 yrs'}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-panel bg-surface border border-line">
          <CorridorChart data={chartPoints} goalAmount={goalAmount} height={220} />
        </div>
      </div>

      {/* 4. Where to save it (by duration) */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-ink">Where your money goes</h3>
        <p className="text-xs text-muted">
          Recommended categories based on your {BAND_SPAN[band].toLowerCase()} plan. We recommend categories, never brands.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Safe slice */}
          {currentAllocation.safe > 0 && (
            <div className="p-4 rounded-ctl border border-line bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-safe uppercase tracking-wider">
                  Safe Bucket ({currentAllocation.safe}%)
                </span>
                <span className="text-sm font-bold text-ink num">
                  {inr(Math.round((monthlyAmount * currentAllocation.safe) / 100))}
                </span>
              </div>
              <div className="font-semibold text-sm text-ink">
                {band === 'SOONER' ? 'Savings & short FDs' : 'Liquid & emergency funds'}
              </div>
              <div className="text-xs text-muted space-y-1 pt-1 border-t border-line/60">
                <div><strong>Can it fall?</strong> No nominal capital loss.</div>
                <div><strong>Can I get out?</strong> High liquidity, 1-2 days.</div>
                <div><strong>Cost:</strong> Zero to 0.25% expense ratio.</div>
              </div>
            </div>
          )}

          {/* Mid slice */}
          {currentAllocation.mid > 0 && (
            <div className="p-4 rounded-ctl border border-line bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-mid uppercase tracking-wider">
                  Mid Bucket ({currentAllocation.mid}%)
                </span>
                <span className="text-sm font-bold text-ink num">
                  {inr(Math.round((monthlyAmount * currentAllocation.mid) / 100))}
                </span>
              </div>
              <div className="font-semibold text-sm text-ink">
                Fixed deposits & debt funds
              </div>
              <div className="text-xs text-muted space-y-1 pt-1 border-t border-line/60">
                <div><strong>Can it fall?</strong> Mild swings with interest rates.</div>
                <div><strong>Can I get out?</strong> Fixed maturity or small exit load.</div>
                <div><strong>Cost:</strong> Negligible to 0.5% yearly.</div>
              </div>
            </div>
          )}

          {/* Long slice */}
          {currentAllocation.long > 0 && (
            <div className="p-4 rounded-ctl border border-line bg-surface space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                  Growth Bucket ({currentAllocation.long}%)
                </span>
                <span className="text-sm font-bold text-ink num">
                  {inr(Math.round((monthlyAmount * currentAllocation.long) / 100))}
                </span>
              </div>
              <div className="font-semibold text-sm text-ink">
                Broad index funds (SIP)
              </div>
              <div className="text-xs text-muted space-y-1 pt-1 border-t border-line/60">
                <div><strong>Can it fall?</strong> Yes, 30%+ in rare crashes.</div>
                <div><strong>Can I get out?</strong> Daily liquidity on exchanges.</div>
                <div><strong>Cost:</strong> 0.05% to 0.20% direct index fee.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. How to save: 3 short tips */}
      <div className="p-4 rounded-panel bg-surface-2 border border-line space-y-2 text-xs">
        <div className="font-semibold text-ink">Three rules to protect this plan</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-muted">
          <div>
            <strong className="text-ink block">1. Pay yourself first</strong>
            Automate your contribution on the 1st of every month before discretionary spending.
          </div>
          <div>
            <strong className="text-ink block">2. Keep a cash cushion</strong>
            Maintain a small emergency pool in savings so unexpected expenses never touch your SIP.
          </div>
          <div>
            <strong className="text-ink block">3. Step up annually</strong>
            Raise your monthly amount slightly each year as pocket money or gigs grow.
          </div>
        </div>
      </div>

      {/* 6. Panic Budget (USP) */}
      <div className="p-5 rounded-panel border-2 border-line bg-surface space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-ctl bg-loss/10 text-loss shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">
              The Panic Budget (Our signature test)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Before investing, state in rupees how far below what you put in you could watch your money sit in a bad year without selling.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-ink">Your panic tolerance threshold:</span>
            <span className="text-lg font-display font-bold text-loss num">
              {inr(panicBudget)}
            </span>
          </div>
          <input
            type="range"
            min={PANIC_MIN}
            max={PANIC_MAX}
            step={PANIC_STEP}
            value={panicBudget}
            onChange={(e) => setPanicBudget(Number(e.target.value))}
            className="range"
            style={{
              ['--fill' as string]: `${((panicBudget - PANIC_MIN) / (PANIC_MAX - PANIC_MIN)) * 100}%`,
            }}
          />
          <div className="flex justify-between text-[11px] text-muted mt-1 num">
            <span>₹2,000</span>
            <span>About {(panicBudget / POCKET_MONEY).toFixed(1)} months of pocket money</span>
            <span>₹60,000</span>
          </div>
        </div>

        {/* Stress test verdict */}
        <div className={`p-3.5 rounded-ctl text-xs border ${
          stress.fits
            ? 'bg-accent/10 border-accent/30 text-ink'
            : 'bg-loss/10 border-loss/30 text-ink'
        }`}>
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            {stress.fits ? (
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-loss shrink-0" />
            )}
            <span>
              In a fall like 2008, your plan would sit about {inr(stress.fall)} below what you put in. That is {stress.fits ? 'inside' : 'over'} your budget.
            </span>
          </div>
          {!stress.fits && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted text-[11px]">
                You can reduce risk to fit your panic budget without guessing.
              </span>
              <button
                type="button"
                onClick={handleFitPanicBudget}
                className="px-3 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90 shrink-0"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                Fit my plan to my budget
              </button>
            </div>
          )}
        </div>

        {/* Written Promise */}
        <div className="pt-2 border-t border-line">
          <label className="label block mb-1">
            If my investments drop 30%, I will…
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            {PROMISE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => {
                  setSelectedPromise(opt);
                  setCustomPromise('');
                }}
                className={`p-2.5 rounded-ctl border text-left text-xs transition-colors ${
                  selectedPromise === opt && !customPromise
                    ? 'border-accent bg-accent/5 font-semibold text-accent'
                    : 'border-line hover:bg-surface-2 text-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <input
            type="text"
            maxLength={80}
            value={customPromise}
            onChange={(e) => setCustomPromise(e.target.value)}
            className="input text-xs"
            placeholder="Or type your own one-line promise (max 80 chars)"
          />
          <p className="help mt-1 text-[11px]">
            This promise is shown back to you at the worst market moments on the Fallback page.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleBuildDashboard}
          className="w-full h-11 rounded-ctl bg-accent text-on-accent font-medium text-base hover:opacity-95 transition-opacity"
        >
          Build my dashboard
        </button>
      </div>
    </motion.div>
  );
};
