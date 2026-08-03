export type TaskStatusValue = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriorityValue = "LOW" | "MEDIUM" | "HIGH";
export type WorkspaceValue = "JOB" | "PERSONAL";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  labels: string[];
  workspace: WorkspaceValue;
  day: string; // yyyy-MM-dd
  weekStart: string; // yyyy-MM-dd
};

export const WORKSPACES: { id: WorkspaceValue; label: string }[] = [
  { id: "JOB", label: "Job" },
  { id: "PERSONAL", label: "Personal" },
];

export const STATUS_COLUMNS: { id: TaskStatusValue; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

export const PRIORITY_OPTIONS: { id: TaskPriorityValue; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
];

/** Tailwind classes per priority, used for the card accent stripe and the badge. */
export const PRIORITY_STYLES: Record<
  TaskPriorityValue,
  { stripe: string; badge: string; dot: string; label: string }
> = {
  HIGH: {
    stripe: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "High",
  },
  MEDIUM: {
    stripe: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-400",
    label: "Medium",
  },
  LOW: {
    stripe: "bg-sky-400",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    dot: "bg-sky-400",
    label: "Low",
  },
};

/** Accent theming per status column. */
export const STATUS_STYLES: Record<TaskStatusValue, { accent: string; header: string; count: string }> = {
  TODO: {
    accent: "border-t-slate-400 dark:border-t-slate-500",
    header: "text-slate-600 dark:text-slate-300",
    count: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  IN_PROGRESS: {
    accent: "border-t-amber-400 dark:border-t-amber-500",
    header: "text-amber-700 dark:text-amber-300",
    count: "bg-amber-200 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  DONE: {
    accent: "border-t-emerald-400 dark:border-t-emerald-500",
    header: "text-emerald-700 dark:text-emerald-300",
    count: "bg-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
};
