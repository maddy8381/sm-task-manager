import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rolloverStaleTasks } from "@/lib/rollover";
import { parseCalendarDateString, toCalendarDateString } from "@/lib/week";
import { serializeTask } from "@/lib/serialize";
import { normalizeLabels, parseDayField, VALID_PRIORITIES, VALID_STATUSES, VALID_WORKSPACES } from "@/lib/task-input";
import { TaskPriority, TaskStatus, Workspace } from "@/generated/prisma/client";

function parseTodayParam(request: NextRequest): Date | null {
  const todayParam = request.nextUrl.searchParams.get("today");
  if (!todayParam) return null;
  try {
    return parseCalendarDateString(todayParam);
  } catch {
    return null;
  }
}

function parseWorkspaceParam(request: NextRequest): Workspace | null {
  const workspace = request.nextUrl.searchParams.get("workspace");
  if (!workspace || !VALID_WORKSPACES.includes(workspace)) return null;
  return workspace as Workspace;
}

export async function GET(request: NextRequest) {
  const today = parseTodayParam(request);
  if (!today) {
    return NextResponse.json({ error: "Missing or invalid 'today' query param (yyyy-MM-dd)" }, { status: 400 });
  }
  const workspace = parseWorkspaceParam(request);
  if (!workspace) {
    return NextResponse.json({ error: "Missing or invalid 'workspace' query param" }, { status: 400 });
  }

  const { currentWeekStart, rolledOver } = await rolloverStaleTasks(today);

  const [tasks, backlogTasks] = await Promise.all([
    prisma.task.findMany({
      where: { weekStart: currentWeekStart, workspace },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { workspace, day: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    weekStart: toCalendarDateString(currentWeekStart),
    rolledOver,
    tasks: [...tasks, ...backlogTasks].map(serializeTask),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, status, priority, labels, workspace, day } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (day === undefined) {
    return NextResponse.json(
      { error: "day is required (yyyy-MM-dd, or null for the Backlog)" },
      { status: 400 }
    );
  }
  if (typeof workspace !== "string" || !VALID_WORKSPACES.includes(workspace)) {
    return NextResponse.json({ error: "invalid workspace" }, { status: 400 });
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

  const parsedDay = parseDayField(day);
  if (parsedDay === "invalid") {
    return NextResponse.json({ error: "invalid day" }, { status: 400 });
  }
  const effectiveStatus = (status as TaskStatus) ?? TaskStatus.TODO;
  if (parsedDay.day === null && effectiveStatus !== TaskStatus.TODO) {
    return NextResponse.json(
      { error: "day is required unless status is To Do (Backlog is To Do only)" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      status: effectiveStatus,
      priority: (priority as TaskPriority) ?? TaskPriority.MEDIUM,
      labels: normalizedLabels,
      workspace: workspace as Workspace,
      day: parsedDay.day,
      weekStart: parsedDay.weekStart,
    },
  });

  return NextResponse.json(serializeTask(task), { status: 201 });
}
