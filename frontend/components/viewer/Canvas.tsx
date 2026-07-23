"use client";

import * as React from "react";
import { Check, Frame, Send, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { DEVICE_WIDTH, useViewer, type Comment } from "@/store/useViewer";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
    effScale, setFit, setDraft, selectPin, presence, selfClientId, reply, resolve,
  } = useViewer();
  const scale = effScale();
  const deviceWidth = DEVICE_WIDTH[device];

  // Browse-mode pin popover: anchored to the clicked pin (viewport coords).
  const [pop, setPop] = React.useState<{ id: string; x: number; y: number } | null>(null);
  const openPop = (commentId: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPop({ id: commentId, x: r.right + 8, y: r.top });
    selectPin(commentId);
  };
  const closePop = () => { setPop(null); selectPin(null); };
  // Any pin that disappears (version switch) or a scroll should dismiss the popover.
  React.useEffect(() => { setPop(null); }, [version, mode]);

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
      onScroll={() => pop && closePop()}
    >
      {pop && (() => {
        const c = visiblePins.find((x) => x.id === pop.id);
        const idx = visiblePins.findIndex((x) => x.id === pop.id);
        if (!c) return null;
        return (
          <PinPopover
            comment={c}
            num={idx + 1}
            x={pop.x}
            y={pop.y}
            onClose={closePop}
            onResolve={() => resolve(c.id, !c.resolved)}
            onReply={(body) => reply(c.id, body)}
          />
        );
      })()}
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
                onClick={(e) => { e.stopPropagation(); openPop(c.id, e.currentTarget); }}
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

// Browse-mode comment popover anchored to a pin (matches the prototype).
function PinPopover({
  comment: c, num, x, y, onClose, onResolve, onReply,
}: {
  comment: Comment;
  num: number;
  x: number;
  y: number;
  onClose: () => void;
  onResolve: () => void;
  onReply: (body: string) => void;
}) {
  const [text, setText] = React.useState("");
  const author = c.author ?? { id: "?", display_name: "Unknown", initials: "?" };
  const send = () => { if (text.trim()) { onReply(text.trim()); setText(""); } };

  // Keep the card on-screen (it is 300px wide).
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1440) - 316);
  const top = Math.max(12, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 900) - 220));

  return (
    <div
      className="fixed z-30 w-[300px] rounded-xl border border-border bg-[var(--surface)] p-3 shadow-[var(--shadow-modal)]"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full rounded-bl-none bg-brand-600 font-mono text-[0.6rem] font-bold text-white">
          {c.resolved ? "✓" : num}
        </span>
        <Avatar person={author} size={26} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.84rem] font-semibold text-text-strong">{author.display_name}</span>
          <span className="block font-mono text-[0.56rem] uppercase tracking-wider text-text-faint">
            {relativeTime(c.created_at)} · v{c.version}
          </span>
        </span>
        <button onClick={onResolve} title={c.resolved ? "Reopen" : "Resolve"}
          className={cn("grid h-6 w-6 place-items-center rounded-full border", c.resolved ? "border-patina bg-patina-50 text-patina" : "border-border text-text-faint hover:border-patina hover:text-patina")}>
          <Check size={13} />
        </button>
        <button onClick={onClose} title="Close" className="grid h-6 w-6 place-items-center rounded-full text-text-faint hover:text-text-strong">
          <X size={14} />
        </button>
      </div>

      <p className="mt-2.5 text-[0.9rem] leading-relaxed text-text-body">{c.body}</p>
      {c.target && (
        <p className="mt-2 inline-flex items-center gap-1 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
          <Frame size={11} /> {c.target}
        </p>
      )}

      {c.replies.length > 0 && (
        <div className="mt-3 grid gap-2 border-l-2 border-border pl-3">
          {c.replies.map((r) => (
            <div key={r.id} className="text-sm">
              <span className="font-medium text-text-strong">{r.author?.display_name ?? "Unknown"}</span>{" "}
              <span className="text-xs text-text-faint">{relativeTime(r.created_at)}</span>
              <p className="text-text-body">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Reply…" autoFocus
          className="h-9 flex-1 rounded-input border border-border bg-[var(--surface-subtle)] px-3 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none" />
        <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-600 text-white hover:bg-brand-700"><Send size={15} /></button>
      </div>
    </div>
  );
}
