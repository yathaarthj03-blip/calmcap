import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { localStamp, dayKey } from '../engine/dates';
import { evaluateMilestones, generateMilestones, regenerateMilestones } from '../engine/milestones';
import { specFromVersion } from '../engine/plan';
import { savingsAt } from '../engine/holdings';
import type {
  Calamity,
  DayEntry,
  Holding,
  Income,
  LedgerEntry,
  PlanVersion,
  Profile,
  Settings,
} from '../engine/types';
import { CorridorState, createDemoState, createInitialState } from './types';

interface CorridorActions {
  // Profile & Settings
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (c: boolean) => void;

  // Income
  updateIncome: (next: Income) => { changeDetected: boolean; percentChange: number };

  // Plan versions
  addPlanVersion: (proposal: Omit<PlanVersion, 'version' | 'createdAt'>) => number;
  undoPlanVersion: () => boolean;

  // Holdings
  addHolding: (h: Omit<Holding, 'id'>) => string;
  editHolding: (id: string, h: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;

  // Ledger
  logMonthlySavings: (params: {
    month: string;
    amount: number;
    holdingId: string | 'CASH';
    incomeAtTime?: number;
  }) => void;
  editLedgerEntry: (id: string, amount: number, holdingId: string | 'CASH') => void;
  deleteLedgerEntry: (id: string) => void;

  // Calendar
  saveCalendarDay: (dateKey: string, entry: Partial<DayEntry>) => void;
  deleteCalendarDay: (dateKey: string) => void;
  markReminderFired: (dateKey: string, reminderId: string) => void;

  // Milestones
  markMilestoneCelebrated: (id: string) => void;

  // Calamity / Fallback
  startCalamity: (scenarioId: string) => void;
  resolveCalamity: (decision: 'ACCEPTED' | 'DECLINED_KEPT_PLAN', newVersionNum?: number) => void;
  markCalamityRecovered: () => void;

  // Demo / Reset
  loadDemoData: () => void;
  resetEverything: () => void;
  importJsonState: (imported: Partial<CorridorState>) => { success: boolean; error?: string };

  // Toast
  showToast: (message: string, type?: 'info' | 'success' | 'warn' | 'undo', onUndo?: () => void) => void;
  hideToast: () => void;
}

export type Store = CorridorState & CorridorActions;

// Safe storage wrapper (Rule 1)
let storageFailed = false;
const safeStorage = createJSONStorage(() => {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    storageFailed = true;
    const mem: Record<string, string> = {};
    return {
      getItem: (name: string) => mem[name] ?? null,
      setItem: (name: string, value: string) => { mem[name] = value; },
      removeItem: (name: string) => { delete mem[name]; },
    };
  }
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createDemoState(),
      storageWarning: storageFailed,

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      setSettings: (partial) => {
        set((s) => {
          const next = { ...s.settings, ...partial };
          if (partial.theme) {
            applyThemeClass(partial.theme);
          }
          return { settings: next };
        });
      },

      toggleTheme: () => {
        const current = get().settings.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        applyThemeClass(next);
        set((s) => ({ settings: { ...s.settings, theme: next } }));
      },

      setSidebarCollapsed: (c) => set((s) => ({ settings: { ...s.settings, sidebarCollapsed: c } })),

      updateIncome: (next) => {
        const current = get().income;
        const prevTotal = current.primary + current.side;
        const nextTotal = next.primary + next.side;
        const changeDetected = prevTotal !== nextTotal;
        const percentChange = prevTotal > 0 ? ((nextTotal - prevTotal) / prevTotal) * 100 : nextTotal > 0 ? 100 : 0;

        const effectiveDate = dayKey(new Date());
        set((s) => ({
          income: { ...s.income, ...next },
          incomeHistory: changeDetected
            ? [
                ...s.incomeHistory,
                {
                  id: `inc-${Date.now()}`,
                  effectiveDate,
                  primary: next.primary,
                  side: next.side,
                },
              ]
            : s.incomeHistory,
        }));

        return { changeDetected, percentChange };
      },

      addPlanVersion: (proposal) => {
        const state = get();
        const nextVerNum = state.planVersions.length + 1;
        const newVersion: PlanVersion = {
          ...proposal,
          version: nextVerNum,
          createdAt: localStamp(new Date()),
        };

        const todayD = dayKey(new Date());
        const spec = specFromVersion(newVersion);
        const freshMilestones = generateMilestones(spec, newVersion.goal.startMonth, `v${nextVerNum}`);
        const updatedMilestones = regenerateMilestones(state.milestones, freshMilestones, todayD);

        set((s) => ({
          planVersions: [...s.planVersions, newVersion],
          milestones: updatedMilestones,
        }));

        return nextVerNum;
      },

      undoPlanVersion: () => {
        const state = get();
        if (state.planVersions.length <= 1) return false;
        const popped = state.planVersions.slice(0, -1);
        const active = popped[popped.length - 1];
        const spec = specFromVersion(active);
        const todayD = dayKey(new Date());
        const freshMilestones = generateMilestones(spec, active.goal.startMonth, `v${active.version}`);
        const updatedMilestones = regenerateMilestones(state.milestones, freshMilestones, todayD);

        set({
          planVersions: popped,
          milestones: updatedMilestones,
        });
        return true;
      },

      addHolding: (h) => {
        const id = `h-${Date.now()}`;
        const newHolding: Holding = { ...h, id };
        set((s) => {
          const nextHoldings = [...s.holdings, newHolding];
          const curSavings = savingsAt(nextHoldings, s.ledger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, localStamp(new Date()));
          return { holdings: nextHoldings, milestones };
        });
        return id;
      },

      editHolding: (id, updates) => {
        set((s) => {
          const nextHoldings = s.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h));
          const curSavings = savingsAt(nextHoldings, s.ledger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, localStamp(new Date()));
          return { holdings: nextHoldings, milestones };
        });
      },

      deleteHolding: (id) => {
        set((s) => {
          // Reassign ledger entries pointing to this holding to CASH
          const nextLedger = s.ledger.map((e) => (e.holdingId === id ? { ...e, holdingId: 'CASH' as const } : e));
          const nextHoldings = s.holdings.filter((h) => h.id !== id);
          const curSavings = savingsAt(nextHoldings, nextLedger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, localStamp(new Date()));
          return { holdings: nextHoldings, ledger: nextLedger, milestones };
        });
      },

      logMonthlySavings: ({ month, amount, holdingId, incomeAtTime }) => {
        set((s) => {
          const curIncome = incomeAtTime ?? s.income.primary + s.income.side;
          const stamp = localStamp(new Date());

          // Rule 9: unique per (month, holdingId) - edit instead of duplicate
          const existingIdx = s.ledger.findIndex((e) => e.month === month && e.holdingId === holdingId);
          let nextLedger: LedgerEntry[];
          if (existingIdx >= 0) {
            nextLedger = [...s.ledger];
            nextLedger[existingIdx] = {
              ...nextLedger[existingIdx],
              amount,
              incomeAtTime: curIncome,
              loggedAt: stamp,
            };
          } else {
            nextLedger = [
              ...s.ledger,
              {
                id: `led-${Date.now()}`,
                month,
                amount,
                holdingId,
                incomeAtTime: curIncome,
                loggedAt: stamp,
              },
            ];
          }

          // Evaluate milestones
          const curSavings = savingsAt(s.holdings, nextLedger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, stamp);

          return { ledger: nextLedger, milestones };
        });
      },

      editLedgerEntry: (id, amount, holdingId) => {
        set((s) => {
          const nextLedger = s.ledger.map((e) => (e.id === id ? { ...e, amount, holdingId } : e));
          const curSavings = savingsAt(s.holdings, nextLedger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, localStamp(new Date()));
          return { ledger: nextLedger, milestones };
        });
      },

      deleteLedgerEntry: (id) => {
        set((s) => {
          const nextLedger = s.ledger.filter((e) => e.id !== id);
          const curSavings = savingsAt(s.holdings, nextLedger, new Date());
          const { milestones } = evaluateMilestones(s.milestones, curSavings, localStamp(new Date()));
          return { ledger: nextLedger, milestones };
        });
      },

      saveCalendarDay: (dateKey, entry) => {
        set((s) => {
          const existing = s.calendar[dateKey] ?? {
            date: dateKey,
            title: '',
            note: '',
            tasks: [],
            meetings: [],
            reminders: [],
          };
          const updated: DayEntry = { ...existing, ...entry };

          // If entry is completely empty, remove it
          const isEmpty =
            !updated.title.trim() &&
            !updated.note.trim() &&
            !updated.reminderTime &&
            updated.tasks.length === 0 &&
            updated.meetings.length === 0 &&
            updated.reminders.length === 0;

          if (isEmpty) {
            const nextCal = { ...s.calendar };
            delete nextCal[dateKey];
            return { calendar: nextCal };
          }

          return { calendar: { ...s.calendar, [dateKey]: updated } };
        });
      },

      deleteCalendarDay: (dateKey) => {
        set((s) => {
          const nextCal = { ...s.calendar };
          delete nextCal[dateKey];
          return { calendar: nextCal };
        });
      },

      markReminderFired: (dateKey, reminderId) => {
        set((s) => {
          const day = s.calendar[dateKey];
          if (!day) return {};
          const nextReminders = day.reminders.map((r) => (r.id === reminderId ? { ...r, fired: true } : r));
          return { calendar: { ...s.calendar, [dateKey]: { ...day, reminders: nextReminders } } };
        });
      },

      markMilestoneCelebrated: (id) => {
        set((s) => ({
          milestones: s.milestones.map((m) => (m.id === id ? { ...m, seenCelebration: true } : m)),
        }));
      },

      startCalamity: (scenarioId) => {
        const state = get();
        const activeVer = state.planVersions[state.planVersions.length - 1];
        const newCalamity: Calamity = {
          id: `cal-${Date.now()}`,
          scenarioId,
          startedAt: localStamp(new Date()),
          status: 'ACTIVE',
          versionBefore: activeVer.version,
        };
        set({ calamity: newCalamity });
      },

      resolveCalamity: (decision, newVersionNum) => {
        const state = get();
        if (!state.calamity) return;
        const resolved: Calamity = {
          ...state.calamity,
          status: 'RESOLVED',
          decision,
          decidedAt: localStamp(new Date()),
          versionAfter: newVersionNum ?? state.planVersions[state.planVersions.length - 1].version,
        };
        set((s) => ({
          calamity: null,
          calamityHistory: [...s.calamityHistory, resolved],
        }));
      },

      markCalamityRecovered: () => {
        set((s) => {
          if (!s.calamityHistory.length) return {};
          const last = s.calamityHistory[s.calamityHistory.length - 1];
          const updated = { ...last, recoveredAt: localStamp(new Date()) };
          const nextHistory = [...s.calamityHistory.slice(0, -1), updated];
          return { calamityHistory: nextHistory };
        });
      },

      loadDemoData: () => {
        const demo = createDemoState(new Date());
        set(demo);
        applyThemeClass(demo.settings.theme);
      },

      resetEverything: () => {
        const fresh = createInitialState(new Date());
        set(fresh);
        applyThemeClass('system');
      },

      importJsonState: (imported) => {
        try {
          if (!imported || typeof imported !== 'object') {
            return { success: false, error: 'Invalid JSON: root must be an object' };
          }
          if (!Array.isArray(imported.planVersions) || imported.planVersions.length === 0) {
            return { success: false, error: 'Invalid JSON: missing required plan versions' };
          }
          if (!imported.profile || typeof imported.profile.name !== 'string') {
            return { success: false, error: 'Invalid JSON: missing profile' };
          }

          set((s) => ({
            ...s,
            ...imported,
          }));
          return { success: true };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Unknown import error' };
        }
      },

      showToast: (message, type = 'info', onUndo) => {
        set({ activeToast: { id: `toast-${Date.now()}`, message, type, onUndo } });
      },

      hideToast: () => set({ activeToast: null }),
    }),
    {
      name: 'corridor.v1',
      version: 1,
      storage: safeStorage,
      migrate: (persistedState) => {
        const s = persistedState as Partial<CorridorState> | undefined;
        if (!s || !Array.isArray(s.planVersions) || s.planVersions.length === 0 || !s.profile) {
          return createDemoState() as CorridorState;
        }
        if (!s.profile.education) {
          s.profile.education = {
            level: 'UNDERGRADUATE',
            field: 'Computer Science & Engineering',
            year: '2nd Year',
            careerTrack: 'TECH_SOFTWARE',
            targetRole: 'Software Engineer / Full-Stack Intern',
          };
        }
        return s as CorridorState;
      },
    },
  ),
);

function applyThemeClass(theme: 'light' | 'dark' | 'system') {
  if (typeof document === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
