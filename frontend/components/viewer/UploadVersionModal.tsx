"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { ApiError, apiGet, apiUpload } from "@/lib/api";
import { useViewer, type Version } from "@/store/useViewer";
import { Modal } from "@/components/ui/modal";
import { Banner } from "@/components/auth/Banner";
import { cn } from "@/lib/utils";

export function UploadVersionModal() {
  const { uploadOpen, closeUpload, id, pickVersion } = useViewer();
  const set = useViewer.setState;
  const [file, setFile] = React.useState<File | null>(null);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (uploadOpen) { setFile(null); setError(""); } }, [uploadOpen]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!/\.html?$/i.test(f.name)) return setError("Choose an .html or .htm file.");
    setFile(f); setError("");
  };

  const submit = async () => {
    if (!file) return setError("Add an HTML file.");
    const form = new FormData();
    form.append("file", file);
    setLoading(true); setError("");
    try {
      await apiUpload(`/prototypes/${id}/versions`, form);
      const versions = await apiGet<Version[]>(`/prototypes/${id}/versions`);
      set({ versions });
      const newest = versions[0]?.version;
      closeUpload();
      if (newest) await pickVersion(newest);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally { setLoading(false); }
  };

  return (
    <Modal open={uploadOpen} onClose={closeUpload} eyebrow="New version" title="Upload a new version"
      footer={<>
        <button onClick={closeUpload} className="rounded-control border border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-text-body">Cancel</button>
        <button onClick={submit} disabled={loading} className="rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Uploading…" : "Upload version"}</button>
      </>}>
      <div className="grid gap-3">
        {error && <Banner kind="error">{error}</Banner>}
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] ?? null); }}
          onClick={() => inputRef.current?.click()}
          className={cn("flex cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed px-4 py-9 text-center", drag ? "border-brand-600 bg-brand-50" : "border-border hover:border-brand-600/50")}>
          <Upload size={24} className="text-brand-600" />
          <p className="mt-2.5 font-semibold text-text-strong">{file ? file.name : "Drop your HTML file here"}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">Click to browse · .HTML up to 10 MB</p>
          <input ref={inputRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
      </div>
    </Modal>
  );
}
