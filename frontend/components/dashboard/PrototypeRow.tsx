"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { AvatarStack } from "@/components/ui/avatar";
import { Thumbnail } from "./Thumbnail";

export function PrototypeRow({ p }: { p: Prototype }) {
  const router = useRouter();
  const { openShare, openRename, askConfirm, refresh } = useDashboard();
  const canManage = p.my_access === "manager";
  const canEdit = p.my_access === "editor" || canManage;

  const trash = async () => {
    await apiPost(`/prototypes/${p.id}/trash`);
    refresh();
  };
  const restore = async () => {
    await apiPost(`/prototypes/${p.id}/restore`);
    refresh();
  };
  const remove = () =>
    askConfirm({
      title: "Delete permanently?",
      body: `"${p.name}" and all its versions will be permanently deleted.`,
      label: "Delete forever",
      onConfirm: async () => {
        await apiDelete(`/prototypes/${p.id}`);
        refresh();
      },
    });

  return (
    <div className="group flex items-center gap-4 rounded-input border border-border bg-surface px-3 py-2.5 hover:bg-surface-subtle">
      <button onClick={() => router.push(`/p/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md">
          <Thumbnail id={p.id} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-text-strong">{p.name}</span>
            <span className="rounded bg-surface-subtle px-1.5 text-[11px] text-text-muted">v{p.version}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1"><MessageSquare size={11} />{p.comment_count}</span>
            <span>{relativeTime(p.updated_at)}</span>
            <span>{p.team}</span>
          </div>
        </div>
      </button>

      <AvatarStack people={p.people.length ? p.people : [p.owner]} size={24} />

      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!p.trashed ? (
          <>
            {canManage && <RowBtn title="Share" onClick={() => openShare(p)}><Share2 size={15} /></RowBtn>}
            {canEdit && <RowBtn title="Rename" onClick={() => openRename(p)}><Pencil size={15} /></RowBtn>}
            {canManage && <RowBtn title="Trash" onClick={trash}><Trash2 size={15} /></RowBtn>}
          </>
        ) : (
          canManage && (
            <>
              <RowBtn title="Restore" onClick={restore}><RotateCcw size={15} /></RowBtn>
              <RowBtn title="Delete forever" onClick={remove}><Trash2 size={15} /></RowBtn>
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
      className="flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:bg-surface hover:text-text-strong"
    >
      {children}
    </button>
  );
}
