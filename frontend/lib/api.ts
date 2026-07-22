const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  return fallback;
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(extractDetail(data, fallback), res.status);
  return data as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  return handle<T>(res, "Request failed.");
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res, "Something went wrong. Please try again.");
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return handle<T>(res, "Update failed.");
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle<T>(res, "Delete failed.");
}

export async function apiUpload<T = unknown>(
  path: string,
  form: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return handle<T>(res, "Upload failed.");
}
