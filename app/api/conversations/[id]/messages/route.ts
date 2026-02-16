import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMessageSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const adminView = isUserAdmin(auth.user);

    const conversation = await prisma.conversation.findUnique({
      where: { id: context.params.id },
      include: {
        messages: {
          ...(adminView
            ? {}
            : {
                where: {
                  author: {
                    role: "USER"
                  }
                }
              }),
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                profileImageUrl: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json({ messages: conversation.messages });
  } catch (error) {
    console.error("Message list error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }
    if (isUserAdmin(auth.user)) {
      return NextResponse.json({ error: "Admin accounts cannot send messages." }, { status: 403 });
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
      select: { userId: true }
    });

    if (!membership) {
      return NextResponse.json({ error: "Only conversation participants can post messages." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message payload." }, { status: 400 });
    }

    const payload = parsed.data;

    const createDataBase = {
      conversationId: context.params.id,
      authorId: auth.user.id
    };

    let messageData:
      | (typeof createDataBase & {
          type: "TEXT";
          body: string;
          mediaId: null;
          contentType: null;
          mediaWidth: null;
          mediaHeight: null;
        })
      | (typeof createDataBase & {
          type: "MEDIA";
          body: string | null;
          mediaId: string;
          contentType: string;
          mediaWidth: number | null;
          mediaHeight: number | null;
        });

    if (payload.type === "media") {
      const mediaToAttach = await prisma.media.findUnique({
        where: { id: payload.mediaId },
        select: {
          id: true,
          uploaderId: true,
          contentType: true,
          width: true,
          height: true
        }
      });

      if (!mediaToAttach) {
        return NextResponse.json({ error: "Selected media was not found." }, { status: 404 });
      }

      if (mediaToAttach.uploaderId !== auth.user.id) {
        return NextResponse.json({ error: "You can only send media you uploaded." }, { status: 403 });
      }

      if (payload.contentType !== mediaToAttach.contentType) {
        return NextResponse.json({ error: "Media metadata is invalid." }, { status: 400 });
      }

      messageData = {
        ...createDataBase,
        type: "MEDIA",
        body: payload.caption?.trim() || null,
        mediaId: mediaToAttach.id,
        contentType: mediaToAttach.contentType,
        mediaWidth: mediaToAttach.width ?? null,
        mediaHeight: mediaToAttach.height ?? null
      };
    } else {
      messageData = {
        ...createDataBase,
        type: "TEXT",
        body: payload.body,
        mediaId: null,
        contentType: null,
        mediaWidth: null,
        mediaHeight: null
      };
    }

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: messageData,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImageUrl: true
            }
          }
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

      return createdMessage;
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
