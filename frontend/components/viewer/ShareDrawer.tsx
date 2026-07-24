"use client";

import * as React from "react";
import { Download, FileText, Link2, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "@/store/useToast";
import type { Person } from "@/lib/types";
import { useViewer } from "@/store/useViewer";
import { Avatar } from "@/components/ui/avatar";

interface Member { user: Person; access: string; }

export function ShareDrawer() {
  const { shareOpen, toggleShare, id, version } = useViewer();
  const [q, setQ] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Person[]>([]);
  const [invited, setInvited] = React.useState<Person[]>([]);
  const [message, setMessage] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([]);

  const loadMembers = React.useCallback(() => {
    if (id) apiGet<Member[]>(`/prototypes/${id}/members`).then(setMembers).catch(() => {});
  }, [id]);

  React.useEffect(() => { if (shareOpen) loadMembers(); }, [shareOpen, loadMembers]);

  React.useEffect(() => {
    if (!q.trim()) { setSuggestions([]); return; }
    let ok = true;
    apiGet<Person[]>(`/users/directory?q=${encodeURIComponent(q)}`).then((r) => {
      if (ok) setSuggestions(r.filter((p) => !invited.some((i) => i.id === p.id) && !members.some((m) => m.user.id === p.id)));
    });
    return () => { ok = false; };
  }, [q, invited, members]);

  if (!shareOpen) return null;

  const add = (p: Person) => { setInvited((v) => [...v, p]); setQ(""); setSuggestions([]); };
  const send = async () => {
    await Promise.all(invited.map((p) => apiPost(`/prototypes/${id}/members`, { user_id: p.id, access: "commenter" }).catch(() => {})));
    toast.success(invited.length === 1 ? `Invited ${invited[0].display_name}.` : `Invited ${invited.length} people.`);
    setSent(true); loadMembers(); setTimeout(() => { setSent(false); setInvited([]); setMessage(""); }, 1800);
  };
  const copyLink = async () => {
    const r = await apiPost<{ url: string }>(`/prototypes/${id}/share-link`);
    try { await navigator.clipboard.writeText(r.url); toast.success("Share link copied."); } catch { /* */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const printPdf = () => {
    const f = document.querySelector<HTMLIFrameElement>('iframe[title="Prototype"]');
    try { f?.contentWindow?.focus(); f?.contentWindow?.print(); } catch { window.print(); }
  };

  return (
    <>
      <div className="lp-overlay fixed inset-0 z-40 bg-black/40" onClick={toggleShare} />
      <div className="lp-drawer-right fixed right-0 top-0 z-50 h-full w-96 overflow-y-auto border-l border-border bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-strong">Share</h2>
          <button onClick={toggleShare} className="lp-iconbtn rounded-control p-1 text-text-faint hover:bg-[var(--surface-subtle)] hover:text-text-strong"><X size={18} /></button>
        </div>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-text-faint">on v{version}</p>

        {members.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-sm font-semibold text-text-strong">People with access</p>
            <div className="grid gap-1.5">
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-2.5 rounded-input border border-border px-3 py-2">
                  <Avatar person={m.user} size={28} />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-body">{m.user.display_name}</span>
                  <span className="shrink-0 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-medium capitalize text-text-muted">{m.access}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mb-2 text-sm font-semibold text-text-strong">Invite people</p>
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…"
            className="h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none" />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-[var(--surface)] shadow-lg">
              {suggestions.map((p) => (
                <button key={p.id} onClick={() => add(p)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--surface-subtle)]">
                  <Avatar person={p} size={24} /> {p.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-faint">Type a name or email, press Enter to add</p>
        {invited.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {invited.map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                {p.display_name}
                <button onClick={() => setInvited((v) => v.filter((x) => x.id !== p.id))}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Add a message (optional)"
          className="mt-3 w-full resize-none rounded-input border border-border bg-[var(--surface-subtle)] p-2.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none" />
        <button onClick={send} disabled={!invited.length}
          className="mt-3 w-full rounded-control bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          {sent ? "Sent" : "Send invite"}
        </button>

        <p className="mb-2 mt-6 text-sm font-semibold text-text-strong">Or export</p>
        <div className="grid gap-2">
          <a href={`/api/prototypes/${id}/raw?v=${version}`} download
            className="flex items-center gap-3 rounded-input border border-border p-3 hover:bg-[var(--surface-subtle)]">
            <Icon><Download size={18} /></Icon>
            <span><span className="block text-sm font-semibold text-text-strong">Download HTML</span><span className="block text-xs text-text-muted">Save the current version as a file</span></span>
          </a>
          <button onClick={copyLink} className="flex items-center gap-3 rounded-input border border-border p-3 text-left hover:bg-[var(--surface-subtle)]">
            <Icon><Link2 size={18} /></Icon>
            <span><span className="block text-sm font-semibold text-text-strong">{copied ? "Copied to clipboard" : "Copy share link"}</span><span className="block text-xs text-text-muted">Copy a link to this prototype</span></span>
          </button>
          <button onClick={printPdf} className="flex items-center gap-3 rounded-input border border-border p-3 text-left hover:bg-[var(--surface-subtle)]">
            <Icon><FileText size={18} /></Icon>
            <span><span className="block text-sm font-semibold text-text-strong">Save as PDF</span><span className="block text-xs text-text-muted">Save the displayed page as a PDF</span></span>
          </button>
        </div>
      </div>
    </>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[var(--surface-subtle)] text-brand-600">{children}</span>;
}
