import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeekStart, parseCalendarDateString, toCalendarDateString } from "@/lib/week";

export async function GET(request: NextRequest) {
  const todayParam = request.nextUrl.searchParams.get("today");
  if (!todayParam) {
    return NextResponse.json({ error: "Missing 'today' query param (yyyy-MM-dd)" }, { status: 400 });
  }

  let today: Date;
  try {
    today = parseCalendarDateString(todayParam);
  } catch {
    return NextResponse.json({ error: "Invalid 'today' query param" }, { status: 400 });
  }

  const currentWeekStart = getWeekStart(today);

  const rows = await prisma.task.findMany({
    where: { weekStart: { lt: currentWeekStart } },
    select: { weekStart: true, status: true },
  });

  const byWeek = new Map<string, { total: number; done: number }>();
  for (const row of rows) {
    const key = toCalendarDateString(row.weekStart);
    const entry = byWeek.get(key) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (row.status === "DONE") entry.done += 1;
    byWeek.set(key, entry);
  }

  const weeks = Array.from(byWeek.entries())
    .map(([weekStart, counts]) => ({ weekStart, ...counts }))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));

  return NextResponse.json({ weeks });
}
