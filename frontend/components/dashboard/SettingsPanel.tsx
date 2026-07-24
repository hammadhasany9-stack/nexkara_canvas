"use client";

import * as React from "react";
import { ChevronLeft, LogOut, Mail, Minus, RefreshCw, Settings, ShieldCheck, Trash2, User, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { toast } from "@/store/useToast";
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
  const { settingsTab, closeSettings, openSettings, me } = useDashboard();
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
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-40 flex bg-bg">
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
          {settingsTab === "profile" && <ProfileTab />}
          {settingsTab === "password" && <PasswordTab />}
          {settingsTab === "users" && isAdmin && <UsersTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const me = useDashboard((s) => s.me);
  const readCls = cn(inputCls, "cursor-default text-text-body opacity-90");
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-patina font-mono text-lg font-bold text-white">
          {me ? initialsOf(me.display_name) : "…"}
        </span>
        <div>
          <div className="text-xl font-bold text-text-strong">{me?.display_name}</div>
          <div className="text-sm text-text-muted">{me?.email}</div>
          <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />{me?.org_role}
          </span>
        </div>
      </div>
      <div className="grid gap-4 rounded-card border border-border bg-[var(--surface)] p-6">
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Full name</span>
          <input value={me?.display_name ?? ""} readOnly className={readCls} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Email</span>
          <input value={me?.email ?? ""} readOnly className={readCls} /></label>
        <label className="grid gap-1.5"><span className="text-sm font-medium text-text-body">Role</span>
          <input value={me?.org_role ? me.org_role[0].toUpperCase() + me.org_role.slice(1) : ""} readOnly className={readCls} /></label>
        <p className="text-sm text-text-faint">Your profile details are managed by your organization. Contact an admin to make changes.</p>
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
      toast.success("Password updated.");
      loadMe();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not update password."); }
  };

  return (
    <div className="mx-auto max-w-3xl">
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
  const askConfirm = useDashboard((s) => s.askConfirm);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const load = React.useCallback(async () => setUsers(await apiGet<AdminUser[]>("/users")), []);
  React.useEffect(() => { load(); }, [load]);
  const resend = async (u: AdminUser) => {
    try { await apiPost(`/users/${u.id}/resend-invite`); toast.success(`Invite re-sent to ${u.email}.`); }
    catch { toast.error("Could not resend the invite."); }
  };
  const remove = (u: AdminUser) =>
    askConfirm({
      title: "Remove user?",
      body: `“${u.display_name}” will lose access to this workspace. You can invite them again later.`,
      label: "Remove user",
      onConfirm: async () => {
        try { await apiDelete(`/users/${u.id}`); toast.success(`${u.display_name} removed.`); load(); }
        catch { toast.error("Could not remove the user."); }
      },
    });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-strong">Users &amp; Access Control</h2>
          <p className="mt-1 max-w-xl text-sm text-text-muted">
            Manage who can access this workspace. Admins control users and settings; members review and comment on prototypes.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex shrink-0 items-center gap-2 rounded-control bg-[#1b2330] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-125">
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
              <button title="Resend invite" onClick={() => resend(u)}
                className="lp-iconbtn flex h-8 w-8 items-center justify-center rounded-control text-text-muted hover:text-brand-600"><Mail size={15} /></button>
              {u.id !== me?.id && (
                <button title="Remove" onClick={() => remove(u)}
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
      toast.success(
        method === "invite"
          ? `Invite sent to ${email}.`
          : `${name} added — they'll set a new password on first sign-in.`,
      );
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add user.");
    } finally { setLoading(false); }
  };

  const ready = !!(name && email && (method === "invite" || passwordScore(pw).allOk));
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
          <div className="grid gap-2">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-text-body">Temporary password</span>
              <button type="button" onClick={generate} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><RefreshCw size={12} /> Generate</button></div>
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Set an initial password" className={inputCls} />
            <PasswordStrength value={pw} />
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

// Shared password rules used by the temp-password field.
function passwordScore(pw: string) {
  const rules = [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "An uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "A number", ok: /\d/.test(pw) },
    { label: "A symbol", ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const met = rules.filter((r) => r.ok).length;
  // Require the first three (backend rule); the symbol only boosts strength.
  const allOk = rules[0].ok && rules[1].ok && rules[2].ok;
  return { rules, met, allOk };
}

function PasswordStrength({ value }: { value: string }) {
  const { rules, met } = passwordScore(value);
  const pct = value ? (met / rules.length) * 100 : 0;
  const level = met <= 1 ? "Weak" : met === 2 ? "Fair" : met === 3 ? "Good" : "Strong";
  const barColor = met <= 1 ? "bg-danger" : met === 2 ? "bg-amber-500" : "bg-brand-600";
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
          <div className={cn("h-full rounded-full transition-all duration-200", barColor)} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-text-muted">{value ? level : ""}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {rules.map((r) => (
          <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", r.ok ? "text-brand-600" : "text-text-faint")}>
            <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full", r.ok ? "bg-brand-100 text-brand-600" : "bg-[var(--surface-subtle)]")}>
              {r.ok ? <ShieldCheck size={9} /> : <Minus size={9} />}
            </span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
