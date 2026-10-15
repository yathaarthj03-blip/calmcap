import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { specFromVersion } from '../../engine/plan';
import { generateMilestones } from '../../engine/milestones';

const STATUS_LINES = ['Reading your goal', 'Fitting your plan', 'Drawing your roadmap'];

export const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const [lineIndex, setLineIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    // Perform real work right away before animation finishes
    const state = useStore.getState();
    const activeVersion = state.planVersions[state.planVersions.length - 1];
    const spec = specFromVersion(activeVersion);
    const initialMilestones = generateMilestones(spec, activeVersion.goal.startMonth, 'v1');

    useStore.setState({
      milestones: initialMilestones,
      settings: {
        ...state.settings,
        onboardingComplete: true,
      },
    });

    const totalDuration = mql.matches ? 600 : 3000;
    const intervalDuration = totalDuration / 3;

    const interval = setInterval(() => {
      setLineIndex((prev) => Math.min(prev + 1, STATUS_LINES.length - 1));
    }, intervalDuration);

    const timer = setTimeout(() => {
      navigate('/app/dashboard', { replace: true });
    }, totalDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="flex flex-col items-center max-w-sm w-full text-center">
        {/* Animated Corridor Mark */}
        <div className="w-28 h-28 relative mb-8 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shaded Corridor Band filling to 15% opacity */}
            <motion.path
              d="M15 65 L85 25 L85 85 Z"
              fill="rgb(var(--accent))"
              initial={{ fillOpacity: 0 }}
              animate={{ fillOpacity: 0.15 }}
              transition={{
                duration: prefersReducedMotion ? 0.4 : 2.5,
                ease: 'easeOut',
              }}
            />

            {/* Upper line drawing itself */}
            <motion.path
              d="M15 65 L85 25"
              stroke="rgb(var(--accent))"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.3 : 2.4,
                ease: 'easeInOut',
              }}
            />

            {/* Lower line drawing itself */}
            <motion.path
              d="M15 65 L85 85"
              stroke="rgb(var(--accent))"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.3 : 2.4,
                ease: 'easeInOut',
              }}
            />
          </svg>
        </div>

        {/* 3 Swapping status lines */}
        <div className="h-8 flex items-center justify-center relative w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={lineIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-base font-medium text-ink font-display"
            >
              {STATUS_LINES[lineIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-xs text-muted mt-2">
          CalmCap is building your personalized financial corridor…
        </p>
      </div>

      {/* Thin progress rule along the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-line/40">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{
            duration: prefersReducedMotion ? 0.6 : 3.0,
            ease: 'linear',
          }}
        />
      </div>
    </div>
  );
};
