import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { renameConversationSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
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
          userId: auth.user.id
        }
      },
      select: { conversationId: true }
    });

    if (!membership) {
      return NextResponse.json({ error: "Only conversation participants can rename it." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = renameConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid conversation title." }, { status: 400 });
    }

    const updated = await prisma.conversation.update({
      where: { id: context.params.id },
      data: {
        title: parsed.data.title || null
      },
      select: {
        id: true,
        title: true
      }
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("Conversation rename error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
