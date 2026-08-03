"use client";

import { useEffect, useMemo, useState } from "react";
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
import { TaskCard } from "@/components/TaskCard";
import { TaskModal, type TaskFormValues } from "@/components/TaskModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createTask, deleteTask, fetchCurrentWeek, updateTask } from "@/lib/api";
import {
  formatDayHeading,
  formatWeekLabel,
  getDaysOrderedForCurrentWeek,
  localTodayString,
  parseCalendarDateString,
  toCalendarDateString,
} from "@/lib/week";
import { STATUS_COLUMNS, type Task, type TaskStatusValue } from "@/types";

type ModalState =
  | { mode: "create"; status: TaskStatusValue; day: string }
  | { mode: "edit"; task: Task }
  | null;

export function Board() {
  const [today, setToday] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [rolledOver, setRolledOver] = useState(0);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    const t = localTodayString();
    fetchCurrentWeek(t)
      .then((res) => {
        setToday(t);
        setWeekStart(res.weekStart);
        setTasks(res.tasks);
        setRolledOver(res.rolledOver);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(() => {
    if (!weekStart || !today) return [];
    return getDaysOrderedForCurrentWeek(parseCalendarDateString(weekStart), parseCalendarDateString(today));
  }, [weekStart, today]);

  const dayOptions = useMemo(
    () => days.map((d) => ({ value: toCalendarDateString(d), label: formatDayHeading(d) })),
    [days]
  );

  const tasksByStatus = useMemo(() => {
    const map = new Map<TaskStatusValue, Map<string, Task[]>>();
    for (const col of STATUS_COLUMNS) map.set(col.id, new Map());
    for (const task of tasks) {
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
    const target = over.data.current as { status: TaskStatusValue; day: string } | undefined;
    if (!task || !target) return;
    if (task.status === target.status && task.day === target.day) return;

    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: target.status, day: target.day } : t))
    );
    try {
      await updateTask(task.id, { status: target.status, day: target.day });
    } catch (err) {
      setTasks(previous);
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
      day: values.day,
    });
    setTasks((prev) => [...prev, created]);
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
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setModal(null);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setModal(null);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">Loading board…</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Task Board</h1>
          {weekStart ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatWeekLabel(parseCalendarDateString(weekStart))}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/archive"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Archive
          </Link>
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
            onClick={() => setRolledOver(0)}
            className="font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>{error}</span>
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
              onTaskClick={(task) => setModal({ mode: "edit", task })}
              onAddClick={(status, day) => setModal({ mode: "create", status, day })}
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
