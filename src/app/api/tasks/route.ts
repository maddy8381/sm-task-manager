import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rolloverStaleTasks } from "@/lib/rollover";
import { getWeekStart, parseCalendarDateString, toCalendarDateString } from "@/lib/week";
import { serializeTask } from "@/lib/serialize";
import { normalizeLabels, VALID_PRIORITIES, VALID_STATUSES } from "@/lib/task-input";
import { TaskPriority, TaskStatus } from "@/generated/prisma/client";

function parseTodayParam(request: NextRequest): Date | null {
  const todayParam = request.nextUrl.searchParams.get("today");
  if (!todayParam) return null;
  try {
    return parseCalendarDateString(todayParam);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const today = parseTodayParam(request);
  if (!today) {
    return NextResponse.json({ error: "Missing or invalid 'today' query param (yyyy-MM-dd)" }, { status: 400 });
  }

  const { currentWeekStart, rolledOver } = await rolloverStaleTasks(today);

  const tasks = await prisma.task.findMany({
    where: { weekStart: currentWeekStart },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    weekStart: toCalendarDateString(currentWeekStart),
    rolledOver,
    tasks: tasks.map(serializeTask),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, status, priority, labels, day } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof day !== "string") {
    return NextResponse.json({ error: "day is required (yyyy-MM-dd)" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status as string)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority as string)) {
    return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  }
  const normalizedLabels = normalizeLabels(labels);
  if (normalizedLabels === null) {
    return NextResponse.json({ error: "invalid labels" }, { status: 400 });
  }

  let dayDate: Date;
  try {
    dayDate = parseCalendarDateString(day);
  } catch {
    return NextResponse.json({ error: "invalid day" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      status: (status as TaskStatus) ?? TaskStatus.TODO,
      priority: (priority as TaskPriority) ?? TaskPriority.MEDIUM,
      labels: normalizedLabels,
      day: dayDate,
      weekStart: getWeekStart(dayDate),
    },
  });

  return NextResponse.json(serializeTask(task), { status: 201 });
}
