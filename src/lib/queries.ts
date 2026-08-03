import type { WorkspaceValue } from "@/types";

// Central query-key builders so every caller (fetch, prefetch, cache writes)
// agrees on the same key shape per workspace.
export const taskQueryKeys = {
  currentWeek: (workspace: WorkspaceValue) => ["tasks", workspace] as const,
  weeks: (workspace: WorkspaceValue) => ["weeks", workspace] as const,
  week: (workspace: WorkspaceValue, weekStart: string) => ["weeks", workspace, weekStart] as const,
};
