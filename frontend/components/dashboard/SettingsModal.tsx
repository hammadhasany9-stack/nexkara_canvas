"use client";

import * as React from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { useDashboard } from "@/store/useDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Banner } from "@/components/auth/Banner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordRules, allRulesPass } from "@/components/auth/PasswordRules";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "users", label: "Users" },
] as const;

export function SettingsModal() {
  const { settingsTab, closeSettings, me, loadMe } = useDashboard();
  const isAdmin = me?.org_role === "admin";
  const tab = settingsTab ?? "profile";

  return (
    <Modal open={!!settingsTab} onClose={closeSettings} title="Settings" size="lg">
      <div className="grid grid-cols-[140px_1fr] gap-6">
        <nav className="grid content-start gap-1">
          {TABS.filter((t) => t.id !== "users" || isAdmin).map((t) => (
            <button
              key={t.id}
              onClick={() => useDashboard.getState().openSettings(t.id)}
              className={cn(
                "rounded-control px-3 py-2 text-left text-sm font-medium",
                tab === t.id ? "bg-brand-100 text-brand-700" : "text-text-muted hover:bg-surface-subtle",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-h-[300px]">
          {tab === "profile" && <ProfileTab onSaved={loadMe} />}
          {tab === "password" && <PasswordTab />}
          {tab === "users" && isAdmin && <UsersTab />}
        </div>
      </div>
    </Modal>
  );
}

function ProfileTab({ onSaved }: { onSaved: () => void }) {
  const me = useDashboard((s) => s.me);
  const [name, setName] = React.useState(me?.display_name ?? "");
  const [msg, setMsg] = React.useState("");

  const save = async () => {
    await apiPatch("/account/profile", { display_name: name });
    setMsg("Profile updated.");
    onSaved();
  };

  return (
    <div className="grid max-w-sm gap-4">
      {msg && <Banner kind="info">{msg}</Banner>}
      <div className="grid gap-1.5">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => { setName(e.target.value); setMsg(""); }} />
      </div>
      <div className="grid gap-1.5">
        <Label>Email</Label>
        <Input value={me?.email ?? ""} readOnly className="opacity-70" />
      </div>
      <div>
        <Button onClick={save} disabled={!name.trim()}>Save changes</Button>
      </div>
    </div>
  );
}

function PasswordTab() {
  const [cur, setCur] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [ok, setOk] = React.useState("");

  const save = async () => {
    if (next !== confirm) return setError("Passwords don't match.");
    setError("");
    try {
      await apiPost("/account/password", { current_password: cur, new_password: next });
      setOk("Password updated.");
      setCur(""); setNext(""); setConfirm("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update password.");
    }
  };

  return (
    <div className="grid max-w-sm gap-4">
      {error && <Banner kind="error">{error}</Banner>}
      {ok && <Banner kind="info">{ok}</Banner>}
      <div className="grid gap-1.5">
        <Label>Current password</Label>
        <PasswordField value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
      </div>
      <div className="grid gap-1.5">
        <Label>New password</Label>
        <PasswordField value={next} onChange={(e) => { setNext(e.target.value); setOk(""); }} autoComplete="new-password" />
        <PasswordRules password={next} />
      </div>
      <div className="grid gap-1.5">
        <Label>Confirm new password</Label>
        <PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <Button onClick={save} disabled={!cur || !allRulesPass(next) || next !== confirm}>
          Save password
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const load = React.useCallback(async () => setUsers(await apiGet<AdminUser[]>("/users")), []);
  React.useEffect(() => { load(); }, [load]);

  const resend = async (id: string) => { await apiPost(`/users/${id}/resend-invite`); };
  const remove = async (id: string) => { await apiDelete(`/users/${id}`); load(); };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{users.length} team members</p>
        <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus size={15} /> Add user</Button>
      </div>

      <div className="grid gap-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-input border border-border px-3 py-2">
            <span className="flex items-center gap-2.5">
              <Avatar person={{ id: u.id, display_name: u.display_name, initials: inits(u.display_name) }} size={30} />
              <span>
                <span className="block text-sm font-medium text-text-strong">{u.display_name}</span>
                <span className="block text-xs text-text-faint">{u.email}</span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs capitalize text-text-muted">{u.org_role}</span>
              {u.invite_status === "invited" && (
                <button title="Resend invite" onClick={() => resend(u.id)} className="text-text-faint hover:text-brand-600">
                  <RefreshCw size={14} />
                </button>
              )}
              <button onClick={() => remove(u.id)} className="text-xs text-text-faint hover:text-danger">Remove</button>
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-input border border-border bg-surface-subtle p-3 text-xs text-text-muted">
        <p className="mb-1 font-semibold text-text-body">Access levels</p>
        <p><b>Viewer</b> — view & download · <b>Commenter</b> — leave feedback · <b>Editor</b> — upload & edit · <b>Manager</b> — add, edit & approve · <b>Admin</b> — full org access.</p>
      </div>

      {addOpen && <AddUserModal onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"member" | "admin">("member");
  const [pw, setPw] = React.useState("");
  const [error, setError] = React.useState("");

  const generate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let out = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (const n of arr) out += chars[n % chars.length];
    setPw("Nx" + out + "9!");
  };

  const submit = async () => {
    try {
      await apiPost("/users", { email, display_name: name, org_role: role, password: pw });
      onAdded();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add user.");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add user"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !email || !pw}>Add user</Button>
        </>
      }
    >
      <div className="grid gap-3">
        {error && <Banner kind="error">{error}</Banner>}
        <div className="grid gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <div className="flex gap-2">
            {(["member", "admin"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize",
                  role === r ? "border-brand-600 bg-brand-100 text-brand-700" : "border-border text-text-muted")}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <button type="button" onClick={generate} className="text-xs font-medium text-brand-600 hover:text-brand-700">Generate</button>
          </div>
          <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Set a strong password" />
        </div>
      </div>
    </Modal>
  );
}

function inits(name: string): string {
  const p = name.split(" ").filter(Boolean);
  return (p.length === 1 ? p[0].slice(0, 2) : (p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}
