import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCalendarDateString } from "@/lib/week";
import { serializeTask } from "@/lib/serialize";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;

  let weekStartDate: Date;
  try {
    weekStartDate = parseCalendarDateString(weekStart);
  } catch {
    return NextResponse.json({ error: "invalid weekStart" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { weekStart: weekStartDate },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ weekStart, tasks: tasks.map(serializeTask) });
}
