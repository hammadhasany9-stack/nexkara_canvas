"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Modal } from "@/components/ui/modal";
import { Banner } from "@/components/auth/Banner";
import { cn } from "@/lib/utils";

const LAYOUTS = ["desktop", "tablet", "mobile"] as const;

export function UploadModal() {
  const { uploadOpen, closeUpload, refresh, openShare } = useDashboard();
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"web" | "app">("web");
  const [layouts, setLayouts] = React.useState<string[]>([...LAYOUTS]);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (uploadOpen) {
      setFile(null); setName(""); setSourceUrl(""); setDescription("");
      setType("web"); setLayouts([...LAYOUTS]); setError("");
    }
  }, [uploadOpen]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!/\.html?$/i.test(f.name)) return setError("Please choose an .html or .htm file.");
    setFile(f); setError("");
    if (!name) setName(f.name.replace(/\.html?$/i, ""));
  };
  const toggleLayout = (l: string) =>
    setLayouts((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const submit = async () => {
    if (!file) return setError("Add an HTML file to upload.");
    if (!name.trim()) return setError("Give your prototype a name.");
    const form = new FormData();
    form.append("file", file);
    form.append("name", name.trim());
    form.append("type", type);
    form.append("layouts", (layouts.length ? layouts : [...LAYOUTS]).join(","));
    form.append("description", description);
    form.append("source_url", sourceUrl);
    setLoading(true); setError("");
    try {
      const created = await apiUpload<Prototype>("/prototypes", form);
      await refresh();
      closeUpload();
      openShare(created, true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={uploadOpen}
      onClose={closeUpload}
      eyebrow="New prototype"
      title="Upload a prototype"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-text-faint">You can share after uploading</span>
          <div className="flex gap-2">
            <button onClick={closeUpload} className="rounded-control border border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-text-body hover:bg-[var(--surface)]">Cancel</button>
            <button onClick={submit} disabled={loading} className="rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {loading ? "Saving…" : "Save details"}
            </button>
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
          <p className="mt-2.5 font-semibold text-text-strong">
            {file ? file.name : "Drop your HTML file here"}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
            Click to browse · .HTML up to 10 MB
          </p>
          <input ref={inputRef} type="file" accept=".html,.htm,text/html" className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>

        <Field label="Product name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lumen — marketing site" className={inputCls} />
        </Field>
        <Field label="Source URL (optional)">
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this prototype for?" rows={3} className={cn(inputCls, "resize-none py-2.5")} />
        </Field>

        <div className="flex flex-wrap gap-8">
          <div>
            <p className="mb-2 text-sm font-medium text-text-body">Layouts <span className="text-text-faint">(default all)</span></p>
            <div className="flex gap-2">
              {LAYOUTS.map((l) => (
                <Chip key={l} active={layouts.includes(l)} onClick={() => toggleLayout(l)}>{l[0].toUpperCase() + l.slice(1)}</Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text-body">Type of HTML</p>
            <div className="flex gap-2">
              <Chip active={type === "web"} onClick={() => setType("web")}>Web</Chip>
              <Chip active={type === "app"} onClick={() => setType("app")}>App</Chip>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const inputCls =
  "h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-text-body">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "border-brand-600 text-brand-600" : "border-border text-text-muted hover:text-text-strong",
      )}
    >
      {children}
    </button>
  );
}
