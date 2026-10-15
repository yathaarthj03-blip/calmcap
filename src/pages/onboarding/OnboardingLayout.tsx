import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CorridorMark } from '../../components/ui/CorridorMark';
import { DisclaimerFooter } from '../../components/ui/DisclaimerFooter';

export const OnboardingLayout: React.FC = () => {
  const location = useLocation();

  // Auto-scroll to top when moving to next step or route
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const getStep = () => {
    if (location.pathname.includes('/welcome')) return 1;
    if (location.pathname.includes('/setup/income')) return 2;
    if (location.pathname.includes('/setup/savings')) return 3;
    return 1;
  };

  const step = getStep();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header with CalmCap Brand and 3-Segment Progress Indicator */}
      <header className="max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto w-full flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CorridorMark size={62} className="drop-shadow-md" />
          <span className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-ink">CalmCap</span>
        </div>

        {/* 3-segment progress indicator */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-accent'
                  : s < step
                  ? 'w-4 bg-accent/40'
                  : 'w-4 bg-line'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Form Container - Widened for laptop viewing while preserving mobile width */}
      <div className="max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center">
        <Outlet />
      </div>

      <DisclaimerFooter className="mt-8" />
    </div>
  );
};
