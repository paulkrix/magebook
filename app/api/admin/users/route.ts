import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiUser } from "@/lib/api-auth";
import { adminCreateUserSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user payload." }, { status: 400 });
    }

    const email = parsed.data.email || null;
    const usernameExists = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      select: { id: true }
    });

    if (usernameExists) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }

    if (email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (emailExists) {
        return NextResponse.json({ error: "Email already exists." }, { status: 409 });
      }
    }

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        email,
        displayName: parsed.data.displayName,
        role: "USER"
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
