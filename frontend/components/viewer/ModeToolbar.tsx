"use client";

import { Clock, MessageSquare, MousePointer2, Share2 } from "lucide-react";
import { useViewer } from "@/store/useViewer";
import { cn } from "@/lib/utils";

export function ModeToolbar() {
  const { mode, setMode, comments, version, toggleShare, toggleVersions, shareOpen, versionsOpen } = useViewer();
  const activeComments = comments.filter((c) => c.version === version && !c.resolved).length;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border bg-[var(--surface)]/95 p-1.5 shadow-2xl backdrop-blur">
        <Tool active={mode === "browse"} onClick={() => setMode("browse")} tip="Browse">
          <MousePointer2 size={18} />
        </Tool>
        <Tool active={mode === "comment"} onClick={() => setMode(mode === "comment" ? "browse" : "comment")} tip="Comment" badge={activeComments}>
          <MessageSquare size={18} />
        </Tool>
        <span className="mx-1 h-6 w-px bg-border" />
        <Tool active={shareOpen} onClick={toggleShare} tip="Share">
          <Share2 size={18} />
        </Tool>
        <Tool active={versionsOpen} onClick={toggleVersions} tip="Versions">
          <Clock size={18} />
        </Tool>
      </div>
    </div>
  );
}

function Tool({ active, onClick, tip, badge, children }: { active: boolean; onClick: () => void; tip: string; badge?: number; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={tip}
      className={cn("relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
        active ? "bg-brand-100 text-brand-700" : "text-text-muted hover:bg-[var(--surface-subtle)] hover:text-text-strong")}>
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
