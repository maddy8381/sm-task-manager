import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-request";
import { parseCalendarDateString } from "@/lib/week";
import { serializeTask } from "@/lib/serialize";
import { VALID_WORKSPACES } from "@/lib/task-input";
import { Workspace } from "@/generated/prisma/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ weekStart: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { weekStart } = await params;

  const workspaceParam = request.nextUrl.searchParams.get("workspace");
  if (!workspaceParam || !VALID_WORKSPACES.includes(workspaceParam)) {
    return NextResponse.json({ error: "Missing or invalid 'workspace' query param" }, { status: 400 });
  }
  const workspace = workspaceParam as Workspace;

  let weekStartDate: Date;
  try {
    weekStartDate = parseCalendarDateString(weekStart);
  } catch {
    return NextResponse.json({ error: "invalid weekStart" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, weekStart: weekStartDate, workspace },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ weekStart, tasks: tasks.map(serializeTask) });
}
