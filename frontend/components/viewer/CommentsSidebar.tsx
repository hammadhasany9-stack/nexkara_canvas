"use client";

import * as React from "react";
import { Check, Frame, Send } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useViewer, type Comment } from "@/store/useViewer";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function CommentsSidebar() {
  const { comments, version, filter, setFilter, setMode } = useViewer();
  const forVersion = comments.filter((c) => c.version === version);
  const active = forVersion.filter((c) => !c.resolved);
  const resolved = forVersion.filter((c) => c.resolved);
  const shown = filter === "active" ? active : resolved;

  const emptyTitle = filter === "active" ? `No open comments on v${version}` : "Nothing resolved yet";
  const emptyBody =
    filter === "active"
      ? "Switch to Comment mode, then click anything on the prototype to start a thread."
      : "Resolved comments for this version will collect here.";

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-border bg-[var(--surface)]/50">
      <div className="px-5 pt-5">
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="text-[17px] font-medium text-text-strong">Comments</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">on v{version}</span>
        </div>
        <div className="flex border-b border-border">
          <Tab active={filter === "active"} onClick={() => setFilter("active")}>Active {active.length}</Tab>
          <Tab active={filter === "resolved"} onClick={() => setFilter("resolved")}>Resolved {resolved.length}</Tab>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-6 pt-4">
        {shown.length === 0 ? (
          <div className="mt-1 grid place-items-center gap-3 rounded-xl border border-dashed border-border px-[22px] py-11 text-center">
            <span className="text-brand-600">
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <path d="M5 8.5A1.5 1.5 0 0 1 6.5 7h19A1.5 1.5 0 0 1 27 8.5v13a1.5 1.5 0 0 1-1.5 1.5H13l-6 4v-4h-.5A1.5 1.5 0 0 1 5 21.5z" />
              </svg>
            </span>
            <strong className="text-[15px] font-normal text-text-strong">{emptyTitle}</strong>
            <p className="max-w-[230px] text-[13px] leading-relaxed text-text-muted">{emptyBody}</p>
            <button
              onClick={() => setMode("comment")}
              className="mt-0.5 h-10 rounded-control border border-brand-600 bg-brand-600 px-4 text-sm font-semibold text-white hover:border-brand-700 hover:bg-brand-700"
            >
              Start a comment
            </button>
          </div>
        ) : (
          shown.map((c) => <Card key={c.id} c={c} />)
        )}
      </div>
    </aside>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn("flex-1 border-b-2 py-2.5 text-center text-[0.86rem] font-medium", active ? "border-brand-600 text-brand-600" : "border-transparent text-text-muted hover:text-text-strong")}>
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
            className={cn("flex h-5 w-5 items-center justify-center rounded-full border", c.resolved ? "border-patina bg-patina-50 text-patina" : "border-border text-text-faint hover:border-patina hover:text-patina")}>
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
