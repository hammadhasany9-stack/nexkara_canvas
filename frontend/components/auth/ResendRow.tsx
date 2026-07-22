"use client";

import * as React from "react";
import { useAuthFlow } from "@/store/useAuthFlow";

export function ResendRow() {
  const resendIn = useAuthFlow((s) => s.resendIn);
  const tick = useAuthFlow((s) => s.tickResend);
  const resend = useAuthFlow((s) => s.resend);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [resendIn, tick]);

  const mmss = `0:${String(Math.max(0, resendIn)).padStart(2, "0")}`;

  return (
    <p className="text-sm text-text-muted">
      Didn&apos;t get it?{" "}
      {resendIn > 0 ? (
        <span className="text-text-faint">Resend code in {mmss}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Resend code
        </button>
      )}
    </p>
  );
}
