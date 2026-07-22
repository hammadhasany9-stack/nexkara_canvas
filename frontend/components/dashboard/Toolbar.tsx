"use client";

import { LayoutGrid, List, Search, Upload, X } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  home: "Home",
  recents: "Recents",
  shared: "Shared with me",
  trash: "Trash",
};

export function Toolbar() {
  const { section, query, setQuery, view, setView, prototypes, counts, openUpload } =
    useDashboard();

  const people = new Set<string>();
  prototypes.forEach((p) => [p.owner, ...p.people].forEach((u) => people.add(u.id)));
  const title = query ? `Results for “${query}”` : TITLES[section] ?? "Home";

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-strong">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {counts.home} prototype{counts.home === 1 ? "" : "s"} · {people.size}{" "}
            collaborator{people.size === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prototypes…"
              className="h-10 w-56 rounded-input border border-border bg-surface pl-9 pr-8 text-sm text-text-strong placeholder:text-text-faint focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex rounded-control border border-border bg-surface p-0.5">
            <ToggleBtn active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
              <LayoutGrid size={16} />
            </ToggleBtn>
            <ToggleBtn active={view === "list"} onClick={() => setView("list")} label="List view">
              <List size={16} />
            </ToggleBtn>
          </div>

          <Button onClick={openUpload}>
            <Upload size={16} /> Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors",
        active ? "bg-brand-100 text-brand-700" : "text-text-muted hover:text-text-strong",
      )}
    >
      {children}
    </button>
  );
}
