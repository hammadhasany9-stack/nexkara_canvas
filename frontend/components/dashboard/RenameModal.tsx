"use client";

import * as React from "react";
import { ApiError, apiPatch } from "@/lib/api";
import { toast } from "@/store/useToast";
import { useDashboard } from "@/store/useDashboard";
import { Banner } from "@/components/auth/Banner";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const LAYOUTS = ["desktop", "tablet", "mobile"] as const;
const inputCls =
  "h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-ring";

export function RenameModal() {
  const { renameTarget, closeRename, refresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [layouts, setLayouts] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (renameTarget) {
      setName(renameTarget.name);
      setSourceUrl(renameTarget.source_url ?? "");
      setLayouts(renameTarget.layouts?.length ? renameTarget.layouts : [...LAYOUTS]);
      setError("");
    }
  }, [renameTarget]);

  const toggle = (l: string) =>
    setLayouts((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const save = async () => {
    if (!name.trim()) return setError("Enter a project name.");
    setLoading(true); setError("");
    try {
      await apiPatch(`/prototypes/${renameTarget!.id}`, {
        name: name.trim(),
        source_url: sourceUrl.trim(),
        layouts: layouts.length ? layouts : [...LAYOUTS],
      });
      await refresh();
      toast.success("Changes saved.");
      closeRename();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed.");
    } finally { setLoading(false); }
  };

  return (
    <Modal
      open={!!renameTarget}
      onClose={closeRename}
      title="Edit prototype"
      footer={
        <>
          <button onClick={closeRename} className="lp-press rounded-control border border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-text-body transition-colors hover:bg-[var(--surface)]">Cancel</button>
          <button onClick={save} disabled={loading} className="rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving…" : "Save changes"}</button>
        </>
      }
    >
      <div className="grid gap-4">
        {error && <Banner kind="error">{error}</Banner>}
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">Project name <span className="text-danger">*</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={inputCls} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">Source URL <span className="text-text-faint">(optional)</span></span>
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={inputCls} />
        </label>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">Layout formats</span>
          <div className="flex gap-2">
            {LAYOUTS.map((l) => (
              <button key={l} type="button" onClick={() => toggle(l)}
                className={cn("lp-press rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  layouts.includes(l) ? "border-brand-600 text-brand-600" : "border-border text-text-muted hover:text-text-strong")}>
                {l[0].toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
