import { hueFor } from "@/lib/format";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({
  person,
  size = 28,
  className,
}: {
  person: Person;
  size?: number;
  className?: string;
}) {
  const hue = hueFor(person.id);
  return (
    <span
      title={person.display_name}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${hue} 60% 35%))`,
      }}
    >
      {person.initials}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = 28,
}: {
  people: Person[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar key={p.id} person={p} size={size} />
        ))}
      </div>
      {extra > 0 && (
        <span
          className="ml-1 inline-flex items-center justify-center rounded-full bg-surface-subtle text-text-muted font-medium"
          style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
