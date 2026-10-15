import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useStore } from '../../store/useStore';
import { dayKey } from '../../engine/dates';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toast } from '../ui/Toast';
import { DisclaimerFooter } from '../ui/DisclaimerFooter';
import { MonthlyUpdateModal } from './MonthlyUpdateModal';
import { MilestoneCelebrationModal } from './MilestoneCelebrationModal';

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/roadmap': 'Roadmap',
  '/app/calendar': 'To-Do Calendar',
  '/app/fallback': 'Fallback Plans',
  '/app/news': 'News and Updates',
  '/app/admin': 'Admin Panel',
};

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [mandatoryMonthly, setMandatoryMonthly] = useState(false);

  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] ?? 'CalmCap';

  // Periodic reminder checker (every 20 seconds) - Section 11.3
  useEffect(() => {
    const checkReminders = () => {
      const state = useStore.getState();
      const now = new Date();
      const todayStr = dayKey(now);
      const currentTimeStr = format(now, 'HH:mm');
      const todayEntry = state.calendar[todayStr];
      if (!todayEntry) return;

      // Check date-level reminder
      if (
        todayEntry.reminderTime &&
        !todayEntry.reminderFired &&
        todayEntry.reminderTime <= currentTimeStr
      ) {
        state.showToast(`Reminder: ${todayEntry.title || 'Scheduled check-in'}`, 'info');
        state.saveCalendarDay(todayStr, { reminderFired: true });
      }

      // Check item-level reminders
      for (const r of todayEntry.reminders) {
        if (!r.fired && r.time <= currentTimeStr) {
          state.showToast(`Reminder: ${r.title}`, 'info');
          state.markReminderFired(todayStr, r.id);

          // If browser notification permission granted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('CalmCap Reminder', {
                body: r.title,
                icon: './favicon.png',
              });
            } catch {
              // Ignore notification errors
            }
          }
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ink flex">
      {/* Sidebar navigation */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main content wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-out ${
          collapsed ? 'md:pl-[72px]' : 'md:pl-[264px]'
        }`}
      >
        <TopBar
          title={title}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onOpenMonthlyModal={() => {
            setMandatoryMonthly(false);
            setMonthlyModalOpen(true);
          }}
        />

        <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
          <DisclaimerFooter />
        </main>
      </div>

      {/* Mandatory / manual monthly update dialog */}
      <MonthlyUpdateModal
        open={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        mandatory={mandatoryMonthly}
      />

      {/* Milestone celebration dialog */}
      <MilestoneCelebrationModal />

      {/* Global toast notification system */}
      <Toast />
    </div>
  );
};
