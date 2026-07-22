import { cn } from "@/lib/utils";

/**
 * Nexkara brand wordmark (real asset, imported from the design project).
 * The PNG is a blue→green gradient wordmark on transparency; in dark mode we
 * render it white (matches the prototype's dark treatment) so the dark-blue
 * half stays legible on the navy surface.
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/nexkara-logo.png"
      alt="Nexkara"
      width={682}
      height={157}
      className={cn(
        "h-7 w-auto select-none dark:brightness-0 dark:invert",
        className,
      )}
    />
  );
}
