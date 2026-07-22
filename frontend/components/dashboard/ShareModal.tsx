"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, X } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { Member, Person } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";

export function ShareModal() {
  const router = useRouter();
  const { shareTarget, shareIsNew, closeShare } = useDashboard();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [q, setQ] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Person[]>([]);
  const [copied, setCopied] = React.useState(false);
  const id = shareTarget?.id;

  const loadMembers = React.useCallback(async () => {
    if (!id) return;
    setMembers(await apiGet<Member[]>(`/prototypes/${id}/members`));
  }, [id]);

  React.useEffect(() => {
    if (id) { setQ(""); setSuggestions([]); setCopied(false); loadMembers(); }
  }, [id, loadMembers]);

  React.useEffect(() => {
    if (!q.trim()) { setSuggestions([]); return; }
    let active = true;
    apiGet<Person[]>(`/users/directory?q=${encodeURIComponent(q)}`).then((res) => {
      if (active) setSuggestions(res.filter((p) => !members.some((m) => m.user.id === p.id)));
    });
    return () => { active = false; };
  }, [q, members]);

  const add = async (p: Person) => {
    await apiPost(`/prototypes/${id}/members`, { user_id: p.id, access: "viewer" });
    setQ("");
    setSuggestions([]);
    loadMembers();
  };
  const remove = async (userId: string) => {
    await apiDelete(`/prototypes/${id}/members/${userId}`);
    loadMembers();
  };
  const copyLink = async () => {
    const res = await apiPost<{ url: string }>(`/prototypes/${id}/share-link`);
    try { await navigator.clipboard.writeText(res.url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const finish = () => {
    const goto = shareIsNew && id ? `/p/${id}` : null;
    closeShare();
    if (goto) router.push(goto);
  };

  if (!shareTarget) return null;

  return (
    <Modal
      open={!!shareTarget}
      onClose={finish}
      title={shareIsNew ? "Share your prototype" : "Share prototype"}
      subtitle={shareIsNew ? "Upload complete — add collaborators or grab a link." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={finish}>{shareIsNew ? "Skip" : "Done"}</Button>
          {shareIsNew && <Button onClick={finish}>Open prototype</Button>}
        </>
      }
    >
      <div className="grid gap-4">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people to add…"
            className="h-11 w-full rounded-input border border-border bg-surface px-3.5 text-sm text-text-strong placeholder:text-text-faint focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-surface shadow-lg">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-subtle"
                >
                  <Avatar person={p} size={26} />
                  <span className="text-text-body">{p.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {members.length > 0 && (
          <div className="grid gap-2">
            {members.map((m) => (
              <div key={m.user.id} className="flex items-center justify-between rounded-input border border-border px-3 py-2">
                <span className="flex items-center gap-2.5">
                  <Avatar person={m.user} size={28} />
                  <span className="text-sm text-text-body">{m.user.display_name}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs capitalize text-text-muted">
                    {m.access}
                  </span>
                  <button onClick={() => remove(m.user.id)} className="text-text-faint hover:text-danger" aria-label="Remove">
                    <X size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-input border border-border bg-surface-subtle px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-text-muted">
            <Link2 size={16} /> Anyone with the link
          </span>
          <button onClick={copyLink} className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
