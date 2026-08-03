import type { Task, TaskPriorityValue, TaskStatusValue, WorkspaceValue } from "@/types";

async function unwrap<T>(res: Response): Promise<T> {
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
  const res = await fetch(`/api/tasks?today=${today}&workspace=${workspace}`);
  return unwrap(res);
}

export async function createTask(input: {
  title: string;
  description?: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  labels: string[];
  workspace: WorkspaceValue;
  day: string;
}): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    day: string;
  }>
): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap(res);
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
}

export async function fetchWeeks(
  today: string,
  workspace: WorkspaceValue
): Promise<{ weeks: { weekStart: string; total: number; done: number }[] }> {
  const res = await fetch(`/api/weeks?today=${today}&workspace=${workspace}`);
  return unwrap(res);
}

export async function fetchWeek(
  weekStart: string,
  workspace: WorkspaceValue
): Promise<{ weekStart: string; tasks: Task[] }> {
  const res = await fetch(`/api/weeks/${weekStart}?workspace=${workspace}`);
  return unwrap(res);
}
