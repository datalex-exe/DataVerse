import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, message, type };
    
    setToasts((prev) => [...prev.slice(-3), newToast]); // keep at most 4 toasts

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    info: (msg: string) => showToast(msg, 'info'),
  }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      {/* Toast Notification Floating Container */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        role="status"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
              item.type === 'success'
                ? 'bg-[var(--card)] border-emerald-500/40 text-[var(--text)] shadow-emerald-500/10'
                : item.type === 'error'
                ? 'bg-[var(--card)] border-[var(--danger)]/40 text-[var(--text)] shadow-[var(--danger)]/10'
                : 'bg-[var(--card)] border-[var(--accent-2)]/40 text-[var(--text)] shadow-[var(--shadow-card)]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" aria-hidden="true" />
              )}
              {item.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" aria-hidden="true" />
              )}
              {item.type === 'info' && (
                <Info className="w-5 h-5 text-[var(--accent-2)] flex-shrink-0" aria-hidden="true" />
              )}
              <span className="text-xs font-semibold leading-snug break-words">
                {item.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => console.log(msg),
      toast: {
        success: (msg: string) => console.log(msg),
        error: (msg: string) => console.error(msg),
        info: (msg: string) => console.info(msg),
      },
    };
  }
  return context;
};
