import { toCalendarDateString } from "@/lib/week";

export type SerializedTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  day: string;
  weekStart: string;
};

export function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  day: Date;
  weekStart: Date;
}): SerializedTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    day: toCalendarDateString(task.day),
    weekStart: toCalendarDateString(task.weekStart),
  };
}
