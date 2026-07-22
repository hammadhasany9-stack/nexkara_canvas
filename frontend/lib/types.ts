export interface Person {
  id: string;
  display_name: string;
  initials: string;
}

export type AccessLevel = "viewer" | "commenter" | "editor" | "manager";

export interface Prototype {
  id: string;
  name: string;
  type: "web" | "app";
  team: string;
  layouts: string[];
  version: number;
  comment_count: number;
  trashed: boolean;
  owner: Person;
  people: Person[];
  my_access: AccessLevel;
  updated_at: string;
  created_at: string;
}

export interface Member {
  user: Person;
  access: AccessLevel;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  org_role: "admin" | "member";
  invite_status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  actor: Person | null;
  verb: string;
  target_type: string | null;
  target_id: string | null;
  read: boolean;
  created_at: string;
}

export type Section = "home" | "recents" | "shared" | "trash";
