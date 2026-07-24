"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast, type ToastKind } from "@/store/useToast";
import { cn } from "@/lib/utils";

const ICON: Record<ToastKind, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastKind, string> = {
  success: "text-brand-600",
  error: "text-danger",
  info: "text-patina",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2.5">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className="lp-toast pointer-events-auto flex items-start gap-2.5 rounded-input border border-border bg-[var(--surface)] p-3.5 shadow-[var(--shadow-modal)]"
          >
            <Icon size={18} className={cn("mt-0.5 shrink-0", ACCENT[t.kind])} />
            <p className="flex-1 text-sm text-text-body">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-text-faint hover:text-text-strong"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
