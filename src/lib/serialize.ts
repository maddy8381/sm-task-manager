import { toCalendarDateString } from "@/lib/week";

export type SerializedTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  workspace: string;
  day: string | null;
  weekStart: string | null;
};

export function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  workspace: string;
  day: Date | null;
  weekStart: Date | null;
}): SerializedTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    workspace: task.workspace,
    day: task.day ? toCalendarDateString(task.day) : null,
    weekStart: task.weekStart ? toCalendarDateString(task.weekStart) : null,
  };
}
