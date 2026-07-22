"use client";

import * as React from "react";
import { Check, Frame, Send } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useViewer, type Comment } from "@/store/useViewer";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function CommentsSidebar() {
  const { comments, version, filter, setFilter } = useViewer();
  const forVersion = comments.filter((c) => c.version === version);
  const active = forVersion.filter((c) => !c.resolved);
  const resolved = forVersion.filter((c) => c.resolved);
  const shown = filter === "active" ? active : resolved;

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-[var(--surface)]/50">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-lg font-bold text-text-strong">Comments</h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">on v{version}</span>
      </div>
      <div className="flex gap-4 border-b border-border px-5">
        <Tab active={filter === "active"} onClick={() => setFilter("active")}>Active {active.length}</Tab>
        <Tab active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved {resolved.length}</Tab>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">
            {filter === "active" ? "No active comments. Switch to Comment mode and click the canvas to add one." : "Nothing resolved yet."}
          </p>
        ) : (
          <div className="grid gap-3">
            {shown.map((c) => <Card key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </aside>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("border-b-2 pb-2.5 pt-2 text-sm font-medium", active ? "border-brand-600 text-brand-600" : "border-transparent text-text-muted hover:text-text-strong")}>
      {children}
    </button>
  );
}

function Card({ c }: { c: Comment }) {
  const { resolve, reply, selectPin } = useViewer();
  const [text, setText] = React.useState("");
  const author = c.author ?? { id: "?", display_name: "Unknown", initials: "?" };

  const send = () => { if (text.trim()) { reply(c.id, text.trim()); setText(""); } };

  return (
    <div className="rounded-input border border-border bg-[var(--surface)] p-3" onClick={() => selectPin(c.id)}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          <Avatar person={author} size={28} />
          <span>
            <span className="block text-sm font-semibold text-text-strong">{author.display_name}</span>
            <span className="block text-[10px] uppercase tracking-wider text-text-faint">{relativeTime(c.created_at)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-[var(--surface-subtle)] px-1.5 text-[10px] font-semibold uppercase text-text-muted">v{c.version}</span>
          <button onClick={(e) => { e.stopPropagation(); resolve(c.id, !c.resolved); }} title={c.resolved ? "Reopen" : "Resolve"}
            className={cn("flex h-5 w-5 items-center justify-center rounded-full border", c.resolved ? "border-brand-600 bg-brand-600 text-white" : "border-border text-text-faint hover:text-brand-600")}>
            <Check size={12} />
          </button>
        </span>
      </div>

      <p className="mt-2.5 text-sm text-text-body">{c.body}</p>
      {c.target && (
        <p className="mt-2 inline-flex items-center gap-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
          <Frame size={11} /> {c.target}
        </p>
      )}

      {c.replies.length > 0 && (
        <div className="mt-3 grid gap-2 border-l-2 border-border pl-3">
          {c.replies.map((r) => (
            <div key={r.id} className="text-sm">
              <span className="font-medium text-text-strong">{r.author?.display_name ?? "Unknown"}</span>{" "}
              <span className="text-text-faint text-xs">{relativeTime(r.created_at)}</span>
              <p className="text-text-body">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Reply…"
          className="h-9 flex-1 rounded-input border border-border bg-[var(--surface-subtle)] px-3 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none" />
        <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-600 text-white hover:bg-brand-700"><Send size={15} /></button>
      </div>
    </div>
  );
}
