import { ALLOCATIONS } from '../engine/assumptions';
import { addMonthsKey, dayKey, localStamp, monthKey } from '../engine/dates';
import type {
  Calamity,
  DayEntry,
  Holding,
  Income,
  IncomeChange,
  LedgerEntry,
  Milestone,
  PlanVersion,
  Profile,
  Settings,
} from '../engine/types';

export interface CorridorState {
  profile: Profile;
  income: Income;
  incomeHistory: IncomeChange[];
  planVersions: PlanVersion[];
  holdings: Holding[];
  ledger: LedgerEntry[];
  calendar: Record<string, DayEntry>; // keyed by yyyy-MM-dd
  milestones: Milestone[];
  calamity: Calamity | null;
  calamityHistory: Calamity[];
  settings: Settings;
  storageWarning: boolean;
  activeToast: { id: string; message: string; type?: 'info' | 'success' | 'warn' | 'undo'; onUndo?: () => void } | null;
}

export function createInitialState(asOf: Date = new Date()): CorridorState {
  const currentM = monthKey(asOf);
  const todayD = dayKey(asOf);
  const nowStamp = localStamp(asOf);

  return {
    profile: {
      name: '',
      email: '',
      createdAt: nowStamp,
    },
    income: {
      primary: 0,
      side: 0,
    },
    incomeHistory: [],
    planVersions: [
      {
        version: 1,
        createdAt: nowStamp,
        reason: 'ONBOARDING',
        goal: {
          id: 'TEN_LAKH',
          amount: 1_000_000,
          band: 'LONG',
          months: 120,
          startMonth: currentM,
          existing: 0,
        },
        plan: {
          monthlyAmount: 5109,
          tier: 'RECOMMENDED',
          stepUpPct: 0,
          allocation: { ...ALLOCATIONS.LONG },
          panicBudget: 15000,
          promise: 'keep my SIP running and do nothing else',
        },
      },
    ],
    holdings: [
      {
        id: 'h-opening',
        name: 'Opening savings',
        category: 'SAVINGS_ACCOUNT',
        bucket: 'safe',
        startDate: todayD,
        initialAmount: 0,
        annualReturnPct: 3.0,
      },
    ],
    ledger: [],
    calendar: {},
    milestones: [],
    calamity: null,
    calamityHistory: [],
    settings: {
      usdInr: 88,
      theme: 'system',
      sidebarCollapsed: false,
      capacityRatio: 0.35,
      onboardingComplete: false,
    },
    storageWarning: false,
    activeToast: null,
  };
}

export function createDemoState(asOf: Date = new Date()): CorridorState {
  const todayD = dayKey(asOf);
  const currentM = monthKey(asOf);
  // Aarav started 7 months ago
  const startM = addMonthsKey(currentM, -7);

  const initialHoldings: Holding[] = [
    {
      id: 'h-1',
      name: 'Kotak Savings Reserve',
      category: 'SAVINGS_ACCOUNT',
      bucket: 'safe',
      startDate: `${startM}-01`,
      initialAmount: 12000,
      annualReturnPct: 3.5,
    },
    {
      id: 'h-2',
      name: 'HDFC 2-Year Fixed Deposit',
      category: 'FIXED_DEPOSIT',
      bucket: 'mid',
      startDate: `${startM}-01`,
      initialAmount: 15000,
      annualReturnPct: 7.2,
    },
    {
      id: 'h-3',
      name: 'Nifty 50 Index Fund Direct',
      category: 'INDEX_FUND',
      bucket: 'long',
      startDate: `${startM}-01`,
      initialAmount: 8000,
      annualReturnPct: 12.0,
    },
  ];

  // 7 months of contributions slightly ahead and behind
  const monthlyAmounts = [5109, 5500, 4800, 6000, 5200, 5109, 6500];
  const ledger: LedgerEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const m = addMonthsKey(startM, i + 1);
    const amt = monthlyAmounts[i];
    const targetHolding = i % 2 === 0 ? 'h-3' : 'h-2';
    ledger.push({
      id: `led-${m}`,
      month: m,
      amount: amt,
      holdingId: targetHolding,
      incomeAtTime: 25000,
      loggedAt: `${m}-05T10:30:00`,
    });
  }

  // Pre-seed calendar items around today
  const calendar: Record<string, DayEntry> = {
    [todayD]: {
      date: todayD,
      title: 'Monthly Plan Check-in',
      note: 'Review recent pocket money and check if any side gigs came through.',
      reminderTime: '18:00',
      reminderFired: false,
      tasks: [
        { id: 't-1', text: 'Transfer monthly SIP allocation to fund account', done: true },
        { id: 't-2', text: 'Log monthly savings into Corridor ledger', done: false },
        { id: 't-3', text: 'Check college textbook budget', done: false },
      ],
      meetings: [
        { id: 'm-1', title: 'Campus finance club meeting', time: '16:00' },
      ],
      reminders: [
        { id: 'r-1', title: 'Verify SIP auto-debit success', time: '11:00', fired: true },
        { id: 'r-2', title: 'Review quote of the day', time: '20:00', fired: false },
      ],
    },
  };

  const initialMilestones: Milestone[] = [
    {
      id: 'ms-q1',
      index: 1,
      quarterEnd: `${addMonthsKey(startM, 3)}-30`,
      targetValue: 25000,
      achievedAt: `${addMonthsKey(startM, 3)}-15T14:00:00`,
      seenCelebration: true,
    },
    {
      id: 'ms-q2',
      index: 2,
      quarterEnd: `${addMonthsKey(startM, 6)}-30`,
      targetValue: 55000,
      achievedAt: `${addMonthsKey(startM, 6)}-20T18:00:00`,
      seenCelebration: true,
    },
    {
      id: 'ms-q3',
      index: 3,
      quarterEnd: `${addMonthsKey(startM, 9)}-30`,
      targetValue: 88000,
    },
    {
      id: 'ms-q4',
      index: 4,
      quarterEnd: `${addMonthsKey(startM, 12)}-31`,
      targetValue: 125000,
    },
  ];

  return {
    profile: {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@college.edu',
      createdAt: `${startM}-01T09:00:00`,
      education: {
        level: 'UNDERGRADUATE',
        field: 'Computer Science & Engineering',
        year: '2nd Year',
        careerTrack: 'TECH_SOFTWARE',
        targetRole: 'Software Engineer / Full-Stack Intern',
      },
    },
    income: {
      primary: 20000,
      side: 5000,
      sideNote: 'Campus tutoring & web design gig',
    },
    incomeHistory: [
      {
        id: 'inc-1',
        effectiveDate: `${addMonthsKey(startM, 3)}-01`,
        primary: 20000,
        side: 5000,
      },
    ],
    planVersions: [
      {
        version: 1,
        createdAt: `${startM}-01T09:30:00`,
        reason: 'ONBOARDING',
        goal: {
          id: 'TEN_LAKH',
          amount: 1_000_000,
          band: 'LONG',
          months: 120,
          startMonth: startM,
          existing: 35000,
        },
        plan: {
          monthlyAmount: 5109,
          tier: 'RECOMMENDED',
          stepUpPct: 0,
          allocation: { ...ALLOCATIONS.LONG },
          panicBudget: 15000,
          promise: 'keep my SIP running and do nothing else',
        },
      },
    ],
    holdings: initialHoldings,
    ledger,
    calendar,
    milestones: initialMilestones,
    calamity: null,
    calamityHistory: [],
    settings: {
      usdInr: 88,
      theme: 'system',
      sidebarCollapsed: false,
      capacityRatio: 0.35,
      onboardingComplete: true,
    },
    storageWarning: false,
    activeToast: null,
  };
}
