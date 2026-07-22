"use client";

import { create } from "zustand";
import { apiGet } from "@/lib/api";
import type { AdminUser, Notification, Prototype, Section } from "@/lib/types";

type Me = { id: string; email: string; display_name: string; org_role: string };
type Counts = Record<Section, number>;

interface DashboardState {
  me: Me | null;
  view: "grid" | "list";
  section: Section;
  query: string;
  prototypes: Prototype[];
  counts: Counts;
  loading: boolean;

  notifications: Notification[];
  unread: number;

  // modal state
  uploadOpen: boolean;
  shareTarget: Prototype | null;
  shareIsNew: boolean;
  settingsTab: "profile" | "password" | "users" | null;
  notifOpen: boolean;
  renameTarget: Prototype | null;
  confirm: { title: string; body: string; label: string; onConfirm: () => void } | null;

  setView: (v: "grid" | "list") => void;
  setSection: (s: Section) => void;
  setQuery: (q: string) => void;

  loadMe: () => Promise<void>;
  refresh: () => Promise<void>;
  loadNotifications: () => Promise<void>;

  openUpload: () => void;
  closeUpload: () => void;
  openShare: (t: Prototype, isNew?: boolean) => void;
  closeShare: () => void;
  openSettings: (tab?: "profile" | "password" | "users") => void;
  closeSettings: () => void;
  toggleNotif: () => void;
  openRename: (p: Prototype) => void;
  closeRename: () => void;
  askConfirm: (c: DashboardState["confirm"]) => void;
  closeConfirm: () => void;
}

export const useDashboard = create<DashboardState>((set, get) => ({
  me: null,
  view: "grid",
  section: "home",
  query: "",
  prototypes: [],
  counts: { home: 0, recents: 0, shared: 0, trash: 0 },
  loading: false,
  notifications: [],
  unread: 0,

  uploadOpen: false,
  shareTarget: null,
  shareIsNew: false,
  settingsTab: null,
  notifOpen: false,
  renameTarget: null,
  confirm: null,

  setView: (view) => set({ view }),
  setSection: (section) => {
    set({ section });
    get().refresh();
  },
  setQuery: (query) => {
    set({ query });
    get().refresh();
  },

  loadMe: async () => {
    try {
      const me = await apiGet<Me>("/auth/me");
      set({ me });
    } catch {
      /* middleware handles redirect */
    }
  },

  refresh: async () => {
    const { section, query } = get();
    set({ loading: true });
    try {
      const qs = new URLSearchParams({ section });
      if (query) qs.set("q", query);
      const [protos, counts] = await Promise.all([
        apiGet<Prototype[]>(`/prototypes?${qs.toString()}`),
        apiGet<Counts>("/prototypes/counts"),
      ]);
      set({ prototypes: protos, counts });
    } finally {
      set({ loading: false });
    }
  },

  loadNotifications: async () => {
    const res = await apiGet<{ items: Notification[]; unread: number }>("/notifications");
    set({ notifications: res.items, unread: res.unread });
  },

  openUpload: () => set({ uploadOpen: true }),
  closeUpload: () => set({ uploadOpen: false }),
  openShare: (t, isNew = false) => set({ shareTarget: t, shareIsNew: isNew }),
  closeShare: () => set({ shareTarget: null, shareIsNew: false }),
  openSettings: (tab = "profile") => set({ settingsTab: tab }),
  closeSettings: () => set({ settingsTab: null }),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
  openRename: (p) => set({ renameTarget: p }),
  closeRename: () => set({ renameTarget: null }),
  askConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
}));

export type { AdminUser };
