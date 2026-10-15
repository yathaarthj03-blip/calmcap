import React from 'react';

export const DisclaimerFooter: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <footer className={`mt-12 pt-6 pb-8 border-t border-line/60 text-xs text-muted text-center ${className}`}>
      <p>CalmCap · Educational demo with simulated numbers. Not investment advice.</p>
    </footer>
  );
};
