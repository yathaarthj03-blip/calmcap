import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { OnboardingLayout } from './pages/onboarding/OnboardingLayout';
import { WelcomePage } from './pages/onboarding/WelcomePage';
import { IncomePage } from './pages/onboarding/IncomePage';
import { SavingsPage } from './pages/onboarding/SavingsPage';
import { LoadingPage } from './pages/onboarding/LoadingPage';
import { AppLayout } from './components/shell/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RoadmapPage } from './pages/roadmap/RoadmapPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { FallbackPage } from './pages/fallback/FallbackPage';
import { NewsPage } from './pages/news/NewsPage';
import { AdminPage } from './pages/admin/AdminPage';

// Route Guard for /app/*
const ProtectedAppRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Route Guard for /welcome and /setup/* (allows revisiting onboarding anytime)
const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const DemoParamChecker: React.FC = () => {
  const hasCheckedRef = React.useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashSplit = window.location.hash.split('?')[1] || '';
      const hashParams = new URLSearchParams(hashSplit);

      if (searchParams.get('demo') === '1' || hashParams.get('demo') === '1') {
        useStore.getState().loadDemoData();

        // Clean query parameter from URL to prevent infinite re-triggering on navigation
        if (window.history && window.history.replaceState) {
          const cleanSearch = window.location.search.replace(/[?&]demo=1(&|$)/, '').replace(/\?$/, '');
          const cleanHash = window.location.hash.replace(/[?&]demo=1(&|$)/, '').replace(/\?$/, '');
          const newUrl = window.location.pathname + cleanSearch + cleanHash;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    } catch {
      // Safe fallback
    }
  }, []);

  return null;
};

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <DemoParamChecker />
      <Routes>
        {/* Direct root shortcuts */}
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

        {/* Onboarding Routes */}
        <Route
          element={
            <OnboardingGuard>
              <OnboardingLayout />
            </OnboardingGuard>
          }
        >
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/setup/income" element={<IncomePage />} />
          <Route path="/setup/savings" element={<SavingsPage />} />
        </Route>

        {/* 3-Second Loading Animation */}
        <Route path="/loading" element={<LoadingPage />} />

        {/* Main App Routes */}
        <Route
          path="/app"
          element={
            <ProtectedAppRoute>
              <AppLayout />
            </ProtectedAppRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="fallback" element={<FallbackPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        {/* Fallback & Default Route */}
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
};
