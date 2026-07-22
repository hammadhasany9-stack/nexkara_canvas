import { Check } from "lucide-react";
import { Logo } from "./Logo";

const FEATURES = [
  "Pin comments to any element, live on the canvas",
  "Desktop, tablet & mobile layouts side by side",
  "Secured with two-factor sign-in",
];

/** Left marketing panel. Hidden below 900px (card-only on mobile). */
export function CoverPanel() {
  return (
    <div className="relative hidden min-[900px]:flex flex-col justify-between overflow-hidden bg-surface p-12 lg:p-16">
      {/* soft brand glow */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--brand-100)" }}
      />
      <div className="relative">
        <Logo />
      </div>

      <div className="relative max-w-md">
        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
          Prototype collaboration
        </span>
        <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-text-strong lg:text-4xl">
          Every prototype, reviewed in one trusted space.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          Upload, share, and collect precise feedback on live HTML prototypes —
          with version history and role-based access.
        </p>

        <ul className="mt-8 grid gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-text-body">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Check size={13} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative text-xs text-text-faint">
        © 2026 Nexkara. All rights reserved.
      </div>
    </div>
  );
}
