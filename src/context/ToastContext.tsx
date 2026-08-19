import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastType } from './toast-context';

interface ToastEntry {
  id: number;
  message: string;
  type: ToastType;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-2xl ${
              t.type === 'success' ? 'bg-forest-800' : 'bg-red-600'
            }`}
          >
            <span className="text-xl">{t.type === 'success' ? '✅' : '⚠️'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
