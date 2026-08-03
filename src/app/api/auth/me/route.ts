import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-request";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
