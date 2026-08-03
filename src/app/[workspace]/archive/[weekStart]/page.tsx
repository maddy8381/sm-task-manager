"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Column } from "@/components/Column";
import { LogoutButton } from "@/components/LogoutButton";
import { fetchWeek } from "@/lib/api";
import { formatWeekLabel, getDaysOfWeek, parseCalendarDateString } from "@/lib/week";
import { parseWorkspaceSlug } from "@/lib/workspace";
import { STATUS_COLUMNS, WORKSPACES, type Task, type TaskStatusValue, type WorkspaceValue } from "@/types";

export default function ArchiveWeekPage({
  params,
}: {
  params: Promise<{ workspace: string; weekStart: string }>;
}) {
  const { workspace: slug, weekStart } = use(params);
  const workspace = parseWorkspaceSlug(slug);

  if (!workspace) {
    return <InvalidPanel slug={slug} />;
  }

  return <ArchiveWeekView key={`${workspace}:${weekStart}`} slug={slug} workspace={workspace} weekStart={weekStart} />;
}

function ArchiveWeekView({
  slug,
  workspace,
  weekStart,
}: {
  slug: string;
  workspace: WorkspaceValue;
  weekStart: string;
}) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeek(weekStart, workspace)
      .then((res) => setTasks(res.tasks))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspace, weekStart]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">Loading…</div>;
  }
  if (error) {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-red-500">{error}</div>;
  }

  let weekStartDate: Date;
  try {
    weekStartDate = parseCalendarDateString(weekStart);
  } catch {
    return <InvalidPanel slug={slug} />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-zinc-400">
        <p>No tasks found for this week.</p>
        <Link href={`/${slug}/archive`} className="text-blue-600 hover:underline dark:text-blue-400">
          Back to archive
        </Link>
      </div>
    );
  }

  const days = getDaysOfWeek(weekStartDate);
  const workspaceLabel = WORKSPACES.find((ws) => ws.id === workspace)?.label ?? workspace;

  const tasksByStatus = new Map<TaskStatusValue, Map<string, Task[]>>();
  for (const col of STATUS_COLUMNS) tasksByStatus.set(col.id, new Map());
  for (const task of tasks) {
    // Backlog tasks (day === null) never have a weekStart, so they can't have
    // matched this week's fetch.
    const day = task.day!;
    const byDay = tasksByStatus.get(task.status)!;
    const list = byDay.get(day) ?? [];
    list.push(task);
    byDay.set(day, list);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatWeekLabel(weekStartDate)}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{workspaceLabel} · Archived week (read-only)</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${slug}/archive`}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            All weeks
          </Link>
          <Link
            href={`/${slug}`}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Back to board
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {STATUS_COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            label={col.label}
            days={days}
            todayKey=""
            tasksByDay={tasksByStatus.get(col.id) ?? new Map()}
            interactive={false}
          />
        ))}
      </div>
    </div>
  );
}

function InvalidPanel({ slug }: { slug: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-zinc-400">
      <p>That archive link doesn&apos;t look right.</p>
      <Link href={`/${slug}/archive`} className="text-blue-600 hover:underline dark:text-blue-400">
        Back to archive
      </Link>
    </div>
  );
}
