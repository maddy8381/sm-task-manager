import { TaskPriority, TaskStatus, Workspace } from "@/generated/prisma/client";
import { getWeekStart, parseCalendarDateString } from "@/lib/week";

export const VALID_STATUSES: string[] = Object.values(TaskStatus);
export const VALID_PRIORITIES: string[] = Object.values(TaskPriority);
export const VALID_WORKSPACES: string[] = Object.values(Workspace);

/**
 * A task's `day` is either a "yyyy-MM-dd" string or explicit `null` (Backlog —
 * only valid for To Do tasks). Returns "invalid" if the shape doesn't match
 * either, so callers can 400 without needing their own type-narrowing.
 */
export function parseDayField(value: unknown): { day: Date | null; weekStart: Date | null } | "invalid" {
  if (value === null) return { day: null, weekStart: null };
  if (typeof value !== "string") return "invalid";
  try {
    const day = parseCalendarDateString(value);
    return { day, weekStart: getWeekStart(day) };
  } catch {
    return "invalid";
  }
}

const MAX_LABELS = 8;
const MAX_LABEL_LENGTH = 24;

/** Trim, drop empties, dedupe (case-insensitive), and cap count/length. Returns null if the shape is invalid. */
export function normalizeLabels(input: unknown): string[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim().slice(0, MAX_LABEL_LENGTH);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= MAX_LABELS) break;
  }
  return result;
}
