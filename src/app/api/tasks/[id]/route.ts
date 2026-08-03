import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeTask } from "@/lib/serialize";
import { normalizeLabels, parseDayField, VALID_PRIORITIES, VALID_STATUSES } from "@/lib/task-input";
import { TaskPriority, TaskStatus } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const current = await prisma.task.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    labels?: string[];
    day?: Date | null;
    weekStart?: Date | null;
  } = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    data.title = input.title.trim();
  }

  if (input.description !== undefined) {
    data.description =
      typeof input.description === "string" && input.description.trim() ? input.description.trim() : null;
  }

  if (input.status !== undefined) {
    if (typeof input.status !== "string" || !VALID_STATUSES.includes(input.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    data.status = input.status as TaskStatus;
  }

  if (input.priority !== undefined) {
    if (typeof input.priority !== "string" || !VALID_PRIORITIES.includes(input.priority)) {
      return NextResponse.json({ error: "invalid priority" }, { status: 400 });
    }
    data.priority = input.priority as TaskPriority;
  }

  if (input.labels !== undefined) {
    const normalized = normalizeLabels(input.labels);
    if (normalized === null) {
      return NextResponse.json({ error: "invalid labels" }, { status: 400 });
    }
    data.labels = normalized;
  }

  if (input.day !== undefined) {
    const parsedDay = parseDayField(input.day);
    if (parsedDay === "invalid") {
      return NextResponse.json({ error: "invalid day" }, { status: 400 });
    }
    data.day = parsedDay.day;
    data.weekStart = parsedDay.weekStart;
  }

  const effectiveStatus = data.status ?? current.status;
  const effectiveDay = input.day !== undefined ? data.day : current.day;
  if (effectiveDay === null && effectiveStatus !== TaskStatus.TODO) {
    return NextResponse.json(
      { error: "day is required unless status is To Do (Backlog is To Do only)" },
      { status: 400 }
    );
  }

  try {
    const task = await prisma.task.update({ where: { id }, data });
    return NextResponse.json(serializeTask(task));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "task not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "task not found" }, { status: 404 });
    }
    throw error;
  }
}
