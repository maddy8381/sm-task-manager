import { prisma } from "@/lib/prisma";
import { TaskStatus, Workspace } from "@/generated/prisma/client";
import { getWeekStart } from "@/lib/week";

/**
 * Runs on every board load instead of a cron job: any task left in To Do /
 * In Progress from a past week gets pulled forward into today's section of
 * the current week. Done tasks are left untouched so they stay archived
 * under their original week. Scoped to one user's one workspace so a
 * request never touches another account's (or another board's) tasks.
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
      weekStart: { lt: currentWeekStart },
      status: { not: TaskStatus.DONE },
    },
    data: {
      weekStart: currentWeekStart,
      day: today,
    },
  });

  return { currentWeekStart, rolledOver: count };
}
