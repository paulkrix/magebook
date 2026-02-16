import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { upsertMessageReactionSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
    messageId: string;
  };
};

const reactionInclude = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true
    }
  }
} as const;

export async function PUT(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }
    if (isUserAdmin(auth.user)) {
      return NextResponse.json({ error: "Admin accounts cannot react to messages." }, { status: 403 });
    }

    const membership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: context.params.id,
          userId: auth.user.id
        }
      },
      select: { userId: true }
    });

    if (!membership) {
      return NextResponse.json({ error: "Only conversation participants can react to messages." }, { status: 403 });
    }

    const message = await prisma.message.findUnique({
      where: { id: context.params.messageId },
      select: {
        id: true,
        conversationId: true
      }
    });

    if (!message || message.conversationId !== context.params.id) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = upsertMessageReactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reaction payload." }, { status: 400 });
    }

    const emoji = parsed.data.emoji;

    await prisma.messageReaction.upsert({
      where: {
        messageId_userId: {
          messageId: context.params.messageId,
          userId: auth.user.id
        }
      },
      create: {
        messageId: context.params.messageId,
        userId: auth.user.id,
        emoji
      },
      update: {
        emoji
      }
    });

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId: context.params.messageId },
      orderBy: [{ emoji: "asc" }, { createdAt: "asc" }],
      include: reactionInclude
    });

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error("Message reaction upsert error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
