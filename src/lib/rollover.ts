import { prisma } from "@/lib/prisma";
import { TaskStatus, Workspace } from "@/generated/prisma/client";
import { getWeekStart } from "@/lib/week";

/**
 * Runs on every board load instead of a cron job: any task left in To Do /
 * In Progress on a day *before today* gets pulled forward into today's
 * section of the current week. This keys off the task's `day`, not its week,
 * so it covers both stragglers from a past week and tasks stuck on an earlier
 * day of the current week (e.g. Monday's unfinished task when today is Wed).
 * Done tasks are left untouched so they stay archived under their original
 * day/week. Backlog tasks (`day = null`) are excluded — a `day < today`
 * filter never matches null. Scoped to one user's one workspace so a request
 * never touches another account's (or another board's) tasks.
 */
export async function rolloverStaleTasks(
  today: Date,
  userId: string,
  workspace: Workspace
): Promise<{ currentWeekStart: Date; rolledOver: number }> {
  const currentWeekStart = getWeekStart(today);

  const { count } = await prisma.task.updateMany({
    where: {
      userId,
      workspace,
      day: { lt: today },
      status: { not: TaskStatus.DONE },
    },
    data: {
      weekStart: currentWeekStart,
      day: today,
    },
  });

  return { currentWeekStart, rolledOver: count };
}
