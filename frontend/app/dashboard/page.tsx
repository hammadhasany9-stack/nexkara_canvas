"use client";

import * as React from "react";
import { useDashboard } from "@/store/useDashboard";
import { Topbar } from "@/components/dashboard/Topbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Toolbar } from "@/components/dashboard/Toolbar";
import { PrototypeCard } from "@/components/dashboard/PrototypeCard";
import { PrototypeRow } from "@/components/dashboard/PrototypeRow";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { RenameModal } from "@/components/dashboard/RenameModal";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

export default function DashboardPage() {
  const { view, query, prototypes, loading, loadMe, refresh, loadNotifications, openSettings } =
    useDashboard();

  React.useEffect(() => {
    loadMe();
    refresh();
    loadNotifications();
    // deep-link: /dashboard?settings=1 (from the prototype's settings bridge)
    const params = new URLSearchParams(window.location.search);
    if (params.get("settings")) openSettings("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <Topbar />
      <NotificationsPanel />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <Toolbar />

          {loading && prototypes.length === 0 ? (
            <div className="py-20 text-center text-sm text-text-muted">Loading…</div>
          ) : prototypes.length === 0 ? (
            <EmptyState hasQuery={!!query} />
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
              {prototypes.map((p) => (
                <PrototypeCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="grid gap-2">
              {prototypes.map((p) => (
                <PrototypeRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </main>
      </div>

      <UploadModal />
      <ShareModal />
      <SettingsModal />
      <RenameModal />
      <ConfirmDialog />
    </div>
  );
}
