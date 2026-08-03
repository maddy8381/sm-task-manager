export type AuthUser = { id: string; name: string; email: string };

const STORAGE_KEY = "taskboard.auth";

/** The only thing persisted client-side is the session token — this is what makes a browser "already logged in". */
export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.json();
}

export async function signup(input: { name: string; email: string; password: string }): Promise<{
  user: AuthUser;
  token: string;
}> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap(res);
}

export async function login(input: { email: string; password: string }): Promise<{
  user: AuthUser;
  token: string;
}> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return unwrap(res);
}

export async function fetchMe(token: string): Promise<{ user: AuthUser }> {
  const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  return unwrap(res);
}

export async function logout(token: string): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}
