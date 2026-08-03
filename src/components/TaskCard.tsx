"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PRIORITY_STYLES, type Task } from "@/types";

export function TaskCard({
  task,
  onClick,
  dragDisabled,
}: {
  task: Task;
  onClick?: () => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: dragDisabled,
  });

  const priority = PRIORITY_STYLES[task.priority];

  const className = `group relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-white pl-3.5 pr-3 py-2 text-left shadow-sm transition dark:border-zinc-700 dark:bg-zinc-900 ${
    onClick ? "cursor-grab hover:border-zinc-300 hover:shadow-md active:cursor-grabbing dark:hover:border-zinc-600" : ""
  } ${isDragging ? "opacity-40" : ""}`;

  const content = (
    <>
      <span className={`absolute inset-y-0 left-0 w-1 ${priority.stripe}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">{task.title}</p>
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${priority.dot}`}
          title={`${priority.label} priority`}
          aria-hidden
        />
      </div>
      {task.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{task.description}</p>
      ) : null}
      {task.labels.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={className}>
        {content}
      </div>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={className}
    >
      {content}
    </button>
  );
}
