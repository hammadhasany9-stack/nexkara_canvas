"use client";

import { Search, Upload } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";

export function Hero() {
  const { query, setQuery, counts, prototypes, unread, openUpload } = useDashboard();

  const people = new Set<string>();
  prototypes.forEach((p) => [p.owner, ...p.people].forEach((u) => people.add(u.id)));
  const collaborators = Math.max(people.size, 1);

  return (
    <section className="relative overflow-hidden border-b border-border px-6 py-14 lg:py-16">
      {/* dotted texture + soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, var(--brand-50), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1
          className="text-text-strong"
          style={{
            fontSize: "3.1rem",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            maxWidth: "14ch",
          }}
        >
          Welcome to Canvas
        </h1>
        <h2 className="mt-3 text-text-body" style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
          Your collaboration pro
        </h2>
        <p className="mt-3 text-text-muted" style={{ fontSize: "1.02rem", lineHeight: 1.5, maxWidth: "42ch" }}>
          Upload a prototype, gather comments in context, and ship the next version together.
        </p>

        {/* search pill with inline upload */}
        <div className="dash-search mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-[var(--surface)] py-2 pl-5 pr-2 shadow-sm">
          <Search size={18} className="shrink-0 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prototypes, people…"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-text-strong placeholder:text-text-faint focus:outline-none"
          />
          <button
            onClick={openUpload}
            className="flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Upload size={16} /> Upload
          </button>
        </div>

        {/* stats */}
        <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
          <span>{counts.home} Prototypes</span>
          <Dot />
          <span>{collaborators} Collaborators</span>
          <Dot />
          <span>{unread} Updates today</span>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-text-faint/60" />;
}
