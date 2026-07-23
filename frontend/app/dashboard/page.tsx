"use client";

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/dashboard/Topbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Hero } from "@/components/dashboard/Hero";
import { PrototypeCard } from "@/components/dashboard/PrototypeCard";
import { PrototypeRow } from "@/components/dashboard/PrototypeRow";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { RenameModal } from "@/components/dashboard/RenameModal";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";

const TITLES: Record<string, string> = {
  home: "Home",
  recents: "Recents",
  shared: "Shared with me",
  trash: "Trash",
};

export default function DashboardPage() {
  const { view, setView, section, query, prototypes, loading, me, loadMe, refresh, loadNotifications, openSettings } =
    useDashboard();

  React.useEffect(() => {
    loadMe();
    refresh();
    loadNotifications();
    if (new URLSearchParams(window.location.search).get("settings")) openSettings("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Users given a temporary password must change it before continuing.
  React.useEffect(() => {
    if (me?.must_change_password) openSettings("password");
  }, [me, openSettings]);

  const title = query ? `Results for “${query}”` : TITLES[section] ?? "Home";

  return (
    <div className="min-h-screen bg-bg">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Hero />

          <div className="px-6 py-8 lg:px-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-strong">{title}</h2>
              <div className="flex rounded-control border border-border bg-[var(--surface)] p-0.5">
                <Toggle active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
                  <LayoutGrid size={16} />
                </Toggle>
                <Toggle active={view === "list"} onClick={() => setView("list")} label="List view">
                  <List size={16} />
                </Toggle>
              </div>
            </div>

            {loading && prototypes.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-muted">Loading…</div>
            ) : prototypes.length === 0 ? (
              <EmptyState hasQuery={!!query} />
            ) : view === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-4">
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
          </div>
        </main>
      </div>

      <UploadModal />
      <ShareModal />
      <SettingsPanel />
      <RenameModal />
      <ConfirmDialog />
    </div>
  );
}

function Toggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
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
