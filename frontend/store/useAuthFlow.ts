"use client";

import { create } from "zustand";
import { ApiError, apiPost } from "@/lib/api";

export type Step = "login" | "twofa" | "forgot" | "forgotcode" | "reset";

type LoginResponse = {
  status: "authenticated" | "2fa_required";
  masked_email?: string | null;
};
type ForgotResponse = { status: string; masked_email?: string | null };
type VerifyCodeResponse = { reset_token: string };

const RESEND_SECONDS = 30;

interface AuthFlowState {
  step: Step;
  email: string;
  password: string;
  forgotEmail: string;
  maskedEmail: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  resetToken: string;
  trustDevice: boolean;
  showPassword: boolean;
  resendIn: number;
  loading: boolean;
  error: string;
  info: string;
  shake: boolean;

  set: (patch: Partial<AuthFlowState>) => void;
  goto: (step: Step) => void;
  setCode: (code: string[]) => void;
  startResend: () => void;
  tickResend: () => void;

  submitLogin: (onAuthed: () => void) => Promise<void>;
  verifyTwoFactor: (onAuthed: () => void) => Promise<void>;
  sendForgot: () => Promise<void>;
  verifyResetCode: () => Promise<void>;
  savePassword: () => Promise<void>;
  resend: () => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useAuthFlow = create<AuthFlowState>((set, get) => ({
  step: "login",
  email: "",
  password: "",
  forgotEmail: "",
  maskedEmail: "",
  code: ["", "", "", "", "", ""],
  newPassword: "",
  confirmPassword: "",
  resetToken: "",
  trustDevice: true,
  showPassword: false,
  resendIn: 0,
  loading: false,
  error: "",
  info: "",
  shake: false,

  set: (patch) => set(patch),
  goto: (step) => set({ step, error: "", code: ["", "", "", "", "", ""] }),
  setCode: (code) => set({ code }),

  startResend: () => set({ resendIn: RESEND_SECONDS }),
  tickResend: () => {
    const { resendIn } = get();
    if (resendIn > 0) set({ resendIn: resendIn - 1 });
  },

  submitLogin: async (onAuthed) => {
    const { email, password } = get();
    if (!EMAIL_RE.test(email)) {
      set({ error: "Enter a valid work email address." });
      return;
    }
    if (!password) {
      set({ error: "Enter your password to continue." });
      return;
    }
    set({ loading: true, error: "" });
    try {
      const res = await apiPost<LoginResponse>("/auth/login", { email, password });
      if (res.status === "authenticated") {
        onAuthed();
      } else {
        set({ step: "twofa", maskedEmail: res.masked_email || "", code: ["", "", "", "", "", ""] });
        get().startResend();
      }
    } catch (e) {
      set({ error: e instanceof ApiError ? e.message : "Sign-in failed." });
    } finally {
      set({ loading: false });
    }
  },

  verifyTwoFactor: async (onAuthed) => {
    const code = get().code.join("");
    if (code.length !== 6) {
      set({ error: "Enter all 6 digits of your code.", shake: true });
      setTimeout(() => set({ shake: false }), 450);
      return;
    }
    set({ loading: true, error: "" });
    try {
      await apiPost("/auth/2fa/verify", { code, trust_device: get().trustDevice });
      onAuthed();
    } catch (e) {
      set({
        error: e instanceof ApiError ? e.message : "Verification failed.",
        shake: true,
        code: ["", "", "", "", "", ""],
      });
      setTimeout(() => set({ shake: false }), 450);
    } finally {
      set({ loading: false });
    }
  },

  sendForgot: async () => {
    const { forgotEmail } = get();
    if (!EMAIL_RE.test(forgotEmail)) {
      set({ error: "Enter a valid work email address." });
      return;
    }
    set({ loading: true, error: "" });
    try {
      const res = await apiPost<ForgotResponse>("/auth/password/forgot", {
        email: forgotEmail,
      });
      set({
        step: "forgotcode",
        maskedEmail: res.masked_email || "",
        code: ["", "", "", "", "", ""],
      });
      get().startResend();
    } catch (e) {
      set({ error: e instanceof ApiError ? e.message : "Could not send code." });
    } finally {
      set({ loading: false });
    }
  },

  verifyResetCode: async () => {
    const code = get().code.join("");
    if (code.length !== 6) {
      set({ error: "Enter all 6 digits of your code.", shake: true });
      setTimeout(() => set({ shake: false }), 450);
      return;
    }
    set({ loading: true, error: "" });
    try {
      const res = await apiPost<VerifyCodeResponse>("/auth/password/verify-code", {
        email: get().forgotEmail,
        code,
      });
      set({ step: "reset", resetToken: res.reset_token, error: "" });
    } catch (e) {
      set({
        error: e instanceof ApiError ? e.message : "Verification failed.",
        shake: true,
        code: ["", "", "", "", "", ""],
      });
      setTimeout(() => set({ shake: false }), 450);
    } finally {
      set({ loading: false });
    }
  },

  savePassword: async () => {
    const { newPassword, confirmPassword, resetToken } = get();
    if (newPassword !== confirmPassword) {
      set({ error: "Passwords don't match." });
      return;
    }
    set({ loading: true, error: "" });
    try {
      await apiPost("/auth/password/reset", {
        reset_token: resetToken,
        new_password: newPassword,
      });
      set({
        step: "login",
        info: "Password updated. Sign in with your new password.",
        password: "",
        newPassword: "",
        confirmPassword: "",
        error: "",
      });
    } catch (e) {
      set({ error: e instanceof ApiError ? e.message : "Could not update password." });
    } finally {
      set({ loading: false });
    }
  },

  resend: async () => {
    if (get().resendIn > 0) return;
    const path =
      get().step === "twofa" ? "/auth/2fa/resend" : "/auth/password/forgot";
    const payload =
      get().step === "twofa" ? undefined : { email: get().forgotEmail };
    try {
      await apiPost(path, payload);
      set({ code: ["", "", "", "", "", ""] });
      get().startResend();
    } catch {
      /* keep the cooldown; surfacing an error here isn't useful */
    }
  },
}));
