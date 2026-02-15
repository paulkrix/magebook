import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Context = {
  params: {
    id: string;
    userId: string;
  };
};

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const auth = await requireAdminApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: context.params.id },
      select: { id: true }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const membership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: context.params.id,
          userId: context.params.userId
        }
      },
      select: { userId: true }
    });

    if (!membership) {
      return NextResponse.json({ error: "Participant not found in this conversation." }, { status: 404 });
    }

    const participantCount = await prisma.conversationParticipant.count({
      where: { conversationId: context.params.id }
    });

    if (participantCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last participant from a conversation." }, { status: 400 });
    }

    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: context.params.id,
          userId: context.params.userId
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Participant remove error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
