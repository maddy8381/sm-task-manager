import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@/generated/prisma/client";
import { getWeekStart } from "@/lib/week";

/**
 * Runs on every board load instead of a cron job: any task left in To Do /
 * In Progress from a past week gets pulled forward into today's section of
 * the current week. Done tasks are left untouched so they stay archived
 * under their original week.
 */
export async function rolloverStaleTasks(today: Date): Promise<{ currentWeekStart: Date; rolledOver: number }> {
  const currentWeekStart = getWeekStart(today);

  const { count } = await prisma.task.updateMany({
    where: {
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
