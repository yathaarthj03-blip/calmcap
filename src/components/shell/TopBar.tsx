import React from 'react';
import { NavLink } from 'react-router-dom';
import { format } from 'date-fns';
import { Menu, Moon, Sun, AlertCircle, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { selectMonthlyUpdateDue, selectIsUnderStress } from '../../store/selectors';

interface TopBarProps {
  title: string;
  onMobileMenuOpen: () => void;
  onOpenMonthlyModal: () => void;
}

const TOP_NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/roadmap', label: 'Roadmap' },
  { to: '/app/calendar', label: 'To-Do Calendar' },
  { to: '/app/fallback', label: 'Calamity Lab' },
  { to: '/app/news', label: 'News' },
  { to: '/app/admin', label: 'Admin' },
];

export const TopBar: React.FC<TopBarProps> = ({ title, onMobileMenuOpen, onOpenMonthlyModal }) => {
  const theme = useStore((s) => s.settings.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const storageWarning = useStore((s) => s.storageWarning);
  const calamity = useStore((s) => s.calamity);
  const isUnderStress = useStore(selectIsUnderStress);
  const monthlyUpdateDue = useStore((s) => selectMonthlyUpdateDue(s));
  const profile = useStore((s) => s.profile);

  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <header className="sticky top-0 z-20 bg-surface/95 border-b border-line">
      {/* Storage Warning Notice (Rule 1) */}
      {storageWarning && (
        <div className="bg-mid/10 text-mid px-4 py-1.5 text-xs font-medium text-center border-b border-mid/20 flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Changes won't be saved on this device (storage unavailable). Working in memory.</span>
        </div>
      )}

      {/* Global Calamity Banner (Section 10) */}
      {calamity && calamity.status === 'ACTIVE' && (
        <div className="bg-loss/10 text-loss px-4 py-2 text-xs sm:text-sm font-semibold border-b border-loss/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-loss animate-pulse" />
            <span>Market fall simulation active. Test your fallback plan now.</span>
          </div>
          <NavLink
            to="/app/fallback"
            className="px-2.5 py-1 text-xs font-medium rounded-ctl bg-loss text-white hover:opacity-90 shrink-0"
          >
            Review Fallback Plan
          </NavLink>
        </div>
      )}

      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile menu & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onMobileMenuOpen}
            className="md:hidden p-2 rounded-ctl text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-semibold text-ink leading-tight">
              {title}
            </h1>
            <p className="text-xs text-muted hidden sm:block">{todayStr}</p>
          </div>
        </div>

        {/* Center: RonDesignLab Top Segmented Nav Pill Capsule */}
        <nav
          aria-label="Primary sections"
          className="hidden xl:flex items-center gap-1 bg-[#1A1E1D] border border-line/50 p-1 rounded-full shadow-sm"
        >
          {TOP_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#F4EFEA] text-[#121615] font-semibold shadow-sm'
                    : 'text-muted hover:text-ink hover:bg-surface-2/60'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Plan Under Stress Chip */}
          {isUnderStress && (!calamity || calamity.status !== 'ACTIVE') && (
            <NavLink
              to="/app/fallback"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-loss/10 text-loss border border-loss/20 hover:bg-loss/15 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-loss" />
              <span className="hidden sm:inline">Plan under stress</span>
            </NavLink>
          )}

          {/* Monthly Update Due Chip */}
          {monthlyUpdateDue && (
            <button
              onClick={onOpenMonthlyModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-mid/10 text-mid border border-mid/30 hover:bg-mid/20 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-mid animate-pulse" />
              <span>Monthly update due</span>
            </button>
          )}

          {/* Profile Pill (RonDesignLab style) */}
          <NavLink
            to="/app/admin"
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs hover:border-accent/40 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-accent/20 text-accent font-semibold text-[10px] flex items-center justify-center">
              {(profile.name || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-ink truncate max-w-[100px]">
              {profile.name || 'Aarav'}
            </span>
          </NavLink>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-ctl text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
