/** "Just now", "5m ago", "3h ago", "2d ago", else a date. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, (Date.now() - then) / 1000);
  if (secs < 45) return "Just now";
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.round(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const AVATAR_HUES = [200, 160, 12, 280, 340, 100];

/** Deterministic color for a person/prototype id. */
export function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}
