import { TaskPriority, TaskStatus } from "@/generated/prisma/client";

export const VALID_STATUSES: string[] = Object.values(TaskStatus);
export const VALID_PRIORITIES: string[] = Object.values(TaskPriority);

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
