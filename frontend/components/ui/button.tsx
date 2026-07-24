import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-[background,color,transform,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-black/10",
        secondary:
          "bg-surface-subtle text-text-body hover:bg-surface border border-border",
        ghost: "text-text-muted hover:text-text-strong hover:bg-surface-subtle",
        link: "text-brand-600 hover:text-brand-700 underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
