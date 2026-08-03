"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatusValue } from "@/types";
import { TaskCard } from "@/components/TaskCard";

export function DayGroup({
  status,
  day,
  heading,
  isToday,
  tasks,
  onTaskClick,
  onAddClick,
  interactive = true,
}: {
  status: TaskStatusValue;
  day: string;
  heading: string;
  isToday: boolean;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddClick?: () => void;
  interactive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${status}|${day}`,
    data: { status, day },
    disabled: !interactive,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-2 transition ${
        isToday ? "bg-blue-50/70 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:ring-blue-900" : ""
      } ${isOver ? "bg-blue-100/80 ring-2 ring-blue-400 dark:bg-blue-900/40" : ""}`}
    >
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <h3
          className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
            isToday ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {isToday ? <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden /> : null}
          {isToday ? `Today · ${heading}` : heading}
        </h3>
        {interactive && onAddClick ? (
          <button
            type="button"
            onClick={onAddClick}
            className="flex h-5 w-5 items-center justify-center rounded text-base leading-none text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label={`Add task for ${heading}`}
          >
            +
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            dragDisabled={!interactive}
          />
        ))}
        {tasks.length === 0 ? (
          <div
            className={`rounded-md border border-dashed py-2 text-center text-[11px] ${
              isOver
                ? "border-blue-400 text-blue-500"
                : "border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-600"
            }`}
          >
            {interactive ? "Drop here" : "—"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
