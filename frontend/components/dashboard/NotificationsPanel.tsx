"use client";

import * as React from "react";
import { apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { useDashboard } from "@/store/useDashboard";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";

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
    <Modal
      open={notifOpen}
      onClose={toggleNotif}
      title="Notifications"
      subtitle={<button onClick={markAll} className="text-brand-600 hover:text-brand-700">Mark all read</button>}
      size="sm"
    >
      <div className="max-h-[26rem] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">You&apos;re all caught up.</p>
        ) : (
          <div className="grid gap-1">
            {notifications.map((n) => (
              <div key={n.id} className={`flex gap-3 rounded-input px-2 py-2.5 ${n.read ? "" : "bg-brand-50"}`}>
                {n.actor ? <Avatar person={n.actor} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-[var(--surface-subtle)]" />}
                <div className="text-sm">
                  <p className="text-text-body">
                    <span className="font-medium text-text-strong">{n.actor?.display_name ?? "Someone"}</span> {n.verb}
                  </p>
                  <p className="text-xs text-text-faint">{relativeTime(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
