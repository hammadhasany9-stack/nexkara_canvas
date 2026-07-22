"use client";

import { Bell, Settings } from "lucide-react";
import type { Person } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { Avatar, AvatarStack } from "@/components/ui/avatar";

export function Topbar() {
  const { me, prototypes, unread, toggleNotif, openSettings } = useDashboard();

  // presence = unique collaborators across loaded prototypes
  const seen = new Map<string, Person>();
  prototypes.forEach((p) => [p.owner, ...p.people].forEach((u) => seen.set(u.id, u)));
  const presence = Array.from(seen.values()).slice(0, 5);

  const meAsPerson: Person | null = me
    ? { id: me.id, display_name: me.display_name, initials: initials(me.display_name) }
    : null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-5 backdrop-blur">
      <Logo />
      <div className="flex-1" />

      {presence.length > 0 && (
        <div className="hidden items-center gap-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-600 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
          </span>
          <AvatarStack people={presence} size={26} />
        </div>
      )}

      <ThemeToggle />

      <button
        onClick={toggleNotif}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface text-text-muted hover:text-text-strong"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <button
        onClick={() => openSettings("profile")}
        className="flex items-center gap-2 rounded-control border border-border bg-surface py-1 pl-1 pr-2.5 hover:bg-surface-subtle"
      >
        {meAsPerson && <Avatar person={meAsPerson} size={28} />}
        <span className="hidden text-sm font-medium text-text-body sm:block">
          {me?.display_name ?? ""}
        </span>
        <Settings size={15} className="text-text-faint" />
      </button>
    </header>
  );
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
