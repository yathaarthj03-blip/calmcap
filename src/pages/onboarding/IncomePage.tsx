import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  BAND_LIMITS,
  BAND_LABEL,
  BAND_ORDER,
  BAND_SPAN,
  DEFAULT_USD_INR,
  GOAL_LABEL,
  INCOME_MAX,
  goalAmountFor,
} from '../../engine/assumptions';
import { targetMonthKey, monthLabel } from '../../engine/dates';
import { inr, parseMoney } from '../../engine/format';
import { capacityFor, consFor, reasonFor, recommendBand } from '../../engine/recommend';
import type { Band, GoalId } from '../../engine/types';

export const IncomePage: React.FC = () => {
  const navigate = useNavigate();
  const incomeState = useStore((s) => s.income);
  const activePlan = useStore((s) => s.planVersions[s.planVersions.length - 1]);
  const settings = useStore((s) => s.settings);

  // Form local state
  const [primaryStr, setPrimaryStr] = useState(
    incomeState.primary > 0 ? String(incomeState.primary) : '20000',
  );
  const [sideStr, setSideStr] = useState(
    incomeState.side > 0 ? String(incomeState.side) : '5000',
  );
  const [sideNote, setSideNote] = useState(incomeState.sideNote || '');
  const [expensesStr, setExpensesStr] = useState(
    incomeState.expenses !== undefined ? String(incomeState.expenses) : '',
  );

  const [selectedGoal, setSelectedGoal] = useState<GoalId>(activePlan.goal.id || 'TEN_LAKH');
  const [selectedBand, setSelectedBand] = useState<Band | null>(activePlan.goal.band || 'LONG');
  const [months, setMonths] = useState<number>(activePlan.goal.months || 120);

  const [isChecking, setIsChecking] = useState(false);
  const [primaryError, setPrimaryError] = useState<string | null>(null);

  // Parse numbers
  const parsedPrimary = parseMoney(primaryStr) ?? 0;
  const parsedSide = parseMoney(sideStr) ?? 0;
  const parsedExpenses = expensesStr.trim() ? parseMoney(expensesStr) ?? undefined : undefined;

  const currentGoalAmount = useMemo(
    () => goalAmountFor(selectedGoal, settings.usdInr || DEFAULT_USD_INR),
    [selectedGoal, settings.usdInr],
  );

  const capacity = useMemo(
    () => capacityFor(parsedPrimary, parsedSide, parsedExpenses, settings.capacityRatio),
    [parsedPrimary, parsedSide, parsedExpenses, settings.capacityRatio],
  );

  // Recommendation recomputes live (debounced 300ms)
  const [debouncedRec, setDebouncedRec] = useState(() =>
    recommendBand(capacity, currentGoalAmount),
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsChecking(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedRec(recommendBand(capacity, currentGoalAmount));
      setIsChecking(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [capacity, currentGoalAmount]);

  // Adjust tenure slider when band changes
  const handleBandSelect = (band: Band) => {
    setSelectedBand(band);
    setMonths(BAND_LIMITS[band].rep);
  };

  const currentStartMonth = activePlan.goal.startMonth;
  const targetM = targetMonthKey(currentStartMonth, months);
  const targetLabel = monthLabel(targetM);

  // Cons & pros for non-recommended choice
  const consData = useMemo(() => {
    if (!selectedBand) return { cons: [], pro: null };
    return consFor(selectedBand, debouncedRec.band, {
      capacity,
      goalAmount: currentGoalAmount,
      startMonth: currentStartMonth,
      evaluations: debouncedRec.evaluations,
    });
  }, [selectedBand, debouncedRec, capacity, currentGoalAmount, currentStartMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedPrimary <= 0 || parsedPrimary > INCOME_MAX) {
      setPrimaryError(`Please enter a valid monthly take-home between ₹1 and ₹${inr(INCOME_MAX)}.`);
      return;
    }
    if (!selectedBand) return;

    // Save into state store
    useStore.getState().updateIncome({
      primary: parsedPrimary,
      side: parsedSide,
      sideNote: sideNote.trim() || undefined,
      expenses: parsedExpenses,
    });

    // Update goal in active plan version (for step 3 to read)
    const currentVersions = useStore.getState().planVersions;
    const latest = currentVersions[currentVersions.length - 1];
    const updated = {
      ...latest,
      goal: {
        ...latest.goal,
        id: selectedGoal,
        amount: currentGoalAmount,
        band: selectedBand,
        months,
      },
    };
    useStore.setState({
      planVersions: [...currentVersions.slice(0, -1), updated],
    });

    // Auto-scroll to top when submitting
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/setup/savings');
  };

  const isFormValid = parsedPrimary > 0 && selectedBand !== null;
  // Yellow warning box should ONLY appear when the user selects a non-recommended / stretch goal
  const isNonRecommendedGoal = selectedGoal !== 'TEN_LAKH';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Panel 1: Income and Expenses */}
        <div className="panel p-6 sm:p-8 md:p-10 space-y-6">
          <div>
            <span className="eyebrow">Step 2 of 3</span>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink mt-1">
              Income & Monthly Capacity
            </h1>
            <p className="text-sm text-muted mt-1.5">
              Tell us what comes in each month. The advisor will size a realistic path for your goal.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="primary-income" className="label block mb-1">
                Primary monthly income (take-home in ₹) <span className="text-loss">*</span>
              </label>
              <input
                id="primary-income"
                type="text"
                inputMode="numeric"
                value={primaryStr}
                onChange={(e) => {
                  setPrimaryStr(e.target.value);
                  setPrimaryError(null);
                }}
                className="input num"
                placeholder="e.g. 20,000"
                required
              />
              {primaryError && (
                <p className="text-xs text-loss mt-1.5" role="alert">
                  {primaryError}
                </p>
              )}
              <p className="help mt-1">
                Your pocket money, student stipend, or regular monthly allowance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="side-income" className="label block mb-1">
                  Side gigs or irregular income (₹/month)
                </label>
                <input
                  id="side-income"
                  type="text"
                  inputMode="numeric"
                  value={sideStr}
                  onChange={(e) => setSideStr(e.target.value)}
                  className="input num"
                  placeholder="0"
                />
                <p className="help mt-1">
                  Freelancing or tutoring. Counted at 50% for safe planning.
                </p>
              </div>

              <div>
                <label htmlFor="side-note" className="label block mb-1">
                  What is it? (optional)
                </label>
                <input
                  id="side-note"
                  type="text"
                  maxLength={80}
                  value={sideNote}
                  onChange={(e) => setSideNote(e.target.value)}
                  className="input"
                  placeholder="e.g. Campus web design"
                />
              </div>
            </div>

            <div>
              <label htmlFor="monthly-expenses" className="label block mb-1">
                Monthly expenses (₹/month, optional)
              </label>
              <input
                id="monthly-expenses"
                type="text"
                inputMode="numeric"
                value={expensesStr}
                onChange={(e) => setExpensesStr(e.target.value)}
                className="input num"
                placeholder="Leave blank and we'll estimate"
              />
              <p className="help mt-1">
                Leave blank to estimate living expenses at 65% of reliable income (leaving 35% capacity to invest).
              </p>
            </div>

            {capacity > 0 && (
              <div className="p-3.5 rounded-ctl bg-surface-2 border border-line flex items-center justify-between text-xs">
                <span className="text-muted">Calculated investing capacity:</span>
                <span className="font-semibold text-ink num">₹{inr(capacity)} / month</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Dedicated Milestone Definition Panel */}
        <div className="panel p-6 sm:p-8 md:p-10 space-y-6">
          <div>
            <span className="eyebrow">Milestone Definition</span>
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-ink mt-1">
              What does millionaire mean to you?
            </h2>
            <p className="text-sm text-muted mt-1.5">
              Choose your target milestone. You can always grow your goal after hitting your first target.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup">
            {(['TEN_LAKH', 'ONE_CRORE', 'USD_1M'] as GoalId[]).map((id) => {
              const isSelected = selectedGoal === id;
              return (
                <button
                  type="button"
                  key={id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedGoal(id)}
                  className={`p-4 rounded-ctl border text-left transition-all relative ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-line bg-surface hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-lg text-ink">
                      {GOAL_LABEL[id]}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="text-xs text-muted mt-1 leading-normal">
                    {id === 'TEN_LAKH' && '₹10,00,000. The classic first milestone for college students & young earners.'}
                    {id === 'ONE_CRORE' && '₹1,00,00,000. The iconic Indian crore milestone.'}
                    {id === 'USD_1M' && `About ₹${(settings.usdInr || DEFAULT_USD_INR) / 10} Cr at ₹${settings.usdInr || DEFAULT_USD_INR}/US$ (not a live rate).`}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Yellow Warning Box: ONLY appears when non-recommended / stretch goal is chosen */}
          <AnimatePresence>
            {isNonRecommendedGoal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-panel bg-mid/10 border border-mid/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5 text-ink">
                    <AlertCircle className="w-5 h-5 text-mid shrink-0" />
                    <span>
                      {selectedGoal === 'ONE_CRORE'
                        ? '₹1 Crore is a stretch for your current student income. We recommend starting with ₹10 Lakh first.'
                        : 'US$ 1 Million (~₹8.8 Cr) is far above current income capacity. Start with ₹10 Lakh and grow your target later.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoal('TEN_LAKH');
                      if (debouncedRec.band) {
                        setSelectedBand(debouncedRec.band);
                        setMonths(BAND_LIMITS[debouncedRec.band].rep);
                      }
                    }}
                    className="px-3 py-1.5 rounded-ctl bg-mid text-white text-xs font-semibold shrink-0 hover:opacity-90 transition-opacity"
                  >
                    Switch to recommended goal (₹10 Lakh)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel 3: Duration Bars with Live Recommendation */}
        <div className="panel p-6 sm:p-8 md:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="eyebrow">Timeline Strategy</span>
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-ink mt-1">
                How long do you want to take?
              </h2>
            </div>
            <div className="text-xs text-muted flex items-center gap-1.5 h-4">
              {isChecking ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
                  <span>Advisor is checking…</span>
                </>
              ) : (
                <span>Click any bar to choose</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {BAND_ORDER.map((band) => {
              const isRecommended = debouncedRec.band === band;
              const isSelected = selectedBand === band;
              const ev = debouncedRec.evaluations[band];
              const reasonText = reasonFor(ev);

              return (
                <button
                  type="button"
                  key={band}
                  onClick={() => handleBandSelect(band)}
                  className={`w-full p-4 rounded-ctl border text-left transition-all ${
                    isSelected
                      ? 'bg-accent/10 border-accent ring-1 ring-accent'
                      : isRecommended
                      ? 'border-accent/60 bg-surface'
                      : 'border-line bg-surface hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-ink">
                        {BAND_LABEL[band]}
                      </span>
                      <span className="text-xs text-muted">({BAND_SPAN[band]})</span>
                    </div>

                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-on-accent">
                        <Sparkles className="w-3 h-3" />
                        <span>Recommended</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted mt-1 num">{reasonText}</p>
                </button>
              );
            })}
          </div>

          {/* Cons Panel (slides in if user chose a non-recommended bar) */}
          <AnimatePresence>
            {selectedBand && selectedBand !== debouncedRec.band && consData.cons.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-panel bg-surface-2 border border-line text-xs space-y-2">
                  <div className="font-semibold text-ink">What this choice costs</div>
                  <ul className="space-y-1.5 text-muted list-disc list-inside">
                    {consData.cons.map((c, i) => (
                      <li key={i} className="leading-relaxed">
                        {c}
                      </li>
                    ))}
                  </ul>
                  {consData.pro && (
                    <div className="pt-1 text-accent font-medium leading-relaxed">
                      Pro: {consData.pro}
                    </div>
                  )}
                  <div className="pt-1 text-muted font-medium">You can still go with it.</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exact Duration Slider (visible once a band is selected) */}
          {selectedBand && (
            <div className="mt-5 p-4 rounded-panel bg-surface border border-line">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-ink">Exact duration within this band:</span>
                <span className="font-semibold text-accent num">
                  {months} months, until {targetLabel}
                </span>
              </div>
              <input
                type="range"
                min={BAND_LIMITS[selectedBand].min}
                max={BAND_LIMITS[selectedBand].max}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="range"
                style={{
                  ['--fill' as string]: `${
                    ((months - BAND_LIMITS[selectedBand].min) /
                      (BAND_LIMITS[selectedBand].max - BAND_LIMITS[selectedBand].min)) *
                    100
                  }%`,
                }}
              />
              <div className="flex justify-between text-[11px] text-muted mt-1 num">
                <span>{BAND_LIMITS[selectedBand].min} mos</span>
                <span>{BAND_LIMITS[selectedBand].max} mos</span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full h-11 rounded-ctl bg-accent text-on-accent font-medium text-base hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            Continue to Savings & Emergency Fund
          </button>
        </div>
      </form>
    </motion.div>
  );
};
