"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { Logo } from "@/components/auth/Logo";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";

type Me = { email: string; display_name: string; org_role: string };

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = React.useState<Me | null>(null);

  React.useEffect(() => {
    apiGet<Me>("/auth/me")
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.push("/login");
      });
  }, [router]);

  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-600">
          Signed in
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-strong">
          Welcome to Canvas{me ? `, ${me.display_name}` : ""}.
        </h1>
        <p className="mt-3 text-text-muted">
          Authentication is wired up end-to-end. The dashboard (projects,
          upload, sharing, comments) lands in the next plan.
        </p>
        {me && (
          <dl className="mt-8 grid max-w-sm gap-3 rounded-card border border-border bg-surface p-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium text-text-body">{me.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Role</dt>
              <dd className="font-medium text-text-body capitalize">
                {me.org_role}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </main>
  );
}
