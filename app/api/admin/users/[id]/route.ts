import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApiUser } from "@/lib/api-auth";
import { adminUserSocialCountsPatchSchema } from "@/lib/validators";

type Props = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const auth = await requireAdminApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = adminUserSocialCountsPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid social counts payload." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        followers: parsed.data.followers,
        following: parsed.data.following
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        followers: true,
        following: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin update user social counts error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
