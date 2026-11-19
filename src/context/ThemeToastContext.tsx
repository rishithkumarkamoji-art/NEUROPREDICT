import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type Theme = 'light' | 'dark';
type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ThemeToastContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  notify: (type: ToastType, title: string, message?: string) => void;
}

const ThemeToastContext = createContext<ThemeToastContextValue | null>(null);

export function ThemeToastProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('neuropredict_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('neuropredict_theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const notify = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ThemeToastContext.Provider value={{ theme, toggleTheme, setTheme, notify }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg"
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
              {t.message && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{t.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ThemeToastContext.Provider>
  );
}

export function useThemeToast() {
  const ctx = useContext(ThemeToastContext);
  if (!ctx) throw new Error('useThemeToast must be used within ThemeToastProvider');
  return ctx;
}
