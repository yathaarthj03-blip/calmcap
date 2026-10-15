import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  CheckSquare,
  Users,
  Bell,
  Target,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { selectActivePlan, selectSavingsSoFar } from '../../store/selectors';
import { dayKey } from '../../engine/dates';
import { inr, inrCompact } from '../../engine/format';
import type { DayItem, TimedItem, ReminderItem } from '../../engine/types';
import {
  calculateCareerBoostImpact,
  getEducationActionHub,
  type CareerCategory,
  type CareerTaskTemplate,
} from '../../engine/education';
import { Dialog } from '../../components/ui/Dialog';
import { ScrollReveal } from '../../components/ui/ScrollReveal';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const calendar = useStore((s) => s.calendar);
  const milestones = useStore((s) => s.milestones);
  const saveCalendarDay = useStore((s) => s.saveCalendarDay);
  const deleteCalendarDay = useStore((s) => s.deleteCalendarDay);
  const savingsNow = useStore(selectSavingsSoFar);
  const profile = useStore((s) => s.profile);
  const activePlan = useStore(selectActivePlan);
  const showToast = useStore((s) => s.showToast);

  const [careerCategoryFilter, setCareerCategoryFilter] = useState<CareerCategory | 'ALL'>('ALL');
  const [selectedScheduleDates, setSelectedScheduleDates] = useState<Record<string, string>>({});

  // Education Action Hub calculations
  const eduHub = useMemo(() => {
    return getEducationActionHub(profile.education);
  }, [profile.education]);

  const filteredCareerTasks = useMemo(() => {
    if (careerCategoryFilter === 'ALL') return eduHub.tasks;
    return eduHub.tasks.filter((t) => t.category === careerCategoryFilter);
  }, [eduHub.tasks, careerCategoryFilter]);

  const isTaskAssigned = (task: CareerTaskTemplate) => {
    return Object.values(calendar).some(
      (entry) =>
        entry.title.includes(task.title) ||
        entry.tasks.some((t) => t.text === task.checklist[0]),
    );
  };

  const getTaskImpact = (task: CareerTaskTemplate) => {
    if (!task.estMonthlyEarningRupees || task.estMonthlyEarningRupees <= 0) return null;
    return calculateCareerBoostImpact(
      activePlan.goal.amount,
      savingsNow,
      activePlan.plan.monthlyAmount,
      task.estMonthlyEarningRupees,
      0.5,
      9.0,
    );
  };

  const assignCareerTask = (task: CareerTaskTemplate, targetDateStr: string) => {
    const existing = calendar[targetDateStr] ?? {
      date: targetDateStr,
      title: task.title,
      note: '',
      tasks: [],
      meetings: [],
      reminders: [],
    };

    const newTasks: DayItem[] = task.checklist.map((item, idx) => ({
      id: `ct-${task.id}-${Date.now()}-${idx}`,
      text: item,
      done: false,
    }));

    const updatedNote = existing.note
      ? `${existing.note}\n\n[Education Track: ${task.title}]\n${task.marketContext}`
      : `[Education Track: ${task.title}]\n${task.marketContext}`;

    saveCalendarDay(targetDateStr, {
      title: existing.title || task.title,
      note: updatedNote,
      tasks: [...existing.tasks, ...newTasks],
    });

    showToast(`Assigned "${task.title}" to ${targetDateStr}`, 'success');
  };

  // Build calendar month grid (Monday first)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const quarterEndMap = useMemo(() => {
    const map = new Set<string>();
    for (const m of milestones) {
      map.add(m.quarterEnd);
    }
    return map;
  }, [milestones]);

  // Edit dialog local state with autosave
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogNote, setDialogNote] = useState('');
  const [dialogReminderTime, setDialogReminderTime] = useState('');
  const [tasks, setTasks] = useState<DayItem[]>([]);
  const [meetings, setMeetings] = useState<TimedItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Input states for new items
  const [newTaskText, setNewTaskText] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('14:00');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('09:00');

  const [savedStatus, setSavedStatus] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sync state when selected date changes
  useEffect(() => {
    if (selectedDateKey) {
      const entry = useStore.getState().calendar[selectedDateKey];
      setDialogTitle(entry?.title || '');
      setDialogNote(entry?.note || '');
      setDialogReminderTime(entry?.reminderTime || '');
      setTasks(entry?.tasks || []);
      setMeetings(entry?.meetings || []);
      setReminders(entry?.reminders || []);
      setSavedStatus(false);
    }
  }, [selectedDateKey]);

  // Autosave handler
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!selectedDateKey) return;

    const timer = setTimeout(() => {
      saveCalendarDay(selectedDateKey, {
        title: dialogTitle,
        note: dialogNote,
        reminderTime: dialogReminderTime || undefined,
        tasks,
        meetings,
        reminders,
      });
      setSavedStatus(true);
      const hideTimer = setTimeout(() => setSavedStatus(false), 1500);
      return () => clearTimeout(hideTimer);
    }, 300);

    return () => clearTimeout(timer);
  }, [dialogTitle, dialogNote, dialogReminderTime, tasks, meetings, reminders, selectedDateKey, saveCalendarDay]);

  // Task actions
  const handleAddTask = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (!newTaskText.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, text: newTaskText.trim(), done: false },
    ]);
    setNewTaskText('');
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim() || !newMeetingTime) return;
    setMeetings((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, title: newMeetingTitle.trim(), time: newMeetingTime },
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setNewMeetingTitle('');
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderTime) return;
    setReminders((prev) => [
      ...prev,
      { id: `r-${Date.now()}`, title: newReminderTitle.trim(), time: newReminderTime, fired: false },
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setNewReminderTitle('');
  };

  // Keyboard navigation for calendar days
  const handleKeyDownDay = (e: React.KeyboardEvent, d: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedDateKey(dayKey(d));
    }
  };

  // Upcoming items across next 7 days
  const upcomingEntries = useMemo(() => {
    const list: { dateStr: string; item: string; type: 'task' | 'meeting' | 'reminder'; time?: string }[] = [];
    const dates = eachDayOfInterval({
      start: new Date(),
      end: new Date(Date.now() + 7 * 86400000),
    });

    for (const d of dates) {
      const k = dayKey(d);
      const entry = calendar[k];
      if (!entry) continue;

      for (const t of entry.tasks) {
        if (!t.done) list.push({ dateStr: k, item: t.text, type: 'task' });
      }
      for (const m of entry.meetings) {
        list.push({ dateStr: k, item: m.title, type: 'meeting', time: m.time });
      }
      for (const r of entry.reminders) {
        if (!r.fired) list.push({ dateStr: k, item: r.title, type: 'reminder', time: r.time });
      }
    }

    return list.slice(0, 8);
  }, [calendar]);

  // Current quarterly milestone
  const currentQuarterMilestone = useMemo(() => {
    return milestones.find((m) => !m.achievedAt) || milestones[milestones.length - 1];
  }, [milestones]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
          To-Do Calendar
        </h1>
        <p className="text-sm text-muted mt-1">
          Track personal finance actions, milestones, and daily tasks with clean autosave.
        </p>
      </div>

      {/* Education-Driven Career & Income Booster Section */}
      <ScrollReveal>
        <div className="panel p-5 sm:p-6 space-y-5 border-l-4 border-l-accent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-ctl bg-accent/10 text-accent">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-display font-semibold text-ink">
                Career & Income Booster
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold uppercase tracking-wider">
                Education-Matched
              </span>
            </div>
            <p className="text-xs text-muted">
              Actionable tasks tailored to your <strong className="text-ink font-medium">{eduHub.profile.year} {eduHub.profile.field}</strong> studies to unlock internships, freelance income, and full-time career placement.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Target Track:</span>
            <span className="px-2.5 py-1 rounded-ctl bg-surface-2 text-ink font-semibold border border-line">
              {eduHub.trackInfo.label}
            </span>
          </div>
        </div>

        {/* Strategy & Market Recruitment Banner */}
        <div className="p-3.5 rounded-ctl bg-surface-2/60 border border-line text-xs space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="text-ink leading-relaxed font-medium">
              {eduHub.yearStageNote}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted border-t border-line/50">
            <span className="font-semibold text-ink">Active Market Platforms:</span>
            {eduHub.trackInfo.primaryMarketPlatforms.map((plat) => (
              <span key={plat} className="px-2 py-0.5 rounded bg-surface border border-line text-ink">
                {plat}
              </span>
            ))}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              { key: 'ALL', label: 'All Opportunities' },
              { key: 'JOB_PREP', label: '🎯 Job Preparation' },
              { key: 'INTERNSHIPS', label: '💼 Internships' },
              { key: 'FREELANCE', label: '⚡ Freelance & Gigs' },
              { key: 'SKILLS', label: '🛠 Skill Building' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCareerCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-ctl font-medium transition-colors ${
                careerCategoryFilter === cat.key
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface border border-line text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCareerTasks.map((task) => {
            const impact = getTaskImpact(task);
            const isAssigned = isTaskAssigned(task);
            const defaultDate = dayKey(new Date());
            const targetScheduleDate = selectedScheduleDates[task.id] || defaultDate;

            return (
              <div
                key={task.id}
                className="p-4 rounded-panel bg-surface border border-line flex flex-col justify-between space-y-3 hover:border-accent/60 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded bg-surface-2 text-ink font-semibold uppercase tracking-wider text-[10px]">
                      {task.category.replace('_', ' ')}
                    </span>
                    <span className="text-muted text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.recommendedStage}
                    </span>
                  </div>

                  <h3 className="font-display font-semibold text-base text-ink leading-snug">
                    {task.title}
                  </h3>

                  <p className="text-xs text-muted leading-relaxed">
                    {task.description}
                  </p>

                  {/* Market Understanding Rationale */}
                  <div className="p-2.5 rounded bg-surface-2/40 border border-line/40 text-[11px] text-muted space-y-1">
                    <span className="font-semibold text-ink block">Market Context:</span>
                    <p className="leading-relaxed">{task.marketContext}</p>
                  </div>

                  {/* Action Checklist Preview */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-ink block">Action Checklist:</span>
                    <ul className="space-y-1 text-xs text-muted">
                      {task.checklist.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                      {task.checklist.length > 3 && (
                        <li className="text-[11px] text-accent pl-5">
                          + {task.checklist.length - 3} more items when scheduled
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Financial Goal Acceleration Badge */}
                  {impact && impact.shavedMonths > 0 && (
                    <div className="p-2.5 rounded bg-accent/10 border border-accent/20 text-xs text-ink space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-accent text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Income & Timeline Impact</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Earns ~<strong className="num text-ink">{inr(task.estMonthlyEarningRupees)}/mo</strong>. Saving half increases monthly SIP to <strong className="num text-ink">{inr(impact.boostMonthlySavings)}</strong>, shaving <strong className="text-accent">{impact.shavedYearsFormatted} ({impact.shavedMonths} months)</strong> off your {inrCompact(activePlan.goal.amount)} goal!
                      </p>
                    </div>
                  )}
                </div>

                {/* Scheduling Control */}
                <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <label htmlFor={`date-${task.id}`} className="text-muted text-[11px]">Date:</label>
                    <input
                      id={`date-${task.id}`}
                      type="date"
                      value={targetScheduleDate}
                      onChange={(e) =>
                        setSelectedScheduleDates((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      className="text-xs px-2 py-1 rounded border border-line bg-surface text-ink font-mono"
                    />
                  </div>

                  <button
                    onClick={() => assignCareerTask(task, targetScheduleDate)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-ctl flex items-center gap-1 transition-colors ${
                      isAssigned
                        ? 'bg-surface-2 text-ink border border-line hover:bg-surface'
                        : 'bg-accent text-on-accent hover:opacity-90'
                    }`}
                  >
                    {isAssigned ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                        <span>Scheduled</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Assign to To-Do</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Quarterly Milestones Panel */}
        <div className="space-y-4 order-2 lg:order-1">
          {currentQuarterMilestone && (
            <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-accent">
                  Quarterly Milestone
                </span>
                <Target className="w-4 h-4 text-accent" />
              </div>

              <div>
                <div className="text-xl font-display font-bold text-ink num">
                  {inr(currentQuarterMilestone.targetValue)}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  Target date: {currentQuarterMilestone.quarterEnd}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted mb-1 num">
                  <span>Savings progress</span>
                  <span>
                    {Math.min(
                      100,
                      Math.round((savingsNow / currentQuarterMilestone.targetValue) * 100),
                    )}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((savingsNow / currentQuarterMilestone.targetValue) * 100),
                      )}%`,
                    }}
                    className="bg-accent h-full rounded-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* List of all milestones */}
          <div className="p-4 rounded-panel bg-surface border border-line space-y-3">
            <h3 className="font-semibold text-sm text-ink">Milestone Tracker</h3>
            <div className="space-y-2 text-xs">
              {milestones.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded bg-surface-2/60 border border-line/60"
                >
                  <div className="flex items-center gap-2">
                    {m.achievedAt ? (
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-line shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-ink num">
                        {inrCompact(m.targetValue)}
                      </div>
                      <div className="text-[10px] text-muted">{m.quarterEnd}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    m.achievedAt ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'
                  }`}>
                    {m.achievedAt ? 'Achieved' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Calendar Month Grid (Monday First) */}
        <div className="lg:col-span-2 panel p-5 order-1 lg:order-2 space-y-4">
          {/* Month Header with Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg sm:text-xl text-ink">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold rounded-ctl border border-line text-ink hover:bg-surface-2"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1 rounded-ctl text-muted hover:text-ink hover:bg-surface-2"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1 rounded-ctl text-muted hover:text-ink hover:bg-surface-2"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted uppercase tracking-wider py-1 border-b border-line">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const k = dayKey(day);
              const inMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const entry = calendar[k];
              const isQuarterEnd = quarterEndMap.has(k);

              const totalCount =
                (entry?.tasks.length || 0) +
                (entry?.meetings.length || 0) +
                (entry?.reminders.length || 0) +
                (entry?.title ? 1 : 0);

              return (
                <div
                  key={k}
                  tabIndex={0}
                  role="button"
                  onClick={() => setSelectedDateKey(k)}
                  onKeyDown={(e) => handleKeyDownDay(e, day)}
                  className={`min-h-[64px] sm:min-h-[76px] p-1.5 rounded-ctl border text-left transition-colors flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    !inMonth
                      ? 'bg-surface/30 text-muted/40 border-line/40'
                      : 'bg-surface border-line hover:bg-surface-2'
                  } ${isToday ? 'ring-2 ring-accent font-semibold' : ''}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`num ${isToday ? 'text-accent font-bold' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {isQuarterEnd && (
                      <span title="Quarter end milestone target">
                        <Target className="w-3 h-3 text-accent" />
                      </span>
                    )}
                  </div>

                  {/* Indicator dots / badges */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {totalCount > 0 && totalCount <= 3 && (
                      <div className="flex gap-1">
                        {Array.from({ length: totalCount }).map((_, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent" />
                        ))}
                      </div>
                    )}
                    {totalCount > 3 && (
                      <span className="text-[10px] px-1 py-0.2 rounded-full bg-accent/20 text-accent font-bold num">
                        {totalCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Upcoming Tasks & Reminders Panel */}
        <div className="p-4 rounded-panel bg-surface border border-line space-y-3 order-3">
          <h3 className="font-semibold text-sm text-ink">Upcoming (Next 7 days)</h3>
          {upcomingEntries.length === 0 ? (
            <p className="text-xs text-muted">No scheduled actions for the upcoming week.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {upcomingEntries.map((u, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedDateKey(u.dateStr)}
                  className="p-2 rounded bg-surface-2/60 border border-line/60 hover:border-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted mb-0.5">
                    <span className="font-semibold capitalize text-ink">{u.type}</span>
                    <span>{u.dateStr} {u.time && `at ${u.time}`}</span>
                  </div>
                  <div className="text-ink font-medium truncate">{u.item}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </ScrollReveal>

      {/* Notion-style Date Click Dialog */}
      <Dialog
        open={selectedDateKey !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDateKey(null);
        }}
        title={`Entry: ${selectedDateKey}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Top Form: Title, Note, Reminder Time, Autosave Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={dialogTitle}
                onChange={(e) => setDialogTitle(e.target.value)}
                placeholder="Day title or main focus…"
                className="input text-base font-semibold border-none px-0 bg-transparent focus:ring-0 placeholder:text-muted"
              />
              <div className="text-xs text-muted flex items-center gap-1 shrink-0">
                {savedStatus ? (
                  <span className="text-accent font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                ) : (
                  <span>Autosaves</span>
                )}
              </div>
            </div>

            <textarea
              rows={2}
              value={dialogNote}
              onChange={(e) => setDialogNote(e.target.value)}
              placeholder="Add a detailed note for this day…"
              className="input h-auto py-2 text-sm"
            />

            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Main reminder:
              </span>
              <input
                type="time"
                value={dialogReminderTime}
                onChange={(e) => setDialogReminderTime(e.target.value)}
                className="input py-1 px-2 w-auto text-xs"
              />
              {dialogReminderTime && (
                <button
                  type="button"
                  onClick={() => setDialogReminderTime('')}
                  className="text-muted hover:text-loss text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <hr className="border-line" />

          {/* Three Vertical Columns: Tasks, Meetings, Reminders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Tasks */}
            <div className="space-y-2">
              <div className="font-semibold text-ink flex items-center gap-1.5 pb-1 border-b border-line">
                <CheckSquare className="w-3.5 h-3.5 text-safe" />
                <span>Tasks</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 group">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => {
                        setTasks((prev) =>
                          prev.map((item) =>
                            item.id === t.id ? { ...item, done: e.target.checked } : item,
                          ),
                        );
                      }}
                      className="mt-0.5 rounded text-accent"
                    />
                    <span
                      className={`flex-1 break-words leading-tight ${
                        t.done ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {t.text}
                    </span>
                    <button
                      onClick={() => setTasks((prev) => prev.filter((item) => item.id !== t.id))}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-loss transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1 pt-1">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={handleAddTask}
                  placeholder="New task (Enter)…"
                  className="input text-xs py-1 px-2"
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="p-2 rounded bg-surface-2 text-ink hover:bg-surface-2/80"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Column 2: Meetings */}
            <div className="space-y-2">
              <div className="font-semibold text-ink flex items-center gap-1.5 pb-1 border-b border-line">
                <Users className="w-3.5 h-3.5 text-mid" />
                <span>Meetings</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {meetings.map((m) => (
                  <div key={m.id} className="p-1.5 rounded bg-surface-2 flex items-center justify-between group">
                    <div className="truncate">
                      <span className="font-bold mr-1.5 text-ink num">{m.time}</span>
                      <span className="text-muted">{m.title}</span>
                    </div>
                    <button
                      onClick={() => setMeetings((prev) => prev.filter((item) => item.id !== m.id))}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-loss transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddMeeting} className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="Meeting title…"
                  className="input text-xs py-1 px-2"
                />
                <div className="flex gap-1">
                  <input
                    type="time"
                    value={newMeetingTime}
                    onChange={(e) => setNewMeetingTime(e.target.value)}
                    className="input text-xs py-1 px-2"
                    required
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded bg-surface-2 text-ink text-xs font-semibold hover:bg-surface-2/80 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Column 3: Reminders */}
            <div className="space-y-2">
              <div className="font-semibold text-ink flex items-center gap-1.5 pb-1 border-b border-line">
                <Bell className="w-3.5 h-3.5 text-accent" />
                <span>Reminders</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {reminders.map((r) => (
                  <div key={r.id} className="p-1.5 rounded bg-surface-2 flex items-center justify-between group">
                    <div className="truncate">
                      <span className="font-bold mr-1.5 text-accent num">{r.time}</span>
                      <span className={r.fired ? 'line-through text-muted' : 'text-ink'}>
                        {r.title}
                      </span>
                    </div>
                    <button
                      onClick={() => setReminders((prev) => prev.filter((item) => item.id !== r.id))}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-loss transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddReminder} className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder="Reminder alert…"
                  className="input text-xs py-1 px-2"
                />
                <div className="flex gap-1">
                  <input
                    type="time"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="input text-xs py-1 px-2"
                    required
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded bg-surface-2 text-ink text-xs font-semibold hover:bg-surface-2/80 shrink-0"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-xs text-loss hover:underline"
            >
              Delete this day's entry
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="px-4 py-1.5 text-xs font-semibold rounded-ctl bg-accent text-on-accent hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* In-Dialog Delete Confirmation */}
      <Dialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Day Entry"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3 pt-1 text-xs">
          <p className="text-muted leading-relaxed">
            Are you sure you want to clear all tasks, meetings, notes, and reminders for this date?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(false)}
              className="px-3 py-1.5 rounded border border-line text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedDateKey) deleteCalendarDay(selectedDateKey);
                setConfirmDeleteOpen(false);
                setSelectedDateKey(null);
              }}
              className="px-3 py-1.5 rounded bg-loss text-white text-xs font-semibold"
            >
              Confirm delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
