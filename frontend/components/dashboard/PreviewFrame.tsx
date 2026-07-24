"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Live thumbnail of an uploaded prototype. Renders the actual HTML in a
 * non-interactive, sandboxed iframe scaled down to fit the card (the iframe
 * viewport is 4x the container, scaled to 0.25, so content lays out at a
 * desktop-ish width regardless of card size).
 */
export function PreviewFrame({
  id,
  version,
  className,
}: {
  id: string;
  version: number;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      <iframe
        // Auth cookie rides along on this same-origin request; `sandbox` without
        // allow-same-origin isolates the rendered document from the app.
        src={`/api/prototypes/${id}/raw?v=${version}`}
        title=""
        aria-hidden
        tabIndex={-1}
        scrolling="no"
        loading="lazy"
        sandbox="allow-scripts"
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: "400%", height: "400%", transform: "scale(0.25)", border: 0 }}
      />
    </div>
  );
}
