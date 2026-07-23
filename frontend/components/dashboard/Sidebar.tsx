"use client";

import * as React from "react";
import { Bell, ChevronRight, Clock, Home, Share2, Trash2 } from "lucide-react";
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
                "dash-navitem flex h-9 items-center justify-between rounded-[9px] px-2.5 text-[0.84rem] font-medium",
                active ? "bg-brand-100 text-brand-700" : "text-text-body",
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={16} /> {label}
              </span>
              <span className="font-mono text-[0.6rem] text-text-faint">{counts[id] ?? 0}</span>
            </button>
          );
        })}

        <button
          ref={notifRef}
          onClick={toggleNotif}
          className="dash-navitem flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[0.84rem] font-medium text-text-body"
        >
          <Bell size={16} />
          <span className="flex-1 text-left">Notifications</span>
          {unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1.5 font-mono text-[0.56rem] font-bold text-white">
              {unread}
            </span>
          )}
          <ChevronRight size={15} className="text-text-faint" />
        </button>
      </nav>

      <NotificationsPanel anchorRef={notifRef} />


      <div className="mt-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
          Shared users
        </p>
        <div className="grid gap-0.5">
          {people.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm">
              <Avatar person={p} size={26} />
              <span className="truncate text-text-body">{p.display_name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
