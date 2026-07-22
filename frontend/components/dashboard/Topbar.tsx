"use client";

import { ChevronRight } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { initialsOf } from "@/lib/format";

export function Topbar() {
  const { me, openSettings } = useDashboard();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border bg-[var(--surface)]/90 px-6 backdrop-blur">
      <Logo />
      <span className="mx-1 h-5 w-px bg-border" />
      <span className="text-[15px] font-semibold text-text-muted">Canvas</span>

      <div className="flex-1" />

      <ThemeToggle />

      <button
        onClick={() => openSettings("profile")}
        className="flex items-center gap-2.5 rounded-full border border-border bg-[var(--surface)] py-1 pl-1 pr-3 transition-colors hover:border-[var(--slate-300)]"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg,#5aa9e0,#3d7fb8)" }}
        >
          {me ? initialsOf(me.display_name) : "…"}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold text-text-strong">
            {me?.display_name ?? ""}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
            {me?.org_role ?? ""}
          </span>
        </span>
        <ChevronRight size={15} className="text-text-faint" />
      </button>
    </header>
  );
}
