"use client";

import * as React from "react";
import { Bell, Clock, Home, Share2, Trash2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Person, Section } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Avatar } from "@/components/ui/avatar";
import { NotificationsPanel } from "./NotificationsPanel";
import { cn } from "@/lib/utils";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "recents", label: "Recents", icon: Clock },
  { id: "shared", label: "Shared with me", icon: Share2 },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export function Sidebar() {
  const { section, setSection, counts, unread, toggleNotif } = useDashboard();
  const [people, setPeople] = React.useState<Person[]>([]);
  const notifRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    apiGet<Person[]>("/users/directory").then(setPeople).catch(() => {});
  }, []);

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col gap-1 border-r border-border bg-[var(--surface)]/40 px-3 py-4 md:flex">
      <nav className="grid gap-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "dash-navitem flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-medium",
                active ? "bg-brand-100 text-brand-700" : "text-text-muted",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} /> {label}
              </span>
              <span className="text-xs text-text-faint">{counts[id] ?? 0}</span>
            </button>
          );
        })}

        <button
          ref={notifRef}
          onClick={toggleNotif}
          className="dash-navitem flex items-center justify-between rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-muted"
        >
          <span className="flex items-center gap-3">
            <Bell size={18} /> Notifications
          </span>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </nav>

      <NotificationsPanel anchorRef={notifRef} />


      <div className="mt-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
          Shared users
        </p>
        {people.length > 0 ? (
          <div className="grid gap-0.5">
            {people.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm">
                <Avatar person={p} size={26} />
                <span className="truncate text-text-body">{p.display_name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 text-xs text-text-faint">No collaborators yet</p>
        )}
      </div>
    </aside>
  );
}
