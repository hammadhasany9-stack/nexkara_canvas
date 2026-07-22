"use client";

import * as React from "react";
import { Frame } from "lucide-react";
import { useViewer } from "@/store/useViewer";

export function DraftComposer() {
  const { draft, setDraft, submitDraft, me } = useViewer();
  const [text, setText] = React.useState("");
  React.useEffect(() => { setText(""); }, [draft]);
  if (!draft) return null;

  return (
    <div className="pointer-events-auto absolute bottom-24 left-1/2 z-30 w-80 -translate-x-1/2 rounded-card border border-border bg-[var(--surface)] p-3 shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[10px] font-bold text-text-muted">
          {me ? me.display_name.slice(0, 2).toUpperCase() : "YOU"}
        </span>
        {draft.target && (
          <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
            <Frame size={11} /> {draft.target}
          </span>
        )}
      </div>
      <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="Describe the change you want — be specific."
        className="w-full resize-none rounded-input border border-border bg-[var(--surface-subtle)] p-2.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none" />
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={() => setDraft(null)} className="rounded-control px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text-strong">Cancel</button>
        <button onClick={() => submitDraft(text)} disabled={!text.trim()}
          className="rounded-control bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">Comment</button>
      </div>
    </div>
  );
}
