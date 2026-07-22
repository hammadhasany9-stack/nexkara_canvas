import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-input border bg-surface px-3.5 py-2 text-sm text-text-strong",
        "placeholder:text-text-faint transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid ? "border-danger focus-visible:ring-danger/40" : "border-border",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
