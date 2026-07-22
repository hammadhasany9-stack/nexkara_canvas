"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import { ApiError, apiUpload } from "@/lib/api";
import type { Prototype } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banner } from "@/components/auth/Banner";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const LAYOUTS = ["desktop", "tablet", "mobile"] as const;

export function UploadModal() {
  const { uploadOpen, closeUpload, refresh, openShare } = useDashboard();
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"web" | "app">("web");
  const [layouts, setLayouts] = React.useState<string[]>([...LAYOUTS]);
  const [drag, setDrag] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (uploadOpen) {
      setFile(null); setName(""); setType("web"); setLayouts([...LAYOUTS]); setError("");
    }
  }, [uploadOpen]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!/\.html?$/i.test(f.name)) {
      setError("Please choose an .html or .htm file.");
      return;
    }
    setFile(f);
    setError("");
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
    setLoading(true);
    setError("");
    try {
      const created = await apiUpload<Prototype>("/prototypes", form);
      await refresh();
      closeUpload();
      openShare(created, true); // post-upload share step
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
      title="Upload prototype"
      subtitle="Add a live HTML prototype to collect feedback in context."
      footer={
        <>
          <Button variant="secondary" onClick={closeUpload}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </>
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
            "flex cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed px-4 py-8 text-center transition-colors",
            drag ? "border-brand-600 bg-brand-50" : "border-border hover:border-brand-600/50",
          )}
        >
          <FileUp size={26} className="text-text-faint" />
          <p className="mt-2 text-sm font-medium text-text-body">
            {file ? file.name : "Drop your HTML file here"}
          </p>
          <p className="text-xs text-text-faint">or click to browse — .html / .htm</p>
          <input
            ref={inputRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="proto-name">Name</Label>
          <Input
            id="proto-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lumen — marketing site"
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Layouts</Label>
          <div className="flex gap-2">
            {LAYOUTS.map((l) => (
              <Chip key={l} active={layouts.includes(l)} onClick={() => toggleLayout(l)}>
                {l[0].toUpperCase() + l.slice(1)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Type</Label>
          <div className="flex gap-2">
            <Chip active={type === "web"} onClick={() => setType("web")}>Web</Chip>
            <Chip active={type === "app"} onClick={() => setType("app")}>App</Chip>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-100 text-brand-700"
          : "border-border text-text-muted hover:text-text-strong",
      )}
    >
      {children}
    </button>
  );
}
