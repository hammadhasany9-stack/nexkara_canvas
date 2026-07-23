"use client";

import * as React from "react";
import { apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useDashboard } from "@/store/useDashboard";
import { Avatar } from "@/components/ui/avatar";

/** Dropdown anchored to the sidebar's Notifications item (matches the prototype). */
export function NotificationsPanel({ anchorRef }: { anchorRef: React.RefObject<HTMLElement> }) {
  const { notifOpen, toggleNotif, notifications, loadNotifications } = useDashboard();
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);

  React.useEffect(() => {
    if (!notifOpen) return;
    loadNotifications();
    const r = anchorRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.right + 10, top: Math.min(r.top, window.innerHeight - 460) });
  }, [notifOpen, loadNotifications, anchorRef]);

  if (!notifOpen || !pos) return null;
  const markAll = async () => { await apiPost("/notifications/read-all"); loadNotifications(); };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={toggleNotif} aria-hidden />
      <div
        className="fixed z-40 w-80 overflow-hidden rounded-card border border-border bg-[var(--surface)] shadow-2xl"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-text-strong">Notifications</h3>
          <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:text-brand-700">Mark all read</button>
        </div>
        <div className="max-h-[24rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">You&apos;re all caught up.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
                {n.actor ? <Avatar person={n.actor} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-[var(--surface-subtle)]" />}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-text-body">
                    <span className="font-semibold text-text-strong">{n.actor?.display_name ?? "Someone"}</span> {n.verb}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-faint">{relativeTime(n.created_at)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
