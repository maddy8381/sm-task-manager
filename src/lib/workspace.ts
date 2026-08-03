import type { WorkspaceValue } from "@/types";

// URL slugs (lowercase, path-friendly) <-> DB/API enum values.
const SLUG_TO_WORKSPACE: Record<string, WorkspaceValue> = {
  job: "JOB",
  personal: "PERSONAL",
};

export const WORKSPACE_TO_SLUG: Record<WorkspaceValue, string> = {
  JOB: "job",
  PERSONAL: "personal",
};

export function parseWorkspaceSlug(slug: string): WorkspaceValue | null {
  return SLUG_TO_WORKSPACE[slug] ?? null;
}
