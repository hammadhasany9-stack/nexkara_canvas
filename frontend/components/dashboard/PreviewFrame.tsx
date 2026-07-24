"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Prototype thumbnail. Prefers a static server-rendered PNG (a one-time snapshot
 * cached on the backend) so JS-driven prototypes don't keep animating/flickering
 * in the grid. If the backend can't produce a thumbnail (no headless browser),
 * it falls back to a live, sandboxed, memoized iframe.
 */
function PreviewFrameImpl({
  id,
  version,
  className,
}: {
  id: string;
  version: number;
  className?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [useIframe, setUseIframe] = React.useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-white", className)}>
      {!useIframe ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/prototypes/${id}/thumbnail?v=${version}`}
          alt=""
          aria-hidden
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setUseIframe(true)}
          className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      ) : (
        <iframe
          src={`/api/prototypes/${id}/raw?v=${version}`}
          title=""
          aria-hidden
          tabIndex={-1}
          scrolling="no"
          loading="lazy"
          sandbox="allow-scripts"
          onLoad={() => setLoaded(true)}
          className="pointer-events-none absolute left-0 top-0 origin-top-left transition-opacity duration-300"
          style={{ width: "400%", height: "400%", transform: "scale(0.25)", border: 0, opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

export const PreviewFrame = React.memo(
  PreviewFrameImpl,
  (a, b) => a.id === b.id && a.version === b.version && a.className === b.className,
);
