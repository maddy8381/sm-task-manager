"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import Link from "next/link";
import { Column } from "@/components/Column";
import { LogoutButton } from "@/components/LogoutButton";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal, type TaskFormValues } from "@/components/TaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createTask, deleteTask, fetchCurrentWeek, updateTask } from "@/lib/api";
import { taskQueryKeys } from "@/lib/queries";
import {
  formatDayHeading,
  formatWeekLabel,
  getDaysOrderedForCurrentWeek,
  localTodayString,
  parseCalendarDateString,
  toCalendarDateString,
} from "@/lib/week";
import { WORKSPACE_TO_SLUG } from "@/lib/workspace";
import { STATUS_COLUMNS, WORKSPACES, type Task, type TaskStatusValue, type WorkspaceValue } from "@/types";

type ModalState =
  | { mode: "create"; status: TaskStatusValue; day: string | null }
  | { mode: "edit"; task: Task }
  | null;

type CurrentWeekData = { weekStart: string; rolledOver: number; tasks: Task[] };

export function Board({ workspace }: { workspace: WorkspaceValue }) {
  const [today, setToday] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [dismissedRolloverFor, setDismissedRolloverFor] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const queryClient = useQueryClient();
  const queryKey = taskQueryKeys.currentWeek(workspace);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCurrentWeek(localTodayString(), workspace),
  });

  useEffect(() => {
    // One-time read of the browser's local clock — day boundaries must match
    // the user's timezone, not whatever the server happened to render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(localTodayString());
  }, []);

  const weekStart = data?.weekStart ?? null;
  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const rolloverKey = weekStart ? `${workspace}:${weekStart}` : null;
  const rolledOver = rolloverKey && dismissedRolloverFor === rolloverKey ? 0 : (data?.rolledOver ?? 0);

  function setTasksCache(updater: (prev: Task[]) => Task[]) {
    queryClient.setQueryData<CurrentWeekData>(queryKey, (prev) =>
      prev ? { ...prev, tasks: updater(prev.tasks) } : prev
    );
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(() => {
    if (!weekStart || !today) return [];
    return getDaysOrderedForCurrentWeek(parseCalendarDateString(weekStart), parseCalendarDateString(today));
  }, [weekStart, today]);

  const dayOptions = useMemo(
    () => days.map((d) => ({ value: toCalendarDateString(d), label: formatDayHeading(d) })),
    [days]
  );

  const backlogTasks = useMemo(() => tasks.filter((t) => t.day === null), [tasks]);

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatusValue, Map<string, Task[]>>();
    for (const col of STATUS_COLUMNS) map.set(col.id, new Map());
    for (const task of tasks) {
      if (task.day === null) continue;
      const byDay = map.get(task.status)!;
      const list = byDay.get(task.day) ?? [];
      list.push(task);
      byDay.set(task.day, list);
    }
    return map;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask((event.active.data.current?.task as Task) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = active.data.current?.task as Task | undefined;
    const target = over.data.current as { status: TaskStatusValue; day: string | null } | undefined;
    if (!task || !target) return;
    if (task.status === target.status && task.day === target.day) return;

    setTasksCache((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: target.status, day: target.day } : t))
    );
    try {
      await updateTask(task.id, { status: target.status, day: target.day });
    } catch (err) {
      setTasksCache((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status, day: task.day } : t))
      );
      setError(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  async function handleCreate(values: TaskFormValues) {
    const created = await createTask({
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      labels: values.labels,
      workspace,
      day: values.day,
    });
    setTasksCache((prev) => [...prev, created]);
    setModal(null);
  }

  async function handleUpdate(id: string, values: TaskFormValues) {
    const updated = await updateTask(id, {
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      labels: values.labels,
      day: values.day,
    });
    setTasksCache((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setModal(null);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasksCache((prev) => prev.filter((t) => t.id !== id));
    setModal(null);
  }

  function prefetchWorkspace(target: WorkspaceValue) {
    if (target === workspace) return;
    queryClient.prefetchQuery({
      queryKey: taskQueryKeys.currentWeek(target),
      queryFn: () => fetchCurrentWeek(localTodayString(), target),
    });
  }

  if (isLoading || !today) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">Loading board…</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Task Board</h1>
            <nav className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-900">
              {WORKSPACES.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/${WORKSPACE_TO_SLUG[ws.id]}`}
                  onMouseEnter={() => prefetchWorkspace(ws.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    ws.id === workspace
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {ws.label}
                </Link>
              ))}
            </nav>
          </div>
          {weekStart ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatWeekLabel(parseCalendarDateString(weekStart))}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href={`/${WORKSPACE_TO_SLUG[workspace]}/archive`}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Archive
          </Link>
          <LogoutButton />
          <button
            type="button"
            onClick={() => today && setModal({ mode: "create", status: "TODO", day: today })}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + New task
          </button>
        </div>
      </header>

      {rolledOver > 0 ? (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>
            {rolledOver} unfinished {rolledOver === 1 ? "task was" : "tasks were"} rolled over from last week into
            today.
          </span>
          <button
            type="button"
            onClick={() => rolloverKey && setDismissedRolloverFor(rolloverKey)}
            className="font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error || queryError ? (
        <div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>{error ?? (queryError instanceof Error ? queryError.message : "Failed to load")}</span>
          <button type="button" onClick={() => setError(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {STATUS_COLUMNS.map((col) => (
            <Column
              key={col.id}
              status={col.id}
              label={col.label}
              days={days}
              todayKey={today ?? ""}
              tasksByDay={tasksByStatus.get(col.id) ?? new Map()}
              backlogTasks={col.id === "TODO" ? backlogTasks : undefined}
              onTaskClick={(task) => setModal({ mode: "edit", task })}
              onAddClick={(status, day) => setModal({ mode: "create", status, day })}
              onBacklogAddClick={() => setModal({ mode: "create", status: "TODO", day: null })}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[264px] rotate-1">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal ? (
        <TaskModal
          mode={modal.mode}
          dayOptions={dayOptions}
          initial={
            modal.mode === "create"
              ? { title: "", description: "", status: modal.status, priority: "MEDIUM", labels: [], day: modal.day }
              : {
                  title: modal.task.title,
                  description: modal.task.description ?? "",
                  status: modal.task.status,
                  priority: modal.task.priority,
                  labels: modal.task.labels,
                  day: modal.task.day,
                }
          }
          onClose={() => setModal(null)}
          onSubmit={(values) =>
            modal.mode === "create" ? handleCreate(values) : handleUpdate(modal.task.id, values)
          }
          onDelete={modal.mode === "edit" ? () => handleDelete(modal.task.id) : undefined}
        />
      ) : null}
    </div>
  );
}
