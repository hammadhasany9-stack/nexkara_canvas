"use client";

import { useRouter } from "next/navigation";
import { Home, Maximize, Minus, Monitor, Plus, Smartphone, SquareArrowOutUpRight, Tablet } from "lucide-react";
import { DEVICE_WIDTH, useViewer } from "@/store/useViewer";
import { cn } from "@/lib/utils";

export function CanvasToolbar({ onFullscreen }: { onFullscreen: () => void }) {
  const router = useRouter();
  const { proto, version, device, setDevice, effScale, zoom, zoomIn, zoomOut, zoomReset, id } = useViewer();
  const scale = effScale();
  const zoomLabel = zoom == null ? "Fit" : `${Math.round(scale * 100)}%`;

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-[var(--surface)]/60 px-3 text-sm">
      <button onClick={() => router.push("/dashboard")} title="Home"
        className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:text-text-strong">
        <Home size={16} />
      </button>

      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="font-medium text-text-body">{proto?.name}</span>
        <span className="rounded-full border border-brand-600/40 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">v{version}</span>
      </div>

      <div className="flex items-center gap-1 rounded-control border border-border p-0.5">
        <Dev active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop"><Monitor size={15} /></Dev>
        <Dev active={device === "tablet"} onClick={() => setDevice("tablet")} label="Tablet"><Tablet size={15} /></Dev>
        <Dev active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile"><Smartphone size={15} /></Dev>
      </div>

      <div className="flex items-center gap-1 rounded-control border border-border px-1 py-0.5">
        <button onClick={zoomOut} className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-strong"><Minus size={14} /></button>
        <button onClick={zoomReset} className="min-w-9 px-1 text-xs font-medium text-text-body">{zoomLabel}</button>
        <button onClick={zoomIn} className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text-strong"><Plus size={14} /></button>
      </div>

      <span className="font-mono text-xs text-text-faint">{DEVICE_WIDTH[device]} px</span>

      <a href={`/api/prototypes/${id}/raw?v=${version}`} target="_blank" rel="noreferrer" title="Open in new tab"
        className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:text-text-strong">
        <SquareArrowOutUpRight size={15} />
      </a>
      <button onClick={onFullscreen} title="Fullscreen"
        className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:text-text-strong">
        <Maximize size={15} />
      </button>
    </div>
  );
}

function Dev({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={active}
      className={cn("flex h-7 w-7 items-center justify-center rounded-[6px]", active ? "bg-brand-100 text-brand-700" : "text-text-muted hover:text-text-strong")}>
      {children}
    </button>
  );
}
