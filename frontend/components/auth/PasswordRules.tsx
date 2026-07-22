"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Rule {
  label: string;
  ok: boolean;
}

export function passwordRules(pw: string): Rule[] {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    {
      label: "One uppercase & one lowercase letter",
      ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    },
    { label: "One number", ok: /\d/.test(pw) },
    { label: "One symbol", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
}

export function allRulesPass(pw: string): boolean {
  return passwordRules(pw).every((r) => r.ok);
}

export function PasswordRules({ password }: { password: string }) {
  const rules = passwordRules(password);
  return (
    <ul className="mt-3 grid gap-1.5">
      {rules.map((r) => (
        <li
          key={r.label}
          className={cn(
            "flex items-center gap-2 text-xs",
            r.ok ? "text-brand-600" : "text-text-faint",
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full",
              r.ok ? "bg-brand-100 text-brand-600" : "bg-surface-subtle text-text-faint",
            )}
          >
            {r.ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
          </span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}
