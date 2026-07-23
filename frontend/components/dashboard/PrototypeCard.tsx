"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { AvatarStack } from "@/components/ui/avatar";

export function PrototypeCard({ p }: { p: Prototype }) {
  const router = useRouter();
  const { openShare, openRename, askConfirm, refresh } = useDashboard();
  const inTrash = p.trashed;
  const canManage = p.my_access === "manager";
  const canEdit = p.my_access === "editor" || canManage;

  const open = () => router.push(`/p/${p.id}`);
  const trash = () =>
    askConfirm({
      title: "Move to trash?",
      body: `“${p.name}” will be moved to Trash. You can restore it later.`,
      label: "Move to trash",
      onConfirm: async () => { await apiPost(`/prototypes/${p.id}/trash`); refresh(); },
    });
  const restore = async () => { await apiPost(`/prototypes/${p.id}/restore`); refresh(); };
  const remove = () =>
    askConfirm({
      title: "Delete permanently?",
      body: `“${p.name}” will be permanently deleted. This cannot be undone.`,
      label: "Delete permanently",
      onConfirm: async () => { await apiDelete(`/prototypes/${p.id}`); refresh(); },
    });

  return (
    <div className="dash-card group relative overflow-hidden rounded-[14px] border border-border bg-[var(--surface)] transition-shadow hover:shadow-[var(--shadow-md)]">
      {/* thumbnail */}
      <button onClick={open} className="block w-full">
        <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-[var(--surface-subtle)]">
          <span className="absolute left-2.5 top-2.5 rounded-md bg-[var(--surface)]/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted ring-1 ring-border">
            {p.type}
          </span>
          {/* no-preview frame */}
          <div className="h-[46%] w-[62%] translate-y-2 rounded-t-lg border border-border/70 bg-[var(--surface)]/40" />
        </div>
      </button>

      {/* hover actions */}
      <div className="dash-card-actions absolute right-2.5 top-2.5 flex gap-1">
        {!inTrash ? (
          <>
            {canManage && <Act title="Share" onClick={() => openShare(p)}><Share2 size={15} /></Act>}
            {canEdit && <Act title="Rename" onClick={() => openRename(p)}><Pencil size={15} /></Act>}
            {canManage && <Act title="Move to trash" onClick={trash}><Trash2 size={15} /></Act>}
          </>
        ) : (
          canManage && (
            <>
              <Act title="Restore" onClick={restore}><RotateCcw size={15} /></Act>
              <Act title="Delete forever" onClick={remove}><Trash2 size={15} /></Act>
            </>
          )
        )}
      </div>

      {/* body */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button onClick={open} className="min-w-0 text-left">
            <h3 className="truncate font-semibold text-text-strong">{p.name}</h3>
          </button>
          <span className="shrink-0 rounded-full border border-brand-600/40 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
            v{p.version}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <MessageSquare size={13} />
              {p.comment_count} comment{p.comment_count === 1 ? "" : "s"}
            </span>
            <span className="text-text-faint">{relativeTime(p.updated_at)}</span>
          </div>
          <AvatarStack people={p.people.length ? p.people : [p.owner]} size={22} />
        </div>
      </div>
    </div>
  );
}

function Act({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-[var(--surface)]/90 text-text-muted backdrop-blur hover:text-text-strong"
    >
      {children}
    </button>
  );
}
