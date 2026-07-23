"use client";

import * as React from "react";
import { ChevronLeft, LogOut, Mail, Minus, RefreshCw, Settings, ShieldCheck, Trash2, User, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Modal } from "@/components/ui/modal";
import { Banner } from "@/components/auth/Banner";
import { PasswordField } from "@/components/auth/PasswordField";
import { Avatar } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-input border border-border bg-[var(--surface-subtle)] px-3.5 text-sm text-text-strong placeholder:text-text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-ring";

export function SettingsPanel() {
  const router = useRouter();
  const { settingsTab, closeSettings, openSettings, me, loadMe } = useDashboard();
  const isAdmin = me?.org_role === "admin";
  if (!settingsTab) return null;

  const nav: { id: "profile" | "password" | "users"; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "password", label: "Change Password", icon: ShieldCheck },
    ...(isAdmin ? [{ id: "users" as const, label: "Users & Access", icon: Users }] : []),
  ];

  const logout = async () => {
    try { await apiPost("/auth/logout"); } catch { /* ignore */ }
    router.push("/login"); router.refresh();
  };

  return (
    <div className="fixed inset-0 z-40 flex bg-bg">
      {/* left panel */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-[var(--surface)]/40 md:flex">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-[var(--surface-subtle)] text-brand-600">
            <Settings size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-text-strong">Settings</span>
            <span className="block text-[11px] text-text-faint">Account, security &amp; access</span>
          </span>
        </div>
        <nav className="grid gap-0.5 p-3">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => openSettings(id)}
              className={cn("dash-navitem flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium",
                settingsTab === id ? "bg-brand-100 text-brand-700" : "text-text-muted")}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-2 p-4 text-sm font-semibold text-danger hover:underline">
          <LogOut size={16} /> Log out
        </button>
      </aside>

      {/* main */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <button onClick={closeSettings} className="lp-iconbtn flex h-9 w-9 items-center justify-center rounded-control text-text-muted hover:text-text-strong">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-strong">Settings</h1>
            <p className="text-sm text-text-muted">Account, security &amp; access control</p>
          </div>
        </div>
        <div className="p-6 lg:p-10">
          {settingsTab === "profile" && <ProfileTab onSaved={loadMe} />}
          {settingsTab === "password" && <PasswordTab />}
          {settingsTab === "users" && isAdmin && <UsersTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ onSaved }: { onSaved: () => void }) {
  const me = useDashboard((s) => s.me);
  const [name, setName] = React.useState(me?.display_name ?? "");
  const [msg, setMsg] = React.useState("");
  const save = async () => { await apiPatch("/account/profile", { display_name: name }); setMsg("Profile updated."); onSaved(); };
  return (
    <div className="max-w-xl">
      <p className="mb-6 text-text-muted">Your account details.</p>
      <div className="grid max-w-md gap-4 rounded-card border border-border bg-[var(--surface)] p-6">
        {msg && <Banner kind="info">{msg}</Banner>}
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setMsg(""); }} className={inputCls} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Email</span>
          <input value={me?.email ?? ""} readOnly className={cn(inputCls, "opacity-70")} /></label>
        <div><button onClick={save} disabled={!name.trim()} className="rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">Save changes</button></div>
      </div>
    </div>
  );
}

function PasswordTab() {
  const me = useDashboard((s) => s.me);
  const loadMe = useDashboard((s) => s.loadMe);
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [ok, setOk] = React.useState("");

  const rules = [
    { label: "Be at least 8 characters", ok: next.length >= 8 },
    { label: "Include an uppercase letter", ok: /[A-Z]/.test(next) },
    { label: "Include a number", ok: /\d/.test(next) },
    { label: "Match the confirmation", ok: next.length > 0 && next === confirm },
  ];
  const allOk = rules.every((r) => r.ok);

  const save = async () => {
    setError("");
    try {
      await apiPost("/account/password", { current_password: cur, new_password: next });
      setOk("Password updated."); setCur(""); setNext(""); setConfirm("");
      loadMe();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not update password."); }
  };

  return (
    <div className="max-w-3xl">
      {me?.must_change_password && (
        <div className="mb-5"><Banner kind="error">You&apos;re using a temporary password. Set a new one to continue.</Banner></div>
      )}
      <p className="mb-6 text-text-muted">Choose a strong password you don&apos;t use elsewhere. You&apos;ll stay signed in on this device.</p>
      <div className="rounded-card border border-border bg-[var(--surface)]">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_240px]">
          <div className="grid content-start gap-4">
            {error && <Banner kind="error">{error}</Banner>}
            {ok && <Banner kind="info">{ok}</Banner>}
            <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Current password</span>
              <PasswordField value={cur} onChange={(e) => setCur(e.target.value)} className="bg-[var(--surface-subtle)]" autoComplete="current-password" /></label>
            <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">New password</span>
              <PasswordField value={next} onChange={(e) => { setNext(e.target.value); setOk(""); }} placeholder="At least 8 characters" className="bg-[var(--surface-subtle)]" autoComplete="new-password" /></label>
            <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Confirm new password</span>
              <PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" className="bg-[var(--surface-subtle)]" autoComplete="new-password" /></label>
          </div>
          <div className="border-l border-border pl-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-faint">Requirements</p>
            <ul className="grid gap-2.5">
              {rules.map((r) => (
                <li key={r.label} className={cn("flex items-center gap-2 text-sm", r.ok ? "text-brand-600" : "text-text-faint")}>
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", r.ok ? "bg-brand-100 text-brand-600" : "bg-[var(--surface-subtle)]")}>
                    {r.ok ? <ShieldCheck size={11} /> : <Minus size={11} />}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end border-t border-border p-5">
          <button onClick={save} disabled={!cur || !allOk} className="rounded-control bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">Update password</button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const me = useDashboard((s) => s.me);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const load = React.useCallback(async () => setUsers(await apiGet<AdminUser[]>("/users")), []);
  React.useEffect(() => { load(); }, [load]);
  const resend = async (id: string) => { await apiPost(`/users/${id}/resend-invite`); };
  const remove = async (id: string) => { await apiDelete(`/users/${id}`); load(); };

  return (
    <div className="max-w-4xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-strong">Users &amp; Access Control</h2>
          <p className="mt-1 max-w-xl text-sm text-text-muted">
            Manage who can access this workspace. Admins control users and settings; members review and comment on prototypes.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex shrink-0 items-center gap-2 rounded-control border border-border bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-text-body hover:bg-[var(--surface-subtle)]">
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <div className="overflow-hidden rounded-card border border-border">
        <div className="grid grid-cols-[1fr_120px_88px] items-center bg-[var(--surface-subtle)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
          <span>User</span><span>Role</span><span />
        </div>
        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-[1fr_120px_88px] items-center border-t border-border px-4 py-3">
            <span className="flex items-center gap-2.5">
              <Avatar person={{ id: u.id, display_name: u.display_name, initials: initialsOf(u.display_name) }} size={34} />
              <span><span className="block text-sm font-semibold text-text-strong">{u.display_name}</span><span className="block text-xs text-text-faint">{u.email}</span></span>
            </span>
            <span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                u.org_role === "admin" ? "bg-brand-100 text-brand-700" : "bg-[var(--surface-subtle)] text-text-muted")}>
                {u.org_role}
              </span>
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <button title="Resend invite" onClick={() => resend(u.id)}
                className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:text-brand-600"><Mail size={15} /></button>
              {u.id !== me?.id && (
                <button title="Remove" onClick={() => remove(u.id)}
                  className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-faint hover:text-danger"><Trash2 size={15} /></button>
              )}
            </span>
          </div>
        ))}
      </div>

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"member" | "admin">("member");
  const [method, setMethod] = React.useState<"invite" | "temp">("invite");
  const [pw, setPw] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const generate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    const arr = new Uint32Array(14); crypto.getRandomValues(arr);
    setPw("Nx" + Array.from(arr, (n) => chars[n % chars.length]).join("") + "9!");
  };

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await apiPost("/users", {
        email, display_name: name, org_role: role,
        access_method: method === "invite" ? "invite" : "temp_password",
        password: method === "temp" ? pw : undefined,
      });
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add user.");
    } finally { setLoading(false); }
  };

  const ready = name && email && (method === "invite" || pw);
  const submitLabel = method === "invite" ? "Send invite" : "Add & send invite";

  return (
    <Modal open onClose={onClose} title="Add a user" size="md"
      footer={<><button onClick={onClose} className="rounded-control border border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-semibold text-text-body">Cancel</button>
        <button onClick={submit} disabled={!ready || loading} className="rounded-control bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Working…" : submitLabel}</button></>}>
      <div className="grid gap-4">
        {error && <Banner kind="error">{error}</Banner>}
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" className={inputCls} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" className={inputCls} /></label>

        <div className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Role</span>
          <div className="flex gap-2">{(["member", "admin"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium capitalize", role === r ? "border-brand-600 text-brand-600" : "border-border text-text-muted")}>{r}</button>))}
          </div></div>

        <div className="grid gap-1.5"><span className="text-sm font-medium text-text-body">How should they get access?</span>
          <div className="flex gap-2">
            <Pill active={method === "invite"} onClick={() => setMethod("invite")}>Send invite email</Pill>
            <Pill active={method === "temp"} onClick={() => setMethod("temp")}>Set temporary password</Pill>
          </div>
        </div>

        {method === "temp" && (
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-text-body">Temporary password</span>
              <button type="button" onClick={generate} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><RefreshCw size={12} /> Generate</button></div>
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Set an initial password" className={inputCls} />
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-input border border-border bg-[var(--surface-subtle)] p-3 text-xs text-text-muted">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-[var(--surface)] text-brand-600"><Mail size={15} /></span>
          {method === "invite" ? (
            <span>We&apos;ll email <b className="text-text-body">an invite link</b> to this address. When they open it, they set their own password — no temporary password needed.</span>
          ) : (
            <span>An invite email with sign-in details will be sent to this address. The user must change this temporary password on first sign-in.</span>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium", active ? "border-brand-600 text-brand-600" : "border-border text-text-muted hover:text-text-strong")}>
      {children}
    </button>
  );
}
