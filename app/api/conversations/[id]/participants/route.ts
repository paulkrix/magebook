import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { inviteParticipantSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = inviteParticipantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid participant payload." }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: context.params.id },
      select: { id: true }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const inviterMembership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: context.params.id,
          userId: auth.user.id
        }
      },
      select: { userId: true }
    });

    if (!inviterMembership) {
      return NextResponse.json({ error: "Only conversation participants can invite people." }, { status: 403 });
    }

    const invitee = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        role: true
      }
    });

    if (!invitee || invitee.role !== "USER") {
      return NextResponse.json({ error: "Selected user is invalid." }, { status: 400 });
    }

    const existingMembership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: context.params.id,
          userId: invitee.id
        }
      },
      select: { userId: true }
    });

    if (existingMembership) {
      return NextResponse.json({ error: "User is already in this conversation." }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.conversationParticipant.create({
        data: {
          conversationId: context.params.id,
          userId: invitee.id
        }
      });

      await tx.message.create({
        data: {
          conversationId: context.params.id,
          authorId: auth.user.id,
          body: `${auth.user.displayName} added ${invitee.displayName} to the conversation.`
        }
      });

      await tx.conversationParticipant.updateMany({
        where: {
          conversationId: context.params.id,
          userId: {
            not: auth.user.id
          }
        },
        data: {
          unreadMessageCount: {
            increment: 1
          }
        }
      });

      await tx.conversationParticipant.updateMany({
        where: {
          conversationId: context.params.id,
          userId: auth.user.id
        },
        data: {
          unreadMessageCount: 0,
          lastReadAt: new Date()
        }
      });
    });

    return NextResponse.json(
      {
        participant: {
          userId: invitee.id,
          user: {
            id: invitee.id,
            username: invitee.username,
            displayName: invitee.displayName,
            profileImageUrl: invitee.profileImageUrl
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Participant invite error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
