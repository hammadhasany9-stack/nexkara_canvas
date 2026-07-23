"use client";

import { Upload } from "lucide-react";
import { useViewer } from "@/store/useViewer";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { initialsOf } from "@/lib/format";

export function ViewerTopbar() {
  const { me, onlineCount, presence, openUpload, proto } = useViewer();
  const canUpload = proto?.my_access === "editor" || proto?.my_access === "manager";
  const online = Math.max(1, onlineCount);

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border bg-[var(--surface)]/90 px-6 backdrop-blur">
      <Logo />
      <span className="mx-1 h-5 w-px bg-border" />
      <span className="text-[15px] font-semibold text-text-muted">Canvas</span>
      <div className="flex-1" />

      <div className="hidden items-center gap-2 sm:flex">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-patina-text">
          <span className="h-[7px] w-[7px] rounded-full bg-patina shadow-[0_0_0_3px_var(--patina-50)]" /> {online} online
        </span>
        <div className="flex -space-x-2">
          {presence.slice(0, 4).map((p) => (
            <span key={p.clientId} title={p.name}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--surface)]"
              style={{ background: p.color }}>
              {initialsOf(p.name)}
            </span>
          ))}
        </div>
      </div>

      <ThemeToggle />

      {canUpload && (
        <button onClick={openUpload} className="flex items-center gap-2 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          <Upload size={16} /> Upload Version
        </button>
      )}

      {me && (
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-[var(--surface)] py-1 pl-1 pr-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#5aa9e0,#3d7fb8)" }}>
            {initialsOf(me.display_name)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold text-text-strong">{me.display_name}</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />{me.org_role}
            </span>
          </span>
        </div>
      )}
    </header>
  );
}
