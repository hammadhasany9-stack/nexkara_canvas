"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { ApiError, apiGet, apiUpload } from "@/lib/api";
import { toast } from "@/store/useToast";
import { useViewer, type Version } from "@/store/useViewer";
import { Modal } from "@/components/ui/modal";
import { Banner } from "@/components/auth/Banner";
import { cn } from "@/lib/utils";

const LAYOUTS = ["desktop", "tablet", "mobile"] as const;
const inputCls =
  "h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-ring";

export function UploadVersionModal() {
  const { uploadOpen, closeUpload, id, proto, versions, pickVersion } = useViewer();
  const set = useViewer.setState;
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [layouts, setLayouts] = React.useState<string[]>([...LAYOUTS]);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const nextVersion = (versions[0]?.version ?? proto?.version ?? 1) + 1;

  React.useEffect(() => {
    if (uploadOpen) {
      setFile(null); setNote(""); setError("");
      setName(proto?.name ?? "");
      setLayouts(proto?.layouts?.length ? proto.layouts : [...LAYOUTS]);
    }
  }, [uploadOpen, proto]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!/\.html?$/i.test(f.name)) return setError("Choose an .html or .htm file.");
    setFile(f); setError("");
  };
  const toggleLayout = (l: string) =>
    setLayouts((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const submit = async () => {
    if (!file) return setError("Add an HTML file.");
    if (!name.trim()) return setError("Give your prototype a name.");
    const form = new FormData();
    form.append("file", file);
    form.append("note", note);
    form.append("name", name.trim());
    form.append("layouts", (layouts.length ? layouts : [...LAYOUTS]).join(","));
    setLoading(true); setError("");
    try {
      await apiUpload(`/prototypes/${id}/versions`, form);
      const list = await apiGet<Version[]>(`/prototypes/${id}/versions`);
      set({ versions: list });
      const newest = list[0]?.version;
      closeUpload();
      if (newest) { await pickVersion(newest); toast.success(`Version ${newest} uploaded.`); }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally { setLoading(false); }
  };

  return (
    <Modal
      open={uploadOpen}
      onClose={closeUpload}
      eyebrow="New version"
      title="Upload a prototype"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-text-faint">Saved as v{nextVersion}</span>
          <div className="flex gap-2">
            <button onClick={closeUpload} className="lp-press rounded-control border border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-text-body hover:bg-[var(--surface)]">Cancel</button>
            <button onClick={submit} disabled={loading} className="lp-press rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{loading ? "Saving…" : "Save version"}</button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        {error && <Banner kind="error">{error}</Banner>}

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] ?? null); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed px-4 py-9 text-center transition-colors",
            drag ? "border-brand-600 bg-brand-50" : "border-border hover:border-brand-600/50",
          )}
        >
          <Upload size={24} className="text-brand-600" />
          <p className="mt-2.5 font-semibold text-text-strong">{file ? file.name : "Choose an HTML file"}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">or drag it here</p>
          <input ref={inputRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">Product name <span className="text-danger">*</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">What changed in this version?</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Redesigned the hero, fixed nav alignment…" className={cn(inputCls, "h-auto resize-none py-2.5")} />
        </label>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-text-body">Layouts <span className="text-text-faint">(default all)</span></span>
          <div className="flex gap-2">
            {LAYOUTS.map((l) => (
              <button key={l} type="button" onClick={() => toggleLayout(l)}
                className={cn("lp-press rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  layouts.includes(l) ? "border-brand-600 text-brand-600" : "border-border text-text-muted hover:border-brand-600/50 hover:text-text-strong")}>
                {l[0].toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
