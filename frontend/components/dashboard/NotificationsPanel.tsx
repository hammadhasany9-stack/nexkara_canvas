"use client";

import * as React from "react";
import { apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useDashboard } from "@/store/useDashboard";
import { Avatar } from "@/components/ui/avatar";

export function NotificationsPanel() {
  const { notifOpen, toggleNotif, notifications, loadNotifications } = useDashboard();

  React.useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen, loadNotifications]);

  if (!notifOpen) return null;

  const markAll = async () => {
    await apiPost("/notifications/read-all");
    loadNotifications();
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={toggleNotif} aria-hidden />
      <div className="absolute right-5 top-16 z-40 w-80 overflow-hidden rounded-card border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold text-text-strong">Notifications</h3>
          <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">You're all caught up.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 border-b border-border px-4 py-3 ${n.read ? "" : "bg-brand-50"}`}
              >
                {n.actor ? (
                  <Avatar person={n.actor} size={30} />
                ) : (
                  <span className="h-[30px] w-[30px] rounded-full bg-surface-subtle" />
                )}
                <div className="text-sm">
                  <p className="text-text-body">
                    <span className="font-medium text-text-strong">
                      {n.actor?.display_name ?? "Someone"}
                    </span>{" "}
                    {n.verb}
                  </p>
                  <p className="text-xs text-text-faint">{relativeTime(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
