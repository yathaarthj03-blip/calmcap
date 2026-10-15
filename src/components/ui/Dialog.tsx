import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  closable?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  closable = true,
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={closable ? onOpenChange : undefined}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm animate-fade-in" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${maxWidth} -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface p-6 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto`}
          onEscapeKeyDown={(e) => {
            if (!closable) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!closable) e.preventDefault();
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <RadixDialog.Title className="text-xl font-display font-semibold text-ink">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-sm text-muted mt-1">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            {closable && (
              <RadixDialog.Close asChild>
                <button
                  className="rounded-ctl p-1.5 text-muted hover:bg-surface-2 hover:text-ink transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </RadixDialog.Close>
            )}
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
