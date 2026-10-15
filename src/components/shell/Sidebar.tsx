import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Calendar,
  ShieldAlert,
  Newspaper,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { selectActivePlan } from '../../store/selectors';
import { CorridorMark } from '../ui/CorridorMark';
import { Tooltip } from '../ui/Tooltip';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/roadmap', label: 'Roadmap', icon: Map },
  { to: '/app/calendar', label: 'To-Do Calendar', icon: Calendar },
  { to: '/app/fallback', label: 'Fallback Plans', icon: ShieldAlert },
  { to: '/app/news', label: 'News and Updates', icon: Newspaper },
  { to: '/app/admin', label: 'Admin', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const profile = useStore((s) => s.profile);
  const activePlan = useStore(selectActivePlan);
  const location = useLocation();

  const isMobileOpenRef = useRef(mobileOpen);
  isMobileOpenRef.current = mobileOpen;

  const onMobileCloseRef = useRef(onMobileClose);
  onMobileCloseRef.current = onMobileClose;

  // Close mobile drawer on route change ONLY when open
  useEffect(() => {
    if (isMobileOpenRef.current) {
      onMobileCloseRef.current();
    }
  }, [location.pathname]);

  // Keyboard shortcut `[` to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSidebarCollapsed(!collapsed);
      }
      if (e.key === 'Escape' && mobileOpen) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, setSidebarCollapsed, mobileOpen, onMobileClose]);

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'A';

  const content = (
    <div className="flex flex-col h-full bg-surface border-r border-line select-none">
      {/* Header with Logo and Collapse Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-line">
        <NavLink to="/app/dashboard" className="flex items-center gap-3 overflow-hidden">
          <CorridorMark size={28} className="shrink-0" />
          {(!collapsed || mobileOpen) && (
            <span className="font-display font-semibold text-lg tracking-tight text-ink">
              CalmCap
            </span>
          )}
        </NavLink>

        {/* Desktop collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-ctl text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          title={collapsed ? 'Expand sidebar ( [ )' : 'Collapse sidebar ( [ )'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-ctl text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCollapsedMode = collapsed && !mobileOpen;

          const link = (
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-ctl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-muted hover:text-ink hover:bg-surface-2'
                } ${isCollapsedMode ? 'justify-center px-0' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0 stroke-[1.75]" />
              {!isCollapsedMode && <span>{item.label}</span>}
            </NavLink>
          );

          if (isCollapsedMode) {
            return (
              <Tooltip key={item.to} content={item.label} side="right">
                <div>{link}</div>
              </Tooltip>
            );
          }

          return <div key={item.to}>{link}</div>;
        })}
      </nav>

      {/* Footer Profile & Plan Version */}
      <div className="p-3 border-t border-line">
        <NavLink
          to="/app/admin"
          className={`flex items-center gap-3 p-2 rounded-ctl hover:bg-surface-2 transition-colors ${
            collapsed && !mobileOpen ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-semibold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="overflow-hidden leading-tight">
              <div className="text-sm font-medium text-ink truncate">
                {profile.name || 'Aarav'}
              </div>
              <div className="text-xs text-muted">
                Plan v{activePlan.version}
              </div>
            </div>
          )}
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with 200ms width transition */}
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-[264px] transition-transform duration-250 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </div>
    </>
  );
};
