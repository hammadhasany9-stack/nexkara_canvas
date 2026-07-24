"use client";

import { create } from "zustand";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "@/store/useToast";
import type { Prototype } from "@/lib/types";

export interface Reply { id: string; author: { id: string; display_name: string; initials: string } | null; body: string; created_at: string; }
export interface Comment {
  id: string; version: number; left: number; top: number; target: string | null;
  body: string; resolved: boolean;
  author: { id: string; display_name: string; initials: string } | null;
  created_at: string; replies: Reply[];
}
export interface Version { id: string; version: number; label: string; comment_count: number; current: boolean; created_at: string; }
export interface PresenceMember { clientId: string; userId: string; name: string; color: string; cursor?: { x: number; y: number } | null; }

type Mode = "browse" | "comment";
type Device = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1320, tablet: 1032, mobile: 402 };
const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5];

interface ViewerState {
  id: string;
  me: { id: string; display_name: string; org_role: string } | null;
  proto: Prototype | null;
  versions: Version[];
  version: number;
  comments: Comment[];
  filter: "active" | "resolved";
  mode: Mode;
  device: Device;
  zoom: number | null; // null = fit
  fitScale: number;
  versionsOpen: boolean;
  shareOpen: boolean;
  uploadOpen: boolean;
  selectedPinId: string | null;
  // left/top are content coords; sx/sy are the click's screen coords so the
  // composer can open right where the user clicked.
  draft: { left: number; top: number; target: string | null; sx?: number; sy?: number } | null;
  presence: PresenceMember[];
  onlineCount: number;
  selfClientId: string;

  setSelf: (clientId: string) => void;
  init: (id: string) => Promise<void>;
  loadComments: () => Promise<void>;
  setMode: (m: Mode) => void;
  setDevice: (d: Device) => void;
  setFit: (s: number) => void;
  zoomIn: () => void; zoomOut: () => void; zoomReset: () => void;
  effScale: () => number;
  toggleVersions: () => void; toggleShare: () => void;
  openUpload: () => void; closeUpload: () => void;
  pickVersion: (v: number) => Promise<void>;
  setFilter: (f: "active" | "resolved") => void;
  selectPin: (id: string | null) => void;
  setDraft: (d: ViewerState["draft"]) => void;
  submitDraft: (body: string) => Promise<void>;
  reply: (commentId: string, body: string) => Promise<void>;
  resolve: (commentId: string, resolved: boolean) => Promise<void>;
  applyRemoteComment: (c: Comment) => void;
  setPresence: (p: PresenceMember[]) => void;
  upsertCursor: (clientId: string, cursor: { x: number; y: number } | null, member?: PresenceMember) => void;
  removeMember: (clientId: string) => void;
}

export const useViewer = create<ViewerState>((set, get) => ({
  id: "", me: null, proto: null, versions: [], version: 1, comments: [],
  filter: "active", mode: "browse", device: "desktop", zoom: null, fitScale: 1,
  versionsOpen: false, shareOpen: false, uploadOpen: false, selectedPinId: null, draft: null,
  presence: [], onlineCount: 0, selfClientId: "",

  setSelf: (selfClientId) => set({ selfClientId }),
  init: async (id) => {
    set({ id });
    const [me, proto, versions] = await Promise.all([
      apiGet<ViewerState["me"]>("/auth/me").catch(() => null),
      apiGet<Prototype>(`/prototypes/${id}`),
      apiGet<Version[]>(`/prototypes/${id}/versions`),
    ]);
    const current = versions.find((v) => v.current)?.version ?? proto.version;
    set({ me, proto, versions, version: current });
    await get().loadComments();
  },

  loadComments: async () => {
    const comments = await apiGet<Comment[]>(`/prototypes/${get().id}/comments`);
    set({ comments });
  },

  setMode: (mode) => set({ mode, draft: null, selectedPinId: null }),
  setDevice: (device) => set({ device, zoom: null }),
  setFit: (fitScale) => set({ fitScale }),
  zoomIn: () => { const z = get().effScale(); const next = ZOOMS.find((s) => s > z + 0.001); set({ zoom: next ?? ZOOMS[ZOOMS.length - 1] }); },
  zoomOut: () => { const z = get().effScale(); const prev = [...ZOOMS].reverse().find((s) => s < z - 0.001); set({ zoom: prev ?? ZOOMS[0] }); },
  zoomReset: () => set({ zoom: null }),
  effScale: () => { const { zoom, fitScale } = get(); return zoom ?? fitScale; },

  toggleVersions: () => set((s) => ({ versionsOpen: !s.versionsOpen, shareOpen: false })),
  toggleShare: () => set((s) => ({ shareOpen: !s.shareOpen, versionsOpen: false })),
  openUpload: () => set({ uploadOpen: true }),
  closeUpload: () => set({ uploadOpen: false }),

  pickVersion: async (v) => {
    set({ version: v, versionsOpen: false, selectedPinId: null, draft: null });
  },

  setFilter: (filter) => set({ filter }),
  selectPin: (selectedPinId) => set({ selectedPinId, draft: null }),
  setDraft: (draft) => set({ draft, selectedPinId: null }),

  submitDraft: async (body) => {
    const { id, version, draft } = get();
    if (!draft || !body.trim()) return;
    await apiPost(`/prototypes/${id}/comments`, { version, left: draft.left, top: draft.top, target: draft.target, body });
    set({ draft: null });
    await get().loadComments();
    toast.success("Comment added.");
  },

  reply: async (commentId, body) => {
    await apiPost(`/comments/${commentId}/replies`, { body });
    await get().loadComments();
  },
  resolve: async (commentId, resolved) => {
    await apiPost(`/comments/${commentId}/resolve`, { resolved });
    await get().loadComments();
    toast.success(resolved ? "Comment resolved." : "Comment reopened.");
  },

  applyRemoteComment: (c) => {
    const comments = get().comments.slice();
    const i = comments.findIndex((x) => x.id === c.id);
    if (i >= 0) comments[i] = c; else comments.push(c);
    set({ comments });
  },

  setPresence: (presence) => set({ presence, onlineCount: presence.length }),
  upsertCursor: (clientId, cursor, member) => {
    const presence = get().presence.slice();
    const i = presence.findIndex((m) => m.clientId === clientId);
    if (i >= 0) presence[i] = { ...presence[i], cursor };
    else if (member) presence.push({ ...member, cursor });
    set({ presence, onlineCount: presence.length });
  },
  removeMember: (clientId) => {
    const presence = get().presence.filter((m) => m.clientId !== clientId);
    set({ presence, onlineCount: presence.length });
  },
}));
