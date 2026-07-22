import { hueFor } from "@/lib/format";

/** Deterministic abstract-art placeholder keyed by prototype id. */
export function Thumbnail({ id, className }: { id: string; className?: string }) {
  const hue = hueFor(id);
  const hue2 = (hue + 40) % 360;
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${hue2} 50% 32%))`,
      }}
    >
      <svg viewBox="0 0 320 180" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <circle cx="70" cy="60" r="70" fill={`hsl(${hue2} 60% 55% / 0.25)`} />
        <rect x="180" y="90" width="140" height="140" rx="24" fill={`hsl(${hue} 55% 60% / 0.20)`} />
        <rect x="40" y="120" width="120" height="12" rx="6" fill="#ffffff30" />
        <rect x="40" y="142" width="80" height="12" rx="6" fill="#ffffff20" />
      </svg>
    </div>
  );
}
