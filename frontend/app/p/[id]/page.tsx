"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useViewer } from "@/store/useViewer";
import { useViewerSocket } from "@/components/viewer/useViewerSocket";
import { ViewerTopbar } from "@/components/viewer/ViewerTopbar";
import { CanvasToolbar } from "@/components/viewer/CanvasToolbar";
import { Canvas } from "@/components/viewer/Canvas";
import { ModeToolbar } from "@/components/viewer/ModeToolbar";
import { CommentsSidebar } from "@/components/viewer/CommentsSidebar";
import { DraftComposer } from "@/components/viewer/DraftComposer";
import { VersionsDrawer } from "@/components/viewer/VersionsDrawer";
import { ShareDrawer } from "@/components/viewer/ShareDrawer";
import { UploadVersionModal } from "@/components/viewer/UploadVersionModal";

export default function ViewerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { init, mode } = useViewer();
  const { sendCursor } = useViewerSocket(id);
  const [error, setError] = React.useState("");
  const [fs, setFs] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    init(id).catch((e) => {
      if (e instanceof ApiError && e.status === 401) router.push("/login");
      else if (e instanceof ApiError && e.status === 404) setError("This prototype doesn't exist or you don't have access.");
      else setError("Could not load the prototype.");
    });
  }, [id, init, router]);

  const toggleFs = () => {
    const el = rootRef.current;
    if (!document.fullscreenElement) { el?.requestFullscreen?.(); setFs(true); }
    else { document.exitFullscreen?.(); setFs(false); }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
        <p className="text-text-strong">{error}</p>
        <button onClick={() => router.push("/dashboard")} className="mt-4 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Back to dashboard</button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex h-screen flex-col overflow-hidden bg-bg">
      {!fs && <ViewerTopbar />}
      <CanvasToolbar onFullscreen={toggleFs} />
      <div className="relative flex min-h-0 flex-1">
        <Canvas sendCursor={sendCursor} />
        {mode === "comment" && <CommentsSidebar />}
        <ModeToolbar />
        <DraftComposer />
      </div>
      <VersionsDrawer />
      <ShareDrawer />
      <UploadVersionModal />
    </div>
  );
}
