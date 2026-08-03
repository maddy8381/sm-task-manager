import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeTask } from "@/lib/serialize";
import { formatWeekLabel, getDaysOfWeek, parseCalendarDateString } from "@/lib/week";
import { Column } from "@/components/Column";
import { STATUS_COLUMNS, type Task, type TaskStatusValue } from "@/types";

export default async function ArchiveWeekPage({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;

  let weekStartDate: Date;
  try {
    weekStartDate = parseCalendarDateString(weekStart);
  } catch {
    notFound();
  }

  const rows = await prisma.task.findMany({
    where: { weekStart: weekStartDate },
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) {
    notFound();
  }

  const tasks: Task[] = rows.map(serializeTask) as Task[];
  const days = getDaysOfWeek(weekStartDate);

  const tasksByStatus = new Map<TaskStatusValue, Map<string, Task[]>>();
  for (const col of STATUS_COLUMNS) tasksByStatus.set(col.id, new Map());
  for (const task of tasks) {
    const byDay = tasksByStatus.get(task.status)!;
    const list = byDay.get(task.day) ?? [];
    list.push(task);
    byDay.set(task.day, list);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatWeekLabel(weekStartDate)}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Archived week (read-only)</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/archive"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            All weeks
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Back to board
          </Link>
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
