"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { JSX } from "react";

const VARIANT_STYLES: Record<string, { bg: string; icon: JSX.Element; accent: string }> = {
  success: {
    bg: "border-emerald-400/40 bg-emerald-900/40",
    accent: "text-emerald-300",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-7.071 7.07a1 1 0 01-1.414 0L3.293 8.85a1 1 0 011.414-1.414l3.1 3.1 6.364-6.364a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    bg: "border-sky-400/40 bg-sky-900/40",
    accent: "text-sky-300",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M9 7h2V5H9v2zm0 8h2v-6H9v6z" />
      </svg>
    ),
  },
  warning: {
    bg: "border-amber-400/40 bg-amber-900/40",
    accent: "text-amber-300",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M9 7h2v4H9V7zm0 6h2v2H9v-2z" />
      </svg>
    ),
  },
  error: {
    bg: "border-rose-400/40 bg-rose-900/40",
    accent: "text-rose-300",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 012 0v2a1 1 0 01-2 0v-2zm0-6a1 1 0 112 0v4a1 1 0 11-2 0V7z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export type ToastOptions = {
  id?: number;
  title?: string;
  description?: string;
  variant?: "success" | "info" | "warning" | "error";
  action?: { label: string; href?: string; onClick?: () => void };
  duration?: number;
};

type ToastInternal = ToastOptions & { id: number; createdAt: number; duration: number };

const ToastContext = createContext<{ toast: (options: ToastOptions) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const timers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ duration = 3500, ...options }: ToastOptions) => {
      const id = options.id ?? Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { ...options, id, duration, createdAt: Date.now() }]);
      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
    },
    [removeToast],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} dismiss={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, dismiss }: { toast: ToastInternal; dismiss: () => void }) {
  const variantKey = toast.variant ?? "success";
  const { bg, icon, accent } = VARIANT_STYLES[variantKey] ?? VARIANT_STYLES.success;

  return (
    <div className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${bg}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${accent}`}>{icon}</div>
        <div className="flex-1">
          {toast.title ? <div className="text-sm font-semibold text-slate-50">{toast.title}</div> : null}
          {toast.description ? (
            <div className="text-sm text-slate-200/80">{toast.description}</div>
          ) : null}
          {toast.action ? (
            <div className="mt-2 text-xs font-semibold text-slate-100/80">
              <button
                className="underline decoration-dotted"
                onClick={() => {
                  if (toast.action?.onClick) toast.action.onClick();
                  if (toast.action?.href) window.open(toast.action.href, "_blank");
                }}
              >
                {toast.action.label}
              </button>
            </div>
          ) : null}
        </div>
        <button
          className="text-slate-400 transition hover:text-slate-200"
          onClick={dismiss}
          aria-label="Close toast"
        >
          ×
        </button>
      </div>
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-white/40"
          style={{
            animation: `toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
      <style jsx>{`
        @keyframes toast-progress {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
