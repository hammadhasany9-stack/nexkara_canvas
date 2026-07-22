import { cn } from "@/lib/utils";

/** Nexkara wordmark + mark. (Swap the SVG for the real logo asset when available.) */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand-600)" />
        <path
          d="M10 22V10l12 12V10"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-text-strong">
          Nexkara
        </span>
      )}
    </span>
  );
}
