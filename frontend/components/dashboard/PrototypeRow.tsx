"use client";

import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { toast } from "@/store/useToast";
import { relativeTime } from "@/lib/format";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { cn } from "@/lib/utils";
import { PreviewFrame } from "./PreviewFrame";

// Shared column template so the header row and body rows stay aligned.
export const ROW_COLS =
  "grid-cols-[minmax(160px,2.4fr)_70px_96px_104px_80px_132px]";

// Deterministic hue per prototype so the type chip color is stable across renders.
const HUES = ["#00896b", "#14618c", "#8a5cf6", "#c2410c", "#0891b2", "#be185d"];
function hueFor(id: string) {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0)) % HUES.length;
  return HUES[n];
}

export function PrototypeRow({ p }: { p: Prototype }) {
  const router = useRouter();
  const { openShare, openRename, askConfirm, refresh } = useDashboard();
  const canManage = p.my_access === "manager";
  const canEdit = p.my_access === "editor" || canManage;
  const people = p.people.length ? p.people : [p.owner];

  const trash = () =>
    askConfirm({
      title: "Move to trash?",
      body: `“${p.name}” will be moved to Trash. You can restore it later.`,
      label: "Move to trash",
      onConfirm: async () => {
        await apiPost(`/prototypes/${p.id}/trash`);
        toast.success(`“${p.name}” moved to Trash.`);
        refresh();
      },
    });
  const restore = async () => {
    await apiPost(`/prototypes/${p.id}/restore`);
    toast.success(`“${p.name}” restored.`);
    refresh();
  };
  const remove = () =>
    askConfirm({
      title: "Delete permanently?",
      body: `“${p.name}” will be permanently deleted. This cannot be undone.`,
      label: "Delete permanently",
      onConfirm: async () => {
        await apiDelete(`/prototypes/${p.id}`);
        toast.success(`“${p.name}” deleted.`);
        refresh();
      },
    });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/p/${p.id}`)}
      className={cn(
        "dash-row grid items-center gap-3 border-b border-border-subtle px-[18px] py-[13px] text-left last:border-b-0 hover:bg-surface-subtle",
        ROW_COLS,
      )}
    >
      {/* Name */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="relative grid h-[30px] w-[44px] shrink-0 place-items-center overflow-hidden rounded-md ring-1 ring-border"
          style={{ background: hueFor(p.id) }}
        >
          <PreviewFrame id={p.id} version={p.version} className="absolute inset-0 h-full w-full" />
        </span>
        <span className="truncate text-[0.9rem] font-semibold text-text-strong">{p.name}</span>
      </div>

      {/* Version */}
      <span className="justify-self-start rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[0.66rem] font-semibold text-brand-600">
        v{p.version}
      </span>

      {/* Comments */}
      <span className="text-[0.8rem] text-text-muted">{p.comment_count}</span>

      {/* Last edited */}
      <span className="truncate text-[0.8rem] text-text-muted">{relativeTime(p.updated_at)}</span>

      {/* Users */}
      <div className="flex -space-x-2">
        {people.slice(0, 3).map((u) => (
          <span
            key={u.id}
            title={u.display_name}
            className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--surface)]"
            style={{ background: "linear-gradient(135deg,#5aa9e0,#3d7fb8)" }}
          >
            {u.initials}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div
        className="dash-row-actions flex justify-end gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {!p.trashed ? (
          <>
            {canEdit && <RowBtn title="Rename" onClick={() => openRename(p)}><Pencil size={15} /></RowBtn>}
            {canManage && <RowBtn title="Share" onClick={() => openShare(p)}><Share2 size={15} /></RowBtn>}
            {canManage && <RowBtn title="Move to trash" onClick={trash}><Trash2 size={15} /></RowBtn>}
          </>
        ) : (
          canManage && (
            <>
              <RowBtn title="Restore" onClick={restore}><RotateCcw size={15} /></RowBtn>
              <RowBtn title="Delete permanently" onClick={remove}><Trash2 size={15} /></RowBtn>
            </>
          )
        )}
      </div>
    </div>
  );
}

function RowBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600"
    >
      {children}
    </button>
  );
}
