"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { useAuthFlow } from "@/store/useAuthFlow";
import { CoverPanel } from "@/components/auth/CoverPanel";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { Logo } from "@/components/auth/Logo";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/auth/Banner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordRules, allRulesPass } from "@/components/auth/PasswordRules";

type Info = { email: string; display_name: string };

export default function InvitePage() {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<Info | null>(null);
  const [invalid, setInvalid] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { setInvalid("This invite link is missing its token."); return; }
    setToken(t);
    apiGet<Info>(`/invite/validate?token=${encodeURIComponent(t)}`)
      .then(setInfo)
      .catch((e) => setInvalid(e instanceof ApiError ? e.message : "This invite link is invalid or has expired."));
  }, []);

  const submit = async () => {
    if (pw !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    try {
      const res = await apiPost<Info>("/invite/accept", { token, new_password: pw });
      // Hand off to the normal sign-in flow -> 2FA -> dashboard.
      useAuthFlow.getState().set({
        step: "login",
        email: res.email,
        info: "Password set. Sign in to continue.",
        password: "",
      });
      router.push("/login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not set your password.");
    } finally { setLoading(false); }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 min-[900px]:grid-cols-2">
      <CoverPanel />
      <div className="relative flex flex-col bg-bg">
        <div className="flex items-center justify-between p-6">
          <div className="min-[900px]:invisible"><Logo /></div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            {invalid ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-text-strong">Invite link problem</h2>
                <p className="mt-2 text-sm text-text-muted">{invalid}</p>
                <Button className="mt-6" onClick={() => router.push("/login")}>Go to sign in</Button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-text-strong">Set your password</h2>
                <p className="mt-2 text-sm text-text-muted">
                  {info ? `Welcome, ${info.display_name}. ` : ""}Choose a strong password to finish setting up your account.
                </p>
                <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                  {error && <Banner kind="error">{error}</Banner>}
                  {info && (
                    <div className="grid gap-1.5">
                      <Label>Work email</Label>
                      <input value={info.email} readOnly
                        className="h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-muted" />
                    </div>
                  )}
                  <div className="grid gap-1.5">
                    <Label htmlFor="pw">New password</Label>
                    <PasswordField id="pw" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                    <PasswordRules password={pw} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="confirm">Confirm new password</Label>
                    <PasswordField id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={loading || !allRulesPass(pw) || pw !== confirm}>
                    {loading ? "Setting password…" : "Set password & continue"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
