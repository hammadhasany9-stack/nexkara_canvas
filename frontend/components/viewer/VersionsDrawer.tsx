"use client";

import { X } from "lucide-react";
import { useViewer } from "@/store/useViewer";
import { cn } from "@/lib/utils";

export function VersionsDrawer() {
  const { versionsOpen, toggleVersions, versions, version, pickVersion } = useViewer();
  if (!versionsOpen) return null;

  return (
    <>
      <div className="lp-overlay fixed inset-0 z-40 bg-black/40" onClick={toggleVersions} />
      <div className="lp-drawer-left fixed left-0 top-0 z-50 h-full w-80 border-r border-border bg-[var(--surface)] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-strong">Versions</h2>
          <button onClick={toggleVersions} className="lp-iconbtn rounded-control p-1 text-text-faint hover:bg-[var(--surface-subtle)] hover:text-text-strong"><X size={18} /></button>
        </div>
        <div className="grid gap-2">
          {versions.map((v) => (
            <button key={v.id} onClick={() => pickVersion(v.version)}
              className={cn("lp-press flex items-center justify-between rounded-input border px-3 py-2.5 text-left transition-colors",
                v.version === version ? "border-brand-600 bg-brand-50" : "border-border hover:bg-[var(--surface-subtle)]")}>
              <span>
                <span className="block text-sm font-semibold text-text-strong">{v.label}</span>
                <span className="block font-mono text-[11px] text-text-faint">v{v.version} · {v.comment_count} comment(s)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: v.current ? "var(--brand-600)" : "var(--text-faint)" }} />
                {v.current && <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">Current</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
