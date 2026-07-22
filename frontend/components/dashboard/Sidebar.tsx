"use client";

import { Clock, Home, Settings, Share2, Trash2 } from "lucide-react";
import type { Section } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "recents", label: "Recents", icon: Clock },
  { id: "shared", label: "Shared with me", icon: Share2 },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function Sidebar() {
  const { section, setSection, counts, openSettings } = useDashboard();
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface/50 p-3 md:flex">
      <nav className="grid gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center justify-between rounded-control px-3 py-2 text-sm font-medium transition-colors",
              section === id
                ? "bg-brand-100 text-brand-700"
                : "text-text-muted hover:bg-surface-subtle hover:text-text-strong",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Icon size={17} /> {label}
            </span>
            {counts[id] > 0 && (
              <span className="rounded-full bg-surface-subtle px-1.5 text-[11px] text-text-muted">
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-border pt-3">
        <button
          onClick={() => openSettings("profile")}
          className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-strong"
        >
          <Settings size={17} /> Settings
        </button>
        <LogoutButton />
      </div>
    </aside>
  );
}
