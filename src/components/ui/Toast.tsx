import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showInfo: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-success-500/10', border: 'border-success-500/30', text: 'text-success-400' },
  error:   { icon: AlertCircle,  bg: 'bg-error-500/10',   border: 'border-error-500/30',   text: 'text-error-400' },
  info:    { icon: Info,         bg: 'bg-brand-500/10',    border: 'border-brand-500/30',   text: 'text-brand-400' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const value: ToastContextValue = {
    showSuccess: (msg: string) => add('success', msg),
    showError: (msg: string) => add('error', msg),
    showInfo: (msg: string) => add('info', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              data-testid={`toast-${toast.type}`}
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border bg-surface-800 shadow-card-hover animate-slide-up pointer-events-auto ${style.border}`}
            >
              <Icon size={16} className={`flex-shrink-0 mt-0.5 ${style.text}`} />
              <p className="text-sm text-neutral-200 flex-1">{toast.message}</p>
              <button onClick={() => remove(toast.id)} className="text-neutral-600 hover:text-neutral-400 flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
