"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import { DEVICE_WIDTH, useViewer } from "@/store/useViewer";

// Stable per-author pin color (patina blue is one of the accents, matching the prototype).
const PIN_COLORS = ["#14618c", "#00896b", "#8a5cf6", "#c2410c", "#0891b2", "#be185d"];
function pinColor(id: string): string {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0)) % PIN_COLORS.length;
  return PIN_COLORS[n];
}

export function Canvas({ sendCursor }: { sendCursor: (c: { x: number; y: number } | null) => void }) {
  const {
    id, version, device, mode, comments, filter, selectedPinId,
    effScale, setFit, setDraft, selectPin, presence, selfClientId,
  } = useViewer();
  const scale = effScale();
  const deviceWidth = DEVICE_WIDTH[device];

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(900);
  const [iframeSrc, setIframeSrc] = React.useState<string>("");
  const [sandboxed, setSandboxed] = React.useState(false);

  // Resolve how to load the HTML: isolated cross-origin URL (prod) or a
  // same-origin blob (dev). See the backend /content endpoint.
  React.useEffect(() => {
    let revoke = "";
    let cancelled = false;
    (async () => {
      const { url, sandboxed: sb } = await apiGet<{ url: string; sandboxed: boolean }>(
        `/prototypes/${id}/content?v=${version}`,
      );
      if (cancelled) return;
      if (sb) {
        setSandboxed(true);
        setIframeSrc(url);
      } else {
        const res = await fetch(url, { credentials: "include" });
        const text = await res.text();
        const blob = URL.createObjectURL(new Blob([text], { type: "text/html" }));
        revoke = blob;
        setSandboxed(false);
        setIframeSrc(blob);
      }
    })();
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke); };
  }, [id, version]);

  // Cross-origin sandbox reports its height via postMessage.
  React.useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const h = (e.data && typeof e.data === "object" && e.data.__nx_height) as number | undefined;
      if (typeof h === "number" && h > 0) setHeight(Math.max(600, h));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

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
    if (sandboxed) return; // cross-origin: height via postMessage, no DOM access
    const measure = () => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc) setHeight(Math.max(600, doc.body.scrollHeight));
      } catch { /* cross-origin */ }
    };
    measure();
    setTimeout(measure, 500);
    // Track the pointer inside the (same-origin blob) prototype so remote
    // cursors follow the mouse over the rendered page, not just the chrome.
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        doc.addEventListener("mousemove", (e: MouseEvent) => {
          sendCursor({ x: e.clientX, y: e.clientY });
        });
        doc.addEventListener("mouseleave", () => sendCursor(null));
      }
    } catch { /* cross-origin */ }
  };

  // comment placement + cursor tracking (coords in unscaled stage space)
  const stageCoords = (e: React.MouseEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const onCatchClick = (e: React.MouseEvent) => {
    const { x, y } = stageCoords(e);
    let target: string | null = null;
    if (!sandboxed) {
      try {
        const doc = iframeRef.current?.contentDocument;
        const el = doc?.elementFromPoint(x, y) as HTMLElement | null;
        if (el) {
          const t = (el.getAttribute("data-el") || el.textContent || el.tagName).trim();
          target = t.slice(0, 60);
        }
      } catch { /* */ }
    }
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
            src={iframeSrc}
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
            {visiblePins.map((c) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); selectPin(c.id); }}
                className="pointer-events-auto absolute flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-full items-center justify-center rounded-full rounded-bl-none font-mono text-[0.6rem] font-bold text-white"
                style={{
                  left: c.left, top: c.top,
                  background: pinColor(c.author?.id ?? c.id),
                  border: "1.5px solid var(--app-bg)",
                  boxShadow:
                    selectedPinId === c.id
                      ? "0 0 0 3px var(--patina-50), 0 2px 10px rgba(15,25,40,.22)"
                      : "0 2px 8px rgba(15,25,40,.16)",
                }}
                title={c.body}
              >
                {c.resolved ? "✓" : (c.author?.initials ?? "?")}
                {!c.resolved && c.replies.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full border-[1.5px] border-[var(--app-bg)] bg-patina px-0.5 font-mono text-[0.5rem] font-bold leading-none text-white">
                    {c.replies.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* live cursors (others) */}
          <div className="pointer-events-none absolute inset-0">
            {presence.filter((p) => p.clientId !== selfClientId && p.cursor).map((p) => (
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
