import { Check } from "lucide-react";
import { Logo } from "./Logo";

const FEATURES = [
  "Pin comments to any element, live on the canvas",
  "Desktop, tablet & mobile layouts side by side",
  "Secured with two-factor sign-in",
];

/** Left marketing panel. Always-dark navy gradient; hidden below 900px. */
export function CoverPanel() {
  return (
    <div
      className="relative hidden min-[900px]:flex flex-col justify-between overflow-hidden p-12 lg:p-[52px]"
      style={{ background: "linear-gradient(150deg,#0f2942 0%,#16324f 46%,#0d2038 100%)" }}
    >
      {/* glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{ top: -160, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,137,107,.5) 0%,rgba(0,137,107,0) 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{ bottom: -180, left: -120, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(90,169,224,.28) 0%,rgba(90,169,224,0) 70%)" }}
      />

      {/* header: logo + Canvas */}
      <div className="relative flex items-center gap-3">
        <Logo className="brightness-0 invert" />
        <span className="h-5 w-px bg-white/20" />
        <span className="text-[15px] font-semibold text-white/85">Canvas</span>
      </div>

      {/* body */}
      <div className="relative max-w-md">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#22c39c]" style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
          Prototype collaboration
        </span>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-[2.6rem]">
          Every prototype, reviewed in one trusted space.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/65">
          Upload, share, and collect precise feedback on live HTML prototypes —
          with version history and role-based access.
        </p>

        <ul className="mt-8 grid gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-white/85">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c39c]/20 text-[#22c39c]">
                <Check size={13} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* footer */}
      <div
        className="relative text-white/40"
        style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: "0.6rem", letterSpacing: "0.08em" }}
      >
        © 2026 NEXKARA · CANVAS
      </div>
    </div>
  );
}
