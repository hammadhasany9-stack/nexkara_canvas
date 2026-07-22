"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, MoreHorizontal, Pencil, RotateCcw, Share2, Trash2 } from "lucide-react";
import { apiDelete, apiPost } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { AvatarStack } from "@/components/ui/avatar";
import { Thumbnail } from "./Thumbnail";

export function PrototypeCard({ p }: { p: Prototype }) {
  const router = useRouter();
  const { openShare, openRename, askConfirm, refresh } = useDashboard();
  const inTrash = p.trashed;
  const canManage = p.my_access === "manager";
  const canEdit = p.my_access === "editor" || canManage;

  const open = () => router.push(`/p/${p.id}`);
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
      body: `"${p.name}" and all its versions will be permanently deleted. This can't be undone.`,
      label: "Delete forever",
      onConfirm: async () => {
        await apiDelete(`/prototypes/${p.id}`);
        refresh();
      },
    });

  return (
    <div className="group relative overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-lg">
      <button onClick={open} className="block w-full text-left">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Thumbnail id={p.id} className="h-full w-full" />
          <span className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {p.type}
          </span>
        </div>
      </button>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <button onClick={open} className="min-w-0 text-left">
            <h3 className="truncate font-semibold text-text-strong">{p.name}</h3>
          </button>
          <span className="shrink-0 rounded-md bg-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
            v{p.version}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <MessageSquare size={12} /> {p.comment_count}
          </span>
          <span>{relativeTime(p.updated_at)}</span>
          <span className="truncate">{p.team}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <AvatarStack people={p.people.length ? p.people : [p.owner]} size={24} />
        </div>
      </div>

      {/* hover actions */}
      <div className="pointer-events-none absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {!inTrash && (
          <>
            {canManage && (
              <IconAction title="Share" onClick={() => openShare(p)}>
                <Share2 size={15} />
              </IconAction>
            )}
            {canEdit && (
              <IconAction title="Rename" onClick={() => openRename(p)}>
                <Pencil size={15} />
              </IconAction>
            )}
            {canManage && (
              <IconAction title="Move to trash" onClick={trash}>
                <Trash2 size={15} />
              </IconAction>
            )}
          </>
        )}
        {inTrash && canManage && (
          <>
            <IconAction title="Restore" onClick={restore}>
              <RotateCcw size={15} />
            </IconAction>
            <IconAction title="Delete forever" onClick={remove}>
              <Trash2 size={15} />
            </IconAction>
          </>
        )}
      </div>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface/90 text-text-muted backdrop-blur hover:text-text-strong"
    >
      {children}
    </button>
  );
}
