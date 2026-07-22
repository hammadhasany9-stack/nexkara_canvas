"use client";

import { FolderOpen, Upload } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";

export function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  const openUpload = useDashboard((s) => s.openUpload);
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/50 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-subtle text-text-faint">
        <FolderOpen size={26} />
      </div>
      <h3 className="mt-4 font-semibold text-text-strong">No prototypes found</h3>
      <p className="mt-1 max-w-xs text-sm text-text-muted">
        {hasQuery
          ? "Try a different search, or upload a new HTML prototype."
          : "Upload a live HTML prototype to gather feedback in context."}
      </p>
      {!hasQuery && (
        <Button className="mt-5" onClick={openUpload}>
          <Upload size={16} /> Upload prototype
        </Button>
      )}
    </div>
  );
}
