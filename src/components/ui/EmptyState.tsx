import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-panel border border-dashed border-line bg-surface/50">
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-muted mb-3">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-4 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium rounded-ctl bg-accent text-on-accent hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
