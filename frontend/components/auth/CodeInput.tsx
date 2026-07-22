"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  value: string[];
  onChange: (code: string[]) => void;
  shake?: boolean;
  autoFocus?: boolean;
  onComplete?: () => void;
}

export function CodeInput({
  value,
  onChange,
  shake,
  autoFocus,
  onComplete,
}: CodeInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setCell = (i: number, digit: string) => {
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) onComplete?.();
  };

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setCell(i, "");
      return;
    }
    if (digits.length === 1) {
      setCell(i, digits);
      return;
    }
    // Multi-char (e.g. mobile autofill) -> distribute from this cell.
    const next = [...value];
    for (let k = 0; k < digits.length && i + k < 6; k++) {
      next[i + k] = digits[k];
    }
    onChange(next);
    const last = Math.min(i + digits.length, 5);
    refs.current[last]?.focus();
    if (next.join("").length === 6) onComplete?.();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = ["", "", "", "", "", ""];
    for (let k = 0; k < digits.length; k++) next[k] = digits[k];
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
    if (digits.length === 6) onComplete?.();
  };

  return (
    <div className={cn("flex gap-2.5 sm:gap-3", shake && "animate-shake")}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? 6 : 1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-14 w-full min-w-0 rounded-input border border-border bg-surface text-center text-xl font-semibold text-text-strong",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand-600",
          )}
        />
      ))}
    </div>
  );
}
