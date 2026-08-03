import { clearStoredToken, getStoredToken } from "@/lib/auth";
import type { Task, TaskPriorityValue, TaskStatusValue, WorkspaceValue } from "@/types";

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // The session token is gone or was rotated elsewhere — bounce back to
    // the login screen instead of rendering with no data.
    clearStoredToken();
    window.location.reload();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  return res.json();
}

export async function fetchCurrentWeek(
  today: string,
  workspace: WorkspaceValue
): Promise<{ weekStart: string; rolledOver: number; tasks: Task[] }> {
  const res = await fetch(`/api/tasks?today=${today}&workspace=${workspace}`, { headers: authHeaders() });
  return unwrap(res);
}

export async function createTask(input: {
  title: string;
  description?: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  labels: string[];
  workspace: WorkspaceValue;
  day: string | null;
}): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return unwrap(res);
}

export async function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: TaskStatusValue;
    priority: TaskPriorityValue;
    labels: string[];
    day: string | null;
  }>
): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
  if (res.status === 401) {
    clearStoredToken();
    window.location.reload();
    throw new Error("Session expired");
  }
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
}

export async function fetchWeeks(
  today: string,
  workspace: WorkspaceValue
): Promise<{ weeks: { weekStart: string; total: number; done: number }[] }> {
  const res = await fetch(`/api/weeks?today=${today}&workspace=${workspace}`, { headers: authHeaders() });
  return unwrap(res);
}

export async function fetchWeek(
  weekStart: string,
  workspace: WorkspaceValue
): Promise<{ weekStart: string; tasks: Task[] }> {
  const res = await fetch(`/api/weeks/${weekStart}?workspace=${workspace}`, { headers: authHeaders() });
  return unwrap(res);
}
