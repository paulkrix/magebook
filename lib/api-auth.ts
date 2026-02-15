import type { User } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest, isUserAdmin } from "@/lib/auth";

export async function requireApiUser(request: NextRequest): Promise<{ user: User } | { response: NextResponse }> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user };
}

export async function requireAdminApiUser(request: NextRequest): Promise<{ user: User } | { response: NextResponse }> {
  const auth = await requireApiUser(request);

  if ("response" in auth) {
    return auth;
  }

  if (!isUserAdmin(auth.user)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}
