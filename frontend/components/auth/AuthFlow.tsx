"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthFlow } from "@/store/useAuthFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banner } from "./Banner";
import { CodeInput } from "./CodeInput";
import { PasswordField } from "./PasswordField";
import { PasswordRules, allRulesPass } from "./PasswordRules";
import { ResendRow } from "./ResendRow";

const HEADINGS: Record<string, { title: string; sub: string }> = {
  login: {
    title: "Sign in to Canvas",
    sub: "Enter your work credentials to continue.",
  },
  twofa: {
    title: "Two-factor verification",
    sub: "",
  },
  forgot: {
    title: "Reset your password",
    sub: "Enter your work email and we'll send a verification code so you can set a new password.",
  },
  forgotcode: { title: "Verify your email", sub: "" },
  reset: {
    title: "Set a new password",
    sub: "Email verified. Choose a strong password you don't use elsewhere.",
  },
};

export function AuthFlow() {
  const router = useRouter();
  const s = useAuthFlow();
  const onAuthed = React.useCallback(() => {
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  const codeSub = `We sent a 6-digit code to ${s.maskedEmail || "your email"}. Enter it below to continue.`;
  const heading = HEADINGS[s.step];

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold tracking-tight text-text-strong">
        {heading.title}
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        {s.step === "twofa" || s.step === "forgotcode" ? codeSub : heading.sub}
      </p>

      <div className="mt-6 grid gap-4">
        {s.error && <Banner kind="error">{s.error}</Banner>}
        {s.step === "login" && s.info && <Banner kind="info">{s.info}</Banner>}

        {/* ---------------- LOGIN ---------------- */}
        {s.step === "login" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              s.submitLogin(onAuthed);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@nexkara.com"
                value={s.email}
                onChange={(e) => s.set({ email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => s.goto("forgot")}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Forgot?
                </button>
              </div>
              <PasswordField
                id="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={s.password}
                onChange={(e) => s.set({ password: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={s.loading}>
              {s.loading ? "Signing in…" : "Continue"}
            </Button>
          </form>
        )}

        {/* ---------------- 2FA ---------------- */}
        {s.step === "twofa" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              s.verifyTwoFactor(onAuthed);
            }}
          >
            <CodeInput
              value={s.code}
              onChange={s.setCode}
              shake={s.shake}
              autoFocus
            />
            <label className="flex items-start gap-2.5 text-sm text-text-body">
              <input
                type="checkbox"
                checked={s.trustDevice}
                onChange={(e) => s.set({ trustDevice: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand-600)]"
              />
              <span>
                Trust this device for 30 days
                <span className="block text-xs text-text-faint">
                  You&apos;ll still enter your password, but skip this code until
                  it expires.
                </span>
              </span>
            </label>
            <Button type="submit" disabled={s.loading}>
              {s.loading ? "Verifying…" : "Verify & sign in"}
            </Button>
            <ResendRow />
            <BackToSignIn />
          </form>
        )}

        {/* ---------------- FORGOT ---------------- */}
        {s.step === "forgot" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              s.sendForgot();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="forgotEmail">Work email</Label>
              <Input
                id="forgotEmail"
                type="email"
                autoComplete="username"
                placeholder="you@nexkara.com"
                value={s.forgotEmail}
                onChange={(e) => s.set({ forgotEmail: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={s.loading}>
              {s.loading ? "Sending…" : "Send verification code"}
            </Button>
            <BackToSignIn />
          </form>
        )}

        {/* ---------------- FORGOT CODE ---------------- */}
        {s.step === "forgotcode" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              s.verifyResetCode();
            }}
          >
            <CodeInput
              value={s.code}
              onChange={s.setCode}
              shake={s.shake}
              autoFocus
            />
            <Button type="submit" disabled={s.loading}>
              {s.loading ? "Verifying…" : "Verify email"}
            </Button>
            <ResendRow />
            <BackToSignIn />
          </form>
        )}

        {/* ---------------- RESET ---------------- */}
        {s.step === "reset" && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              s.savePassword();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordField
                id="newPassword"
                autoComplete="new-password"
                value={s.newPassword}
                onChange={(e) => s.set({ newPassword: e.target.value })}
              />
              <PasswordRules password={s.newPassword} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordField
                id="confirmPassword"
                autoComplete="new-password"
                value={s.confirmPassword}
                onChange={(e) => s.set({ confirmPassword: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              disabled={
                s.loading ||
                !allRulesPass(s.newPassword) ||
                s.newPassword !== s.confirmPassword
              }
            >
              {s.loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function BackToSignIn() {
  const goto = useAuthFlow((st) => st.goto);
  return (
    <button
      type="button"
      onClick={() => goto("login")}
      className="text-sm text-text-muted hover:text-text-strong"
    >
      ← Back to sign in
    </button>
  );
}
