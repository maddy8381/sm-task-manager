"use client";

import type { Task, TaskStatusValue } from "@/types";
import { STATUS_STYLES } from "@/types";
import { DayGroup } from "@/components/DayGroup";
import { formatDayHeading, toCalendarDateString } from "@/lib/week";

export function Column({
  status,
  label,
  days,
  todayKey,
  tasksByDay,
  backlogTasks,
  onTaskClick,
  onAddClick,
  onBacklogAddClick,
  interactive = true,
}: {
  status: TaskStatusValue;
  label: string;
  days: Date[];
  todayKey: string;
  tasksByDay: Map<string, Task[]>;
  backlogTasks?: Task[];
  onTaskClick?: (task: Task) => void;
  onAddClick?: (status: TaskStatusValue, day: string) => void;
  onBacklogAddClick?: () => void;
  interactive?: boolean;
}) {
  const total =
    Array.from(tasksByDay.values()).reduce((sum, list) => sum + list.length, 0) + (backlogTasks?.length ?? 0);
  const style = STATUS_STYLES[status];

  return (
    <div
      className={`flex min-w-[288px] flex-1 flex-col rounded-xl border-t-4 bg-zinc-100/80 dark:bg-zinc-900/60 ${style.accent}`}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className={`text-sm font-semibold ${style.header}`}>{label}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.count}`}>{total}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {backlogTasks ? (
          <div className="mb-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
            <DayGroup
              status={status}
              day={null}
              heading="Backlog"
              isToday={false}
              tasks={backlogTasks}
              onTaskClick={onTaskClick}
              onAddClick={onBacklogAddClick}
              interactive={interactive}
            />
          </div>
        ) : null}
        {days.map((date) => {
          const key = toCalendarDateString(date);
          return (
            <DayGroup
              key={key}
              status={status}
              day={key}
              heading={formatDayHeading(date)}
              isToday={key === todayKey}
              tasks={tasksByDay.get(key) ?? []}
              onTaskClick={onTaskClick}
              onAddClick={onAddClick ? () => onAddClick(status, key) : undefined}
              interactive={interactive}
            />
          );
        })}
      </div>
    </div>
  );
}
