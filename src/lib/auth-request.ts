import { prisma } from "@/lib/prisma";
import { getBearerToken } from "@/lib/auth-server";

export type RequestUser = { id: string; name: string; email: string };

/** Resolves the bearer token on a request to the account that holds it, or null if missing/invalid. */
export async function getCurrentUser(request: Request): Promise<RequestUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const user = await prisma.user.findUnique({ where: { sessionToken: token } });
  if (!user) return null;

  return { id: user.id, name: user.name, email: user.email };
}
