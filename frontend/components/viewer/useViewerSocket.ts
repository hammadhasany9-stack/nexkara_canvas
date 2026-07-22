"use client";

import * as React from "react";
import { useViewer, type Comment, type PresenceMember } from "@/store/useViewer";

function wsUrl(id: string): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) return `${explicit}/ws/prototypes/${id}`;
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  const host = typeof location !== "undefined" ? location.host : "";
  return `${proto}://${host}/api/ws/prototypes/${id}`;
}

/** Connects to the prototype room; feeds presence/cursors/comments into the store.
 *  Returns a throttled sendCursor(x, y | null). */
export function useViewerSocket(id: string) {
  const store = useViewer;
  const wsRef = React.useRef<WebSocket | null>(null);
  const lastSent = React.useRef(0);

  React.useEffect(() => {
    if (!id) return;
    let closed = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(id));
    } catch {
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const s = store.getState();
      switch (msg.type) {
        case "presence.sync":
          s.setPresence(msg.members as PresenceMember[]);
          break;
        case "presence.join":
          s.upsertCursor(msg.member.clientId, null, msg.member as PresenceMember);
          break;
        case "presence.leave":
          s.removeMember(msg.clientId);
          break;
        case "cursor":
          s.upsertCursor(msg.clientId, msg.cursor);
          break;
        case "comment.created":
        case "comment.updated":
          s.applyRemoteComment(msg.comment as Comment);
          break;
      }
    };
    ws.onclose = () => { if (!closed) wsRef.current = null; };

    return () => { closed = true; try { ws.close(); } catch { /* */ } };
  }, [id, store]);

  const sendCursor = React.useCallback((cursor: { x: number; y: number } | null) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (cursor && now - lastSent.current < 45) return; // throttle
    lastSent.current = now;
    try { ws.send(JSON.stringify({ type: "cursor", cursor })); } catch { /* */ }
  }, []);

  return { sendCursor };
}
