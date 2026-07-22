"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import { DEVICE_WIDTH, useViewer } from "@/store/useViewer";

export function Canvas({ sendCursor }: { sendCursor: (c: { x: number; y: number } | null) => void }) {
  const {
    id, version, device, mode, comments, filter, selectedPinId,
    effScale, setFit, setDraft, selectPin, presence, me,
  } = useViewer();
  const scale = effScale();
  const deviceWidth = DEVICE_WIDTH[device];

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(900);
  const [blobUrl, setBlobUrl] = React.useState<string>("");

  // load version HTML -> blob
  React.useEffect(() => {
    let revoke = "";
    (async () => {
      const res = await fetch(`/api/prototypes/${id}/raw?v=${version}`, { credentials: "include" });
      const text = await res.text();
      const url = URL.createObjectURL(new Blob([text], { type: "text/html" }));
      revoke = url;
      setBlobUrl(url);
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [id, version]);

  // fit-to-width
  const reflow = React.useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const avail = vp.clientWidth - 80;
    setFit(Math.min(1, avail / deviceWidth));
  }, [deviceWidth, setFit]);

  React.useEffect(() => { reflow(); }, [reflow, device]);
  React.useEffect(() => {
    const on = () => reflow();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [reflow]);

  const onIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setHeight(Math.max(600, doc.body.scrollHeight));
    } catch { /* cross-origin */ }
    setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) setHeight(Math.max(600, doc.body.scrollHeight));
      } catch { /* */ }
    }, 500);
  };

  // comment placement + cursor tracking (coords in unscaled stage space)
  const stageCoords = (e: React.MouseEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const onCatchClick = (e: React.MouseEvent) => {
    const { x, y } = stageCoords(e);
    let target: string | null = null;
    try {
      const doc = iframeRef.current?.contentDocument;
      const el = doc?.elementFromPoint(x, y) as HTMLElement | null;
      if (el) {
        const t = (el.getAttribute("data-el") || el.textContent || el.tagName).trim();
        target = t.slice(0, 60);
      }
    } catch { /* */ }
    setDraft({ left: x, top: y, target });
  };

  const onMove = (e: React.MouseEvent) => {
    const { x, y } = stageCoords(e);
    sendCursor({ x, y });
  };

  const visiblePins = comments.filter((c) => c.version === version);

  return (
    <div
      ref={viewportRef}
      className="relative flex-1 overflow-auto"
      style={{
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
      onMouseMove={onMove}
      onMouseLeave={() => sendCursor(null)}
    >
      <div className="flex min-h-full w-full justify-center py-10">
        <div
          ref={stageRef}
          className="relative"
          style={{ width: deviceWidth, height, transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title="Prototype"
            onLoad={onIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="block h-full w-full rounded-lg border border-border bg-white shadow-xl"
            style={{ width: deviceWidth, height }}
          />

          {/* click-catcher in comment mode */}
          {mode === "comment" && (
            <div className="absolute inset-0 cursor-crosshair" onClick={onCatchClick} />
          )}

          {/* pins */}
          <div className="pointer-events-none absolute inset-0">
            {visiblePins.map((c, i) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); selectPin(c.id); }}
                className="pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full rounded-bl-none text-xs font-bold text-white shadow-lg"
                style={{
                  left: c.left, top: c.top,
                  background: c.resolved ? "var(--text-faint)" : "var(--brand-600)",
                  outline: selectedPinId === c.id ? "2px solid var(--brand-700)" : "none",
                }}
                title={c.body}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* live cursors (others) */}
          <div className="pointer-events-none absolute inset-0">
            {presence.filter((p) => p.userId !== me?.id && p.cursor).map((p) => (
              <div key={p.clientId} className="absolute" style={{ left: p.cursor!.x, top: p.cursor!.y }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={p.color}>
                  <path d="M4 2l7 18 2.5-7.5L21 10 4 2z" />
                </svg>
                <span className="ml-3 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: p.color }}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
