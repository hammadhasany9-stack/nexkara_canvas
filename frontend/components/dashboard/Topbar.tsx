"use client";

import { Menu, Settings } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { initialsOf } from "@/lib/format";

export function Topbar() {
  const { me, openSettings, toggleMobileNav } = useDashboard();

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border bg-[var(--surface)]/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={toggleMobileNav}
        aria-label="Open menu"
        className="lp-iconbtn flex h-9 w-9 items-center justify-center rounded-control text-text-muted hover:bg-[var(--surface-subtle)] hover:text-text-strong md:hidden"
      >
        <Menu size={20} />
      </button>
      <Logo />
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
      <span className="hidden text-[15px] font-semibold text-text-muted sm:block">Canvas</span>

      <div className="flex-1" />

      <ThemeToggle />

      <button
        onClick={() => openSettings("profile")}
        title="Your profile"
        className="lp-press flex items-center gap-2.5 rounded-r-[10px] border-l border-border py-1 pl-3.5 pr-2 transition-colors hover:bg-[var(--surface-subtle)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-patina font-mono text-[0.62rem] font-bold text-white">
          {me ? initialsOf(me.display_name) : "…"}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[0.82rem] font-semibold text-text-strong">
            {me?.display_name ?? ""}
          </span>
          <span className="flex items-center gap-1 font-mono text-[0.54rem] uppercase tracking-[0.08em] text-brand-600">
            <span className="h-[5px] w-[5px] rounded-full bg-brand-600" />
            {me?.org_role ?? ""}
          </span>
        </span>
        <Settings size={15} className="text-text-faint" />
      </button>
    </header>
  );
}
