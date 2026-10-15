import React, { useState, useMemo } from 'react';
import {
  User,
  Target,
  DollarSign,
  CalendarCheck,
  TrendingUp,
  ShieldAlert,
  Database,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  selectActivePlan,
  selectCapacity,
  selectSavingsSoFar,
} from '../../store/selectors';
import {
  CATEGORY_INFO,
  DEFAULT_USD_INR,
  BAND_LIMITS,
  goalAmountFor,
} from '../../engine/assumptions';
import { assessChange } from '../../engine/assess';
import { dayKey, monthKey, monthLabel, targetMonthKey } from '../../engine/dates';
import { futureValue, monthsToGoal } from '../../engine/finance';
import { inr, parseMoney, pct } from '../../engine/format';
import { planRange, specFromVersion } from '../../engine/plan';
import { capacityFor, recommendBand } from '../../engine/recommend';
import { stressTest } from '../../engine/replay';
import type { Band, CareerTrack, EducationLevel, GoalId, HoldingCategory, PlanVersion } from '../../engine/types';
import { Dialog } from '../../components/ui/Dialog';

type AdminTab =
  | 'profile'
  | 'goals'
  | 'income'
  | 'monthly'
  | 'investments'
  | 'promise'
  | 'data';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');

  // Store state
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const income = useStore((s) => s.income);
  const updateIncome = useStore((s) => s.updateIncome);
  const activePlan = useStore(selectActivePlan);
  const capacity = useStore(selectCapacity);
  const savingsNow = useStore(selectSavingsSoFar);
  const holdings = useStore((s) => s.holdings);
  const addHolding = useStore((s) => s.addHolding);
  const editHolding = useStore((s) => s.editHolding);
  const deleteHolding = useStore((s) => s.deleteHolding);
  const ledger = useStore((s) => s.ledger);
  const editLedgerEntry = useStore((s) => s.editLedgerEntry);
  const deleteLedgerEntry = useStore((s) => s.deleteLedgerEntry);
  const logMonthlySavings = useStore((s) => s.logMonthlySavings);
  const addPlanVersion = useStore((s) => s.addPlanVersion);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const showToast = useStore((s) => s.showToast);
  const loadDemoData = useStore((s) => s.loadDemoData);
  const resetEverything = useStore((s) => s.resetEverything);
  const importJsonState = useStore((s) => s.importJsonState);

  const currentMonthKey = monthKey(new Date());

  // ----------------------------------------------------------------------
  // Harm Assessment Confirm Dialog (Rules a-d)
  // ----------------------------------------------------------------------
  const [harmDialog, setHarmDialog] = useState<{
    open: boolean;
    reasons: string[];
    onConfirm: () => void;
  }>({ open: false, reasons: [], onConfirm: () => {} });

  const executePlanChange = (
    proposal: Omit<PlanVersion, 'version' | 'createdAt'>,
    capacityNext: number,
  ) => {
    const assessment = assessChange(activePlan, proposal, {
      savingsNow,
      currentMonth: currentMonthKey,
      capacityPrev: capacity,
      capacityNext,
    });

    if (assessment.harmful) {
      setHarmDialog({
        open: true,
        reasons: assessment.reasons,
        onConfirm: () => {
          addPlanVersion(proposal);
          showToast(`Plan updated to version ${activePlan.version + 1}`, 'warn');
          setHarmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    } else {
      addPlanVersion(proposal);
      showToast(`Plan updated to version ${activePlan.version + 1}`, 'success');
    }
  };

  // ----------------------------------------------------------------------
  // 1. Profile Tab
  // ----------------------------------------------------------------------
  const [profileName, setProfileName] = useState(profile.name);
  const [profileEmail, setProfileEmail] = useState(profile.email);
  const [eduLevel, setEduLevel] = useState<EducationLevel>(profile.education?.level || 'UNDERGRADUATE');
  const [eduField, setEduField] = useState(profile.education?.field || 'Computer Science & Engineering');
  const [eduYear, setEduYear] = useState(profile.education?.year || '2nd Year');
  const [eduTrack, setEduTrack] = useState<CareerTrack>(profile.education?.careerTrack || 'TECH_SOFTWARE');
  const [eduRole, setEduRole] = useState(profile.education?.targetRole || 'Software Engineering Intern');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim() || !eduField.trim()) {
      showToast('Name, email, and course of study cannot be empty', 'warn');
      return;
    }
    setProfile({
      name: profileName.trim(),
      email: profileEmail.trim(),
      education: {
        level: eduLevel,
        field: eduField.trim(),
        year: eduYear,
        careerTrack: eduTrack,
        targetRole: eduRole.trim() || undefined,
      },
    });
    showToast('Profile and education updated', 'success');
  };

  // ----------------------------------------------------------------------
  // 2. Goals and Duration Tab
  // ----------------------------------------------------------------------
  const [goalId, setGoalId] = useState<GoalId>(activePlan.goal.id);
  const [band, setBand] = useState<Band>(activePlan.goal.band);
  const [months, setMonths] = useState(activePlan.goal.months);
  const [monthlyAmountStr, setMonthlyAmountStr] = useState(String(activePlan.plan.monthlyAmount));
  const [stepUpPct, setStepUpPct] = useState(activePlan.plan.stepUpPct);
  const [usdInr, setUsdInr] = useState(settings.usdInr || DEFAULT_USD_INR);
  const [capacityRatio, setCapacityRatio] = useState(settings.capacityRatio || 0.35);

  const targetGoalAmt = useMemo(() => goalAmountFor(goalId, usdInr), [goalId, usdInr]);
  const recResult = useMemo(
    () => recommendBand(capacity, targetGoalAmt),
    [capacity, targetGoalAmt],
  );

  const handleGoalSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseMoney(monthlyAmountStr);
    if (!parsedAmt || parsedAmt <= 0) {
      showToast('Please enter a valid monthly amount', 'warn');
      return;
    }

    setSettings({ usdInr, capacityRatio });

    const proposal: Omit<PlanVersion, 'version' | 'createdAt'> = {
      reason: 'USER_EDIT',
      goal: {
        ...activePlan.goal,
        id: goalId,
        amount: targetGoalAmt,
        band,
        months,
      },
      plan: {
        ...activePlan.plan,
        monthlyAmount: parsedAmt,
        stepUpPct,
        tier: 'CUSTOM',
      },
    };

    executePlanChange(proposal, capacity);
  };

  // ----------------------------------------------------------------------
  // 3. Income Tab (+ Rise recommendation dialog / Fall harm dialog)
  // ----------------------------------------------------------------------
  const [primaryIncomeStr, setPrimaryIncomeStr] = useState(String(income.primary));
  const [sideIncomeStr, setSideIncomeStr] = useState(String(income.side));
  const [sideNoteText, setSideNoteText] = useState(income.sideNote || '');
  const [raisePctStr, setRaisePctStr] = useState(String(income.expectedRaisePct || ''));
  const [raiseDateStr, setRaiseDateStr] = useState(income.expectedRaiseDate || '');

  const [incomeRiseDialog, setIncomeRiseDialog] = useState<{
    open: boolean;
    finishSoonerMonths: number;
    finishSoonerAmount: number;
    lighterLoadAmount: number;
    nextCapacity: number;
  }>({
    open: false,
    finishSoonerMonths: 0,
    finishSoonerAmount: 0,
    lighterLoadAmount: 0,
    nextCapacity: 0,
  });

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextPri = parseMoney(primaryIncomeStr);
    const nextSide = parseMoney(sideIncomeStr) ?? 0;
    if (nextPri === null || nextPri <= 0) {
      showToast('Please enter a valid primary income', 'warn');
      return;
    }

    const { percentChange } = updateIncome({
      primary: nextPri,
      side: nextSide,
      sideNote: sideNoteText.trim() || undefined,
      expectedRaisePct: parseMoney(raisePctStr) ?? undefined,
      expectedRaiseDate: raiseDateStr.trim() || undefined,
    });

    const nextCap = capacityFor(nextPri, nextSide, income.expenses, settings.capacityRatio);

    // If income rises 5% or more, show recommendation dialog
    if (percentChange >= 5) {
      const currentShare = capacity > 0 ? activePlan.plan.monthlyAmount / capacity : 0.65;
      const finishSoonerAmt = Math.round(nextCap * currentShare);
      const shorterMonths = monthsToGoal({
        monthly: finishSoonerAmt,
        goal: activePlan.goal.amount,
        annualRate: 9.6,
        existing: savingsNow,
      });

      const lighterLoadAmt = planRange({
        ...specFromVersion(activePlan),
        existing: savingsNow,
      }).base;

      setIncomeRiseDialog({
        open: true,
        finishSoonerMonths: Number.isFinite(shorterMonths) ? shorterMonths : activePlan.goal.months,
        finishSoonerAmount: finishSoonerAmt,
        lighterLoadAmount: lighterLoadAmt,
        nextCapacity: nextCap,
      });
    } else {
      showToast('Income updated', 'success');
    }
  };

  // ----------------------------------------------------------------------
  // 4. Monthly Update Tab
  // ----------------------------------------------------------------------
  const [entryMonth, setEntryMonth] = useState(currentMonthKey);
  const [entryAmountStr, setEntryAmountStr] = useState(String(activePlan.plan.monthlyAmount));
  const [entryHoldingId, setEntryHoldingId] = useState<string | 'CASH'>('CASH');
  const [editLedgerItem, setEditLedgerItem] = useState<{ id: string; amount: string; holdingId: string } | null>(null);
  const [renameHoldingItem, setRenameHoldingItem] = useState<{ id: string; name: string } | null>(null);

  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseMoney(entryAmountStr);
    if (amt === null || amt < 0) {
      showToast('Please enter a valid amount', 'warn');
      return;
    }
    logMonthlySavings({
      month: entryMonth,
      amount: amt,
      holdingId: entryHoldingId,
    });
    showToast(`Logged ${inr(amt)} for ${entryMonth}`, 'success');
  };

  // ----------------------------------------------------------------------
  // 5. Investments / Holdings Tab
  // ----------------------------------------------------------------------
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [holdingName, setHoldingName] = useState('');
  const [holdingCat, setHoldingCat] = useState<HoldingCategory>('INDEX_FUND');
  const [holdingStart, setHoldingStart] = useState(dayKey(new Date()));
  const [holdingAmtStr, setHoldingAmtStr] = useState('10000');
  const [holdingRateStr, setHoldingRateStr] = useState('11.0');

  // Holding delete confirmation dialog (in-app, no window.confirm)
  const [deleteHoldingConfirm, setDeleteHoldingConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: '', name: '' });

  const holdingCategoryInfo = CATEGORY_INFO[holdingCat];

  // "How this helps your goal" card
  const newHoldingImpact = useMemo(() => {
    const amt = parseMoney(holdingAmtStr) ?? 0;
    const rate = parseFloat(holdingRateStr) || holdingCategoryInfo.basePct;
    const goalMonths = activePlan.goal.months;
    const projVal = futureValue({ monthly: 0, months: goalMonths, annualRate: rate, existing: amt });
    const shareOfGoal = (projVal / Math.max(1, activePlan.goal.amount)) * 100;

    // Months sooner
    const withoutHolding = monthsToGoal({
      monthly: activePlan.plan.monthlyAmount,
      goal: activePlan.goal.amount,
      annualRate: 9.6,
      existing: savingsNow,
    });
    const withHolding = monthsToGoal({
      monthly: activePlan.plan.monthlyAmount,
      goal: activePlan.goal.amount,
      annualRate: 9.6,
      existing: savingsNow + amt,
    });
    const monthsSooner = Math.max(0, withoutHolding - withHolding);

    const fitCheck =
      holdingCategoryInfo.bucket === 'long' && activePlan.goal.band === 'LONG'
        ? 'This is a long-term holding and fits your Long plan.'
        : 'This is short-to-mid money; fine as a safe cushion for your plan.';

    return { projVal, shareOfGoal, monthsSooner, fitCheck };
  }, [
    holdingAmtStr,
    holdingRateStr,
    holdingCategoryInfo,
    activePlan,
    savingsNow,
  ]);

  const handleCreateHolding = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseMoney(holdingAmtStr);
    const rate = parseFloat(holdingRateStr);
    if (!holdingName.trim() || amt === null || isNaN(rate)) {
      showToast('Please check all investment inputs', 'warn');
      return;
    }

    addHolding({
      name: holdingName.trim(),
      category: holdingCat,
      bucket: holdingCategoryInfo.bucket,
      startDate: holdingStart,
      initialAmount: amt,
      annualReturnPct: rate,
    });

    setShowAddHolding(false);
    setHoldingName('');
    showToast(`Added investment: ${holdingName}`, 'success');
  };

  // ----------------------------------------------------------------------
  // 6. Promise and Panic Budget Tab
  // ----------------------------------------------------------------------
  const [adminPanicBudget, setAdminPanicBudget] = useState(
    activePlan.plan.panicBudget || 15000,
  );
  const [adminPromise, setAdminPromise] = useState(
    activePlan.plan.promise || 'keep my SIP running and do nothing else',
  );

  const liveStress = useMemo(
    () => stressTest({ allocation: activePlan.plan.allocation, monthlyAmount: activePlan.plan.monthlyAmount, existing: savingsNow }, adminPanicBudget),
    [activePlan.plan.allocation, activePlan.plan.monthlyAmount, savingsNow, adminPanicBudget],
  );

  const handlePromiseSave = (e: React.FormEvent) => {
    e.preventDefault();
    const proposal: Omit<PlanVersion, 'version' | 'createdAt'> = {
      reason: 'USER_EDIT',
      goal: activePlan.goal,
      plan: {
        ...activePlan.plan,
        panicBudget: adminPanicBudget,
        promise: adminPromise.trim(),
      },
    };
    executePlanChange(proposal, capacity);
  };

  // ----------------------------------------------------------------------
  // 7. Data Tab (Export, Import, Demo Seed, Reset)
  // ----------------------------------------------------------------------
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState<string | null>(null);

  const handleExportJson = () => {
    const rawState = useStore.getState();
    const blob = new Blob([JSON.stringify(rawState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calmcap-backup-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  };

  const handleImportPreview = (text: string) => {
    setImportJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.profile?.name && parsed.planVersions) {
        setImportPreview(
          `Valid backup for ${parsed.profile.name}. Contains ${parsed.planVersions.length} plan version(s), ${parsed.holdings?.length || 0} holding(s), and ${parsed.ledger?.length || 0} ledger entry(s).`,
        );
      } else {
        setImportPreview('Warning: JSON does not appear to be a valid CalmCap backup.');
      }
    } catch {
      setImportPreview('Invalid JSON text');
    }
  };

  const handleApplyImport = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const res = importJsonState(parsed);
      if (res.success) {
        showToast('Backup restored successfully', 'success');
        setImportJsonText('');
        setImportPreview(null);
      } else {
        showToast(res.error || 'Import failed', 'warn');
      }
    } catch {
      showToast('Failed to parse JSON', 'warn');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
          Admin & Plan Management
        </h1>
        <p className="text-sm text-muted mt-1">
          Review, modify, or stress test all financial parameters. All changes update your dashboard instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sub-nav */}
        <div className="space-y-1">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'goals', label: 'Goals & Duration', icon: Target },
            { id: 'income', label: 'Income & Raise', icon: DollarSign },
            { id: 'monthly', label: 'Monthly Updates', icon: CalendarCheck },
            { id: 'investments', label: 'Investments', icon: TrendingUp },
            { id: 'promise', label: 'Panic & Promise', icon: ShieldAlert },
            { id: 'data', label: 'Data & Backup', icon: Database },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as AdminTab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-ctl text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-accent text-on-accent font-semibold'
                  : 'text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[1.75]" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="md:col-span-3 panel p-6">
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
              <h2 className="text-lg font-semibold text-ink">Your Profile & Education Context</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1">Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label block mb-1">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-line/60 space-y-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-accent block">
                  Education & Career Track
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1">Degree / Level</label>
                    <select
                      value={eduLevel}
                      onChange={(e) => setEduLevel(e.target.value as EducationLevel)}
                      className="input"
                    >
                      <option value="UNDERGRADUATE">Undergraduate (Bachelor's)</option>
                      <option value="POSTGRADUATE">Postgraduate (Master's)</option>
                      <option value="DIPLOMA">Diploma / Polytechnic</option>
                      <option value="HIGH_SCHOOL">High School</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="label block mb-1">Current Year / Stage</label>
                    <select
                      value={eduYear}
                      onChange={(e) => setEduYear(e.target.value)}
                      className="input"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="Final Year">Final Year</option>
                      <option value="Recent Graduate">Recent Graduate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1">Field of Study / Major</label>
                    <input
                      type="text"
                      value={eduField}
                      onChange={(e) => setEduField(e.target.value)}
                      className="input"
                      placeholder="e.g. Computer Science, Commerce"
                      required
                    />
                  </div>
                  <div>
                    <label className="label block mb-1">Career Track</label>
                    <select
                      value={eduTrack}
                      onChange={(e) => setEduTrack(e.target.value as CareerTrack)}
                      className="input"
                    >
                      <option value="TECH_SOFTWARE">Tech & Software Engineering</option>
                      <option value="FINANCE_COMMERCE">Finance, Banking & Accounting</option>
                      <option value="BUSINESS_MARKETING">Business, Marketing & Operations</option>
                      <option value="DESIGN_CREATIVE">Design, UI/UX & Creative</option>
                      <option value="GENERAL_CORPORATE">Corporate Careers & Research</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label block mb-1">Target Role or Internship Goal</label>
                  <input
                    type="text"
                    value={eduRole}
                    onChange={(e) => setEduRole(e.target.value)}
                    className="input"
                    placeholder="e.g. Software Engineering Intern, Financial Analyst"
                  />
                  <p className="help mt-1">
                    Used to curate job preparation tasks, internship application windows, and freelance opportunities on your To-Do Calendar.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
                >
                  Save profile & education
                </button>
              </div>
            </form>
          )}

          {/* 2. Goals & Duration Tab */}
          {activeTab === 'goals' && (
            <form onSubmit={handleGoalSave} className="space-y-6">
              <h2 className="text-lg font-semibold text-ink">Goals, Duration & Plan Versions</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1">Target Milestone</label>
                  <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value as GoalId)}
                    className="input"
                  >
                    <option value="TEN_LAKH">₹10 lakh (₹10,00,000)</option>
                    <option value="ONE_CRORE">₹1 crore (₹1,00,00,000)</option>
                    <option value="USD_1M">$1 million (USD to INR)</option>
                  </select>
                </div>

                <div>
                  <label className="label block mb-1">Duration Band</label>
                  <select
                    value={band}
                    onChange={(e) => {
                      const b = e.target.value as Band;
                      setBand(b);
                      setMonths(BAND_LIMITS[b].rep);
                    }}
                    className="input"
                  >
                    <option value="SOONER">Sooner (Up to 1 year)</option>
                    <option value="MID">Mid range (1 to 5 years)</option>
                    <option value="LONG">Long term (Over 5 years)</option>
                  </select>
                </div>

                <div>
                  <label className="label block mb-1">Exact Months ({months} mos)</label>
                  <input
                    type="number"
                    min={BAND_LIMITS[band].min}
                    max={BAND_LIMITS[band].max}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="input num"
                    required
                  />
                  <p className="help mt-1">
                    Finishes around {monthLabel(targetMonthKey(activePlan.goal.startMonth, months))}
                  </p>
                </div>

                <div>
                  <label className="label block mb-1">Monthly Contribution (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyAmountStr}
                    onChange={(e) => setMonthlyAmountStr(e.target.value)}
                    className="input num"
                    required
                  />
                  <p className="help mt-1">
                    Recommended for this goal: <strong className="num text-ink">{inr(recResult.evaluations[band].required)}</strong>
                  </p>
                </div>

                <div>
                  <label className="label block mb-1">Annual Step-Up (%/year)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={stepUpPct}
                    onChange={(e) => setStepUpPct(Number(e.target.value))}
                    className="input num"
                  />
                  <p className="help mt-1">Raise your monthly savings by this % every 12 months</p>
                </div>

                <div>
                  <label className="label block mb-1">USD/INR Exchange Rate (for $1M)</label>
                  <input
                    type="number"
                    min={50}
                    max={200}
                    value={usdInr}
                    onChange={(e) => setUsdInr(Number(e.target.value))}
                    className="input num"
                  />
                </div>

                <div>
                  <label className="label block mb-1">Savings Capacity Ratio (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={80}
                    value={Math.round(capacityRatio * 100)}
                    onChange={(e) => setCapacityRatio(Number(e.target.value) / 100)}
                    className="input num"
                  />
                  <p className="help mt-1">Default recommended fraction of disposable income</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
                >
                  Apply plan changes
                </button>
              </div>
            </form>
          )}

          {/* 3. Income Tab */}
          {activeTab === 'income' && (
            <form onSubmit={handleIncomeSubmit} className="space-y-4 max-w-md">
              <h2 className="text-lg font-semibold text-ink">Income & Increments</h2>
              <div>
                <label className="label block mb-1">Primary Monthly Income (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={primaryIncomeStr}
                  onChange={(e) => setPrimaryIncomeStr(e.target.value)}
                  className="input num"
                  required
                />
              </div>

              <div>
                <label className="label block mb-1">Side Gigs / Irregular Income (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={sideIncomeStr}
                  onChange={(e) => setSideIncomeStr(e.target.value)}
                  className="input num"
                />
              </div>

              <div>
                <label className="label block mb-1">Side Gig Description</label>
                <input
                  type="text"
                  value={sideNoteText}
                  onChange={(e) => setSideNoteText(e.target.value)}
                  className="input"
                  placeholder="e.g. Design tutoring"
                />
              </div>

              <div className="pt-2 border-t border-line">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted mb-2">
                  Expected Increment (Optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs block mb-1">Raise %</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={raisePctStr}
                      onChange={(e) => setRaisePctStr(e.target.value)}
                      className="input num text-sm"
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <label className="label text-xs block mb-1">Effective Date</label>
                    <input
                      type="date"
                      value={raiseDateStr}
                      onChange={(e) => setRaiseDateStr(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
              >
                Update income
              </button>
            </form>
          )}

          {/* 4. Monthly Updates Tab */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-ink">Monthly Savings Ledger</h2>

              {/* Add form */}
              <form onSubmit={handleAddLedger} className="p-4 rounded-panel bg-surface-2 border border-line grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="label text-xs block mb-1">Month</label>
                  <input
                    type="month"
                    value={entryMonth}
                    onChange={(e) => setEntryMonth(e.target.value)}
                    className="input text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs block mb-1">Amount (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={entryAmountStr}
                    onChange={(e) => setEntryAmountStr(e.target.value)}
                    className="input num text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs block mb-1">Holding</label>
                  <select
                    value={entryHoldingId}
                    onChange={(e) => setEntryHoldingId(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="CASH">Cash Reserve</option>
                    {holdings.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="h-11 px-4 rounded-ctl bg-accent text-on-accent text-sm font-medium hover:opacity-90"
                >
                  Log entry
                </button>
              </form>

              {/* Table of last 12 entries */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Where</th>
                      <th className="py-2.5 px-3">Logged Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {ledger.slice(-12).reverse().map((entry) => {
                      const hName =
                        entry.holdingId === 'CASH'
                          ? 'Cash Reserve'
                          : holdings.find((h) => h.id === entry.holdingId)?.name || 'Deleted Holding (CASH)';
                      const isCurrentOrPrev =
                        entry.month === currentMonthKey ||
                        entry.month === monthKey(new Date(Date.now() - 30 * 86400000));

                      return (
                        <tr key={entry.id} className="hover:bg-surface-2/40">
                          <td className="py-2.5 px-3 font-semibold text-ink">{entry.month}</td>
                          <td className="py-2.5 px-3 font-medium text-ink num">{inr(entry.amount)}</td>
                          <td className="py-2.5 px-3 text-muted">{hName}</td>
                          <td className="py-2.5 px-3 text-muted">{entry.loggedAt.slice(0, 10)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isCurrentOrPrev ? (
                              <button
                                onClick={() =>
                                  setEditLedgerItem({
                                    id: entry.id,
                                    amount: String(entry.amount),
                                    holdingId: entry.holdingId,
                                  })
                                }
                                className="p-1 rounded text-muted hover:text-accent mr-2"
                                title="Edit entry"
                              >
                                <Edit2 className="w-3.5 h-3.5 inline" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => deleteLedgerEntry(entry.id)}
                              className="p-1 rounded text-muted hover:text-loss"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Investments / Holdings Tab */}
          {activeTab === 'investments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Your Holdings</h2>
                  <p className="text-xs text-muted">
                    Your real assets compounding daily. Every holding maps to a risk bucket.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddHolding(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add investment</span>
                </button>
              </div>

              {/* Add holding form modal */}
              <Dialog
                open={showAddHolding}
                onOpenChange={setShowAddHolding}
                title="Add New Investment Holding"
                maxWidth="max-w-md"
              >
                <form onSubmit={handleCreateHolding} className="space-y-4 pt-2">
                  <div>
                    <label className="label text-xs block mb-1">Holding Name</label>
                    <input
                      type="text"
                      value={holdingName}
                      onChange={(e) => setHoldingName(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. HDFC Liquid Fund"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs block mb-1">Category</label>
                      <select
                        value={holdingCat}
                        onChange={(e) => {
                          const cat = e.target.value as HoldingCategory;
                          setHoldingCat(cat);
                          setHoldingRateStr(String(CATEGORY_INFO[cat].basePct));
                        }}
                        className="input text-sm"
                      >
                        {Object.entries(CATEGORY_INFO).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label text-xs block mb-1">Auto-assigned Bucket</label>
                      <div className="input text-sm flex items-center bg-surface-2 font-medium capitalize text-ink">
                        {holdingCategoryInfo.bucket}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs block mb-1">Initial Amount (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={holdingAmtStr}
                        onChange={(e) => setHoldingAmtStr(e.target.value)}
                        className="input num text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs block mb-1">Expected Return (%/yr)</label>
                      <input
                        type="text"
                        value={holdingRateStr}
                        onChange={(e) => setHoldingRateStr(e.target.value)}
                        className="input num text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={holdingStart}
                      onChange={(e) => setHoldingStart(e.target.value)}
                      className="input text-sm"
                      required
                    />
                  </div>

                  {/* How this helps your goal card */}
                  <div className="p-3.5 rounded-ctl bg-surface-2 border border-line text-xs space-y-1.5">
                    <div className="font-semibold text-ink flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>How this helps your goal</span>
                    </div>
                    <div className="text-muted leading-relaxed">
                      Projected to grow to <strong className="num text-ink">{inr(newHoldingImpact.projVal)}</strong> by target date ({pct(newHoldingImpact.shareOfGoal)} of your goal).
                    </div>
                    <div className="text-muted leading-relaxed">
                      Brings your goal approximately <strong className="num text-accent">{newHoldingImpact.monthsSooner} month(s)</strong> sooner.
                    </div>
                    <div className="text-accent text-[11px] font-medium pt-1">
                      {newHoldingImpact.fitCheck}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddHolding(false)}
                      className="px-3 py-1.5 rounded-ctl border border-line text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-ctl bg-accent text-on-accent text-xs font-semibold"
                    >
                      Save holding
                    </button>
                  </div>
                </form>
              </Dialog>

              {/* Holdings list */}
              <div className="space-y-3">
                {holdings.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-panel bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink">{h.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-surface-2 text-muted">
                          {h.bucket}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-1 space-x-3 num">
                        <span>Initial: {inr(h.initialAmount)}</span>
                        <span>Rate: {h.annualReturnPct}%</span>
                        <span>Started: {h.startDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() =>
                          setRenameHoldingItem({
                            id: h.id,
                            name: h.name,
                          })
                        }
                        className="p-1.5 rounded text-muted hover:text-ink hover:bg-surface-2"
                        title="Rename"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteHoldingConfirm({ open: true, id: h.id, name: h.name })
                        }
                        className="p-1.5 rounded text-muted hover:text-loss hover:bg-surface-2"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Holding delete confirmation modal (no window.confirm) */}
              <Dialog
                open={deleteHoldingConfirm.open}
                onOpenChange={(open) =>
                  setDeleteHoldingConfirm((prev) => ({ ...prev, open }))
                }
                title="Delete Investment Holding"
                maxWidth="max-w-sm"
              >
                <div className="space-y-3 pt-1 text-xs">
                  <p className="text-muted leading-relaxed">
                    Are you sure you want to delete <strong className="text-ink">{deleteHoldingConfirm.name}</strong>? Any past ledger contributions allocated to it will be safely reassigned to your Cash Reserve so your savings total remains intact.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteHoldingConfirm((prev) => ({ ...prev, open: false }))
                      }
                      className="px-3 py-1.5 rounded-ctl border border-line text-ink font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteHolding(deleteHoldingConfirm.id);
                        setDeleteHoldingConfirm({ open: false, id: '', name: '' });
                        showToast('Holding deleted and contributions reassigned to Cash', 'info');
                      }}
                      className="px-3 py-1.5 rounded-ctl bg-loss text-white font-semibold"
                    >
                      Confirm delete
                    </button>
                  </div>
                </div>
              </Dialog>
            </div>
          )}

          {/* 6. Promise & Panic Budget Tab */}
          {activeTab === 'promise' && (
            <form onSubmit={handlePromiseSave} className="space-y-5 max-w-lg">
              <h2 className="text-lg font-semibold text-ink">Panic Budget & Written Promise</h2>

              <div>
                <label className="label block mb-1">Panic Budget (₹)</label>
                <input
                  type="number"
                  min={2000}
                  max={60000}
                  step={1000}
                  value={adminPanicBudget}
                  onChange={(e) => setAdminPanicBudget(Number(e.target.value))}
                  className="input num"
                  required
                />
                <p className="help mt-1">
                  How far below what you put in you could watch your money sit without selling.
                </p>
              </div>

              <div className={`p-4 rounded-ctl text-xs border ${
                liveStress.fits ? 'bg-accent/10 border-accent/20' : 'bg-loss/10 border-loss/20'
              }`}>
                <div className="font-semibold text-ink">
                  In a 2008-style crash, your plan would sit {inr(liveStress.fall)} below what you put in ({liveStress.fits ? 'inside' : 'exceeds'} your budget).
                </div>
              </div>

              <div>
                <label className="label block mb-1">Your Written Promise</label>
                <textarea
                  maxLength={80}
                  rows={2}
                  value={adminPromise}
                  onChange={(e) => setAdminPromise(e.target.value)}
                  className="input h-auto py-2"
                />
                <p className="help mt-1">
                  Shown back to you during market fall simulations on the Fallback page.
                </p>
              </div>

              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
              >
                Update promise & budget
              </button>
            </form>
          )}

          {/* 7. Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-ink">Data & State Management</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export */}
                <div className="p-4 rounded-panel bg-surface border border-line space-y-2">
                  <div className="font-semibold text-sm text-ink">Export State</div>
                  <p className="text-xs text-muted">
                    Download complete plan state, ledger, holdings, and calendar as a JSON file.
                  </p>
                  <button
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-ctl bg-surface-2 border border-line hover:bg-surface-2/80 text-ink"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>
                </div>

                {/* Load Demo Data */}
                <div className="p-4 rounded-panel bg-surface border border-line space-y-2">
                  <div className="font-semibold text-sm text-ink">Load Demo Data</div>
                  <p className="text-xs text-muted">
                    Populate Aarav's realistic ₹10L goal with 7 months of past contributions for hackathon judging.
                  </p>
                  <button
                    onClick={() => {
                      loadDemoData();
                      showToast('Demo data loaded for Aarav', 'success');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Load demo data</span>
                  </button>
                </div>
              </div>

              {/* Import JSON */}
              <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
                <div className="font-semibold text-sm text-ink">Import Backup JSON</div>
                <textarea
                  rows={3}
                  value={importJsonText}
                  onChange={(e) => handleImportPreview(e.target.value)}
                  placeholder="Paste CalmCap backup JSON here…"
                  className="input h-auto py-2 font-mono text-xs"
                />
                {importPreview && (
                  <div className="text-xs p-2.5 rounded bg-surface-2 text-ink border border-line">
                    {importPreview}
                  </div>
                )}
                {importPreview && !importPreview.startsWith('Invalid') && (
                  <button
                    onClick={handleApplyImport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Apply restored state</span>
                  </button>
                )}
              </div>

              {/* Reset Everything */}
              <div className="p-4 rounded-panel border border-loss/30 bg-loss/5 space-y-2">
                <div className="font-semibold text-sm text-loss">Reset Everything</div>
                <p className="text-xs text-muted">
                  Wipes all local state, holdings, and plan history. Requires typing RESET to confirm.
                </p>
                <button
                  onClick={() => {
                    setResetInput('');
                    setResetConfirmOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-ctl bg-loss text-white hover:opacity-90"
                >
                  Reset application state
                </button>
              </div>

              {/* Reset Confirmation Modal */}
              <Dialog
                open={resetConfirmOpen}
                onOpenChange={setResetConfirmOpen}
                title="Confirm Reset"
                maxWidth="max-w-sm"
              >
                <div className="space-y-3 pt-2 text-xs">
                  <p className="text-muted leading-relaxed">
                    This will permanently delete all records and restart the onboarding flow. Type <strong className="text-loss">RESET</strong> below to proceed:
                  </p>
                  <input
                    type="text"
                    value={resetInput}
                    onChange={(e) => setResetInput(e.target.value)}
                    className="input uppercase font-bold text-center"
                    placeholder="RESET"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(false)}
                      className="px-3 py-1.5 rounded-ctl border border-line"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={resetInput !== 'RESET'}
                      onClick={() => {
                        resetEverything();
                        setResetConfirmOpen(false);
                        window.location.hash = '#/welcome';
                        showToast('Application state reset', 'info');
                      }}
                      className="px-3 py-1.5 rounded-ctl bg-loss text-white font-semibold disabled:opacity-40"
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Harm Confirmation Dialog */}
      <Dialog
        open={harmDialog.open}
        onOpenChange={(open) => setHarmDialog((prev) => ({ ...prev, open }))}
        title="Harm Warning: Risks in this Change"
        maxWidth="max-w-md"
      >
        <div className="space-y-3 pt-1 text-xs">
          <div className="p-3 rounded-ctl bg-loss/10 border border-loss/20 text-loss flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">The advisor detected risks with this plan modification:</div>
              <ul className="list-disc list-inside space-y-1 pt-1">
                {harmDialog.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setHarmDialog((prev) => ({ ...prev, open: false }))}
              className="px-4 py-2 text-xs font-semibold rounded-ctl border border-line text-ink hover:bg-surface-2"
            >
              Cancel change
            </button>
            <button
              type="button"
              onClick={harmDialog.onConfirm}
              className="px-4 py-2 text-xs font-semibold rounded-ctl bg-loss text-white hover:opacity-90"
            >
              Apply anyway
            </button>
          </div>
        </div>
      </Dialog>

      {/* Income Rise Option Dialog */}
      <Dialog
        open={incomeRiseDialog.open}
        onOpenChange={(open) => setIncomeRiseDialog((prev) => ({ ...prev, open }))}
        title="Your Income Went Up!"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-muted leading-relaxed">
            Your reliable monthly income grew by 5% or more. You can use this additional cash flow to accelerate your timeline or lighten your monthly burden:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                const proposal: Omit<PlanVersion, 'version' | 'createdAt'> = {
                  reason: 'INCOME_CHANGE',
                  goal: {
                    ...activePlan.goal,
                    months: incomeRiseDialog.finishSoonerMonths,
                  },
                  plan: {
                    ...activePlan.plan,
                    monthlyAmount: incomeRiseDialog.finishSoonerAmount,
                    tier: 'CUSTOM',
                  },
                };
                addPlanVersion(proposal);
                setIncomeRiseDialog((prev) => ({ ...prev, open: false }));
                showToast('Plan updated to finish sooner!', 'success');
              }}
              className="p-3.5 rounded-ctl border border-accent bg-accent/5 hover:bg-accent/10 text-left space-y-1 transition-colors"
            >
              <div className="font-bold text-accent">Finish Sooner</div>
              <div className="text-ink font-medium num">
                {inr(incomeRiseDialog.finishSoonerAmount)}/mo
              </div>
              <div className="text-[11px] text-muted">
                Reaches goal in {incomeRiseDialog.finishSoonerMonths} months instead of {activePlan.goal.months}.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const proposal: Omit<PlanVersion, 'version' | 'createdAt'> = {
                  reason: 'INCOME_CHANGE',
                  goal: activePlan.goal,
                  plan: {
                    ...activePlan.plan,
                    monthlyAmount: incomeRiseDialog.lighterLoadAmount,
                    tier: 'CUSTOM',
                  },
                };
                addPlanVersion(proposal);
                setIncomeRiseDialog((prev) => ({ ...prev, open: false }));
                showToast('Plan adjusted for a lighter load!', 'success');
              }}
              className="p-3.5 rounded-ctl border border-line bg-surface hover:bg-surface-2 text-left space-y-1 transition-colors"
            >
              <div className="font-bold text-ink">Lighter Load</div>
              <div className="text-ink font-medium num">
                {inr(incomeRiseDialog.lighterLoadAmount)}/mo
              </div>
              <div className="text-[11px] text-muted">
                Keeps your original target date while saving a smaller share of your income.
              </div>
            </button>
          </div>
        </div>
      </Dialog>

      {/* Edit Ledger Entry Dialog */}
      <Dialog
        open={Boolean(editLedgerItem)}
        onOpenChange={(open) => {
          if (!open) setEditLedgerItem(null);
        }}
        title="Edit Ledger Entry"
        maxWidth="max-w-sm"
      >
        {editLedgerItem && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseMoney(editLedgerItem.amount);
              if (parsed !== null && parsed >= 0) {
                editLedgerEntry(editLedgerItem.id, parsed, editLedgerItem.holdingId);
                setEditLedgerItem(null);
                showToast('Ledger entry updated', 'success');
              }
            }}
            className="space-y-4 pt-1"
          >
            <div>
              <label className="label block mb-1">Contribution Amount (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                value={editLedgerItem.amount}
                onChange={(e) =>
                  setEditLedgerItem({ ...editLedgerItem, amount: e.target.value })
                }
                className="input num"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditLedgerItem(null)}
                className="px-3 py-1.5 text-xs rounded-ctl border border-line text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Rename Holding Dialog */}
      <Dialog
        open={Boolean(renameHoldingItem)}
        onOpenChange={(open) => {
          if (!open) setRenameHoldingItem(null);
        }}
        title="Rename Holding"
        maxWidth="max-w-sm"
      >
        {renameHoldingItem && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renameHoldingItem.name.trim()) {
                editHolding(renameHoldingItem.id, { name: renameHoldingItem.name.trim() });
                setRenameHoldingItem(null);
                showToast('Holding renamed', 'success');
              }
            }}
            className="space-y-4 pt-1"
          >
            <div>
              <label className="label block mb-1">Holding Name</label>
              <input
                type="text"
                value={renameHoldingItem.name}
                onChange={(e) =>
                  setRenameHoldingItem({ ...renameHoldingItem, name: e.target.value })
                }
                className="input"
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameHoldingItem(null)}
                className="px-3 py-1.5 text-xs rounded-ctl border border-line text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90"
              >
                Rename
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};
