import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBearerToken } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (token) {
    await prisma.user.updateMany({ where: { sessionToken: token }, data: { sessionToken: null } });
  }
  return new NextResponse(null, { status: 204 });
}
