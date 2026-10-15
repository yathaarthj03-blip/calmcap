import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, RotateCcw, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const Toast: React.FC = () => {
  const toast = useStore((s) => s.activeToast);
  const hideToast = useStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.type === 'undo' ? 10000 : 4000;
    const timer = setTimeout(() => {
      hideToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-ctl bg-ink text-surface shadow-lg max-w-md border border-line/20 text-sm"
            role="status"
            aria-live="polite"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
            {toast.type === 'warn' && <AlertTriangle className="w-4 h-4 text-mid shrink-0" />}
            {toast.type === 'undo' && <RotateCcw className="w-4 h-4 text-accent shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-safe shrink-0" />}

            <div className="flex-1 leading-snug">{toast.message}</div>

            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo?.();
                  hideToast();
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-accent text-on-accent hover:opacity-90 transition-opacity ml-1 shrink-0"
              >
                Undo
              </button>
            )}

            <button
              onClick={hideToast}
              className="p-1 text-muted hover:text-surface rounded transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
