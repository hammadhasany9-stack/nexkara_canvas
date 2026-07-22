"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
import type { Prototype } from "@/lib/types";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { Button } from "@/components/ui/button";

/** Placeholder Viewer — the full collaborative canvas arrives in Plan 03. */
export default function ViewerPlaceholder() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [proto, setProto] = React.useState<Prototype | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    apiGet<Prototype>(`/prototypes/${id}`)
      .then(setProto)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.push("/login");
        else setError(e instanceof ApiError ? e.message : "Could not load prototype.");
      });
  }, [id, router]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={16} /> Home
          </Button>
          <Logo />
        </div>
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        {error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text-strong">
              {proto ? proto.name : "Loading…"}
            </h1>
            <p className="mt-3 text-text-muted">
              The collaborative canvas — sandboxed preview, pinned comments, versions
              and live presence — lands in Plan 03. This prototype is uploaded and
              stored{proto ? ` (v${proto.version})` : ""}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
