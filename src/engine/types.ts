// Domain types shared by the engine and the store. Pure data, no React.

export type GoalId = 'TEN_LAKH' | 'ONE_CRORE' | 'USD_1M';
export type Band = 'SOONER' | 'MID' | 'LONG';
export type Bucket = 'safe' | 'mid' | 'long';
export type Allocation = Record<Bucket, number>; // whole percentages that add up to 100
export type Tier = 'LEAN' | 'RECOMMENDED' | 'CUSHION' | 'CUSTOM';

export type EducationLevel =
  | 'UNDERGRADUATE'
  | 'POSTGRADUATE'
  | 'DIPLOMA'
  | 'HIGH_SCHOOL'
  | 'OTHER';

export type CareerTrack =
  | 'TECH_SOFTWARE'
  | 'FINANCE_COMMERCE'
  | 'BUSINESS_MARKETING'
  | 'DESIGN_CREATIVE'
  | 'GENERAL_CORPORATE';

export interface EducationProfile {
  level: EducationLevel;
  field: string;
  year: string;
  careerTrack: CareerTrack;
  targetRole?: string;
}

export interface Profile {
  name: string;
  email: string;
  createdAt: string;
  education?: EducationProfile;
}

export interface Income {
  primary: number;
  side: number;
  sideNote?: string;
  expenses?: number;
  expectedRaisePct?: number;
  expectedRaiseDate?: string; // yyyy-MM-dd
}

export interface IncomeChange {
  id: string;
  effectiveDate: string; // yyyy-MM-dd
  primary: number;
  side: number;
}

export interface Goal {
  id: GoalId;
  amount: number;
  band: Band;
  months: number;
  startMonth: string; // yyyy-MM. Month 0 of the plan; contribution k lands in startMonth + k.
  existing?: number; // savings already in hand at startMonth (rupees)
}

export interface PlanSettings {
  monthlyAmount: number;
  tier: Tier;
  stepUpPct: number;
  allocation: Allocation;
  panicBudget?: number;
  promise?: string;
}

export type VersionReason = 'ONBOARDING' | 'USER_EDIT' | 'INCOME_CHANGE' | 'FALLBACK';

export interface PlanVersion {
  version: number;
  createdAt: string;
  reason: VersionReason;
  goal: Goal;
  plan: PlanSettings;
}

export type HoldingCategory =
  | 'SAVINGS_ACCOUNT'
  | 'LIQUID_FUND'
  | 'FIXED_DEPOSIT'
  | 'DEBT_FUND'
  | 'GOLD_ETF'
  | 'INDEX_FUND'
  | 'OTHER';

export interface Holding {
  id: string;
  name: string;
  category: HoldingCategory;
  bucket: Bucket;
  startDate: string; // yyyy-MM-dd
  initialAmount: number;
  annualReturnPct: number;
}

export interface LedgerEntry {
  id: string;
  month: string; // yyyy-MM
  amount: number;
  holdingId: string | 'CASH';
  incomeAtTime: number;
  loggedAt: string; // local yyyy-MM-ddTHH:mm:ss
}

export interface DayItem {
  id: string;
  text: string;
  done: boolean;
}
export interface TimedItem {
  id: string;
  title: string;
  time: string; // HH:mm
}
export interface ReminderItem extends TimedItem {
  fired?: boolean;
}

export interface DayEntry {
  date: string; // yyyy-MM-dd
  title: string;
  note: string;
  reminderTime?: string;
  reminderFired?: boolean;
  tasks: DayItem[];
  meetings: TimedItem[];
  reminders: ReminderItem[];
}

export interface Milestone {
  id: string;
  index: number;
  quarterEnd: string; // yyyy-MM-dd
  targetValue: number;
  achievedAt?: string;
  seenCelebration?: boolean;
}

export interface Calamity {
  id: string;
  scenarioId: string;
  startedAt: string;
  status: 'ACTIVE' | 'RESOLVED';
  decision?: 'ACCEPTED' | 'DECLINED_KEPT_PLAN';
  decidedAt?: string;
  recoveredAt?: string; // when the user marks the simulated market as recovered
  versionBefore?: number;
  versionAfter?: number;
}

export interface Settings {
  usdInr: number;
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  capacityRatio: number;
  onboardingComplete: boolean;
}

/** Everything the maths needs to know about a plan. Built from a PlanVersion. */
export interface PlanSpec {
  goalAmount: number;
  months: number;
  existing: number;
  stepUpPct: number;
  allocation: Allocation;
  band: Band;
  monthlyAmount: number;
}

export interface Scenario {
  id: string;
  name: string;
  short: string;
  shocks: Record<Bucket, number>; // fraction lost immediately, 0.38 = 38%
  forwardReturnDelta: Partial<Record<Bucket, number>>; // percentage points
  story: string[];
}
