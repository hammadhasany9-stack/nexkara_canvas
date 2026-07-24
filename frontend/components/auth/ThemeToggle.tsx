"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

export function applyStoredTheme() {
  try {
    const stored = localStorage.getItem("lp-theme");
    if (stored === "dark") document.documentElement.classList.add("dark");
  } catch {
    /* ignore */
  }
}

export function ThemeToggle() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("lp-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="lp-iconbtn flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface text-text-muted transition-colors hover:border-brand-600/40 hover:bg-surface-subtle hover:text-text-strong"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
