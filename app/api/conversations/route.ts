import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { isUserAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConversationSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const adminView = isUserAdmin(auth.user);

    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          ...(adminView
            ? {}
            : {
                where: {
                  user: {
                    role: "USER"
                  }
                }
              }),
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                profileImageUrl: true
              }
            }
          }
        },
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
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            author: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversation list error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }
    if (isUserAdmin(auth.user)) {
      return NextResponse.json({ error: "Admin accounts cannot create conversations." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid conversation payload." }, { status: 400 });
    }

    const participantIds = Array.from(new Set([...parsed.data.participantIds, auth.user.id]));
    const userCount = await prisma.user.count({
      where: {
        id: {
          in: participantIds
        },
        role: "USER"
      }
    });

    if (userCount !== participantIds.length) {
      return NextResponse.json({ error: "Some participants are invalid or are not standard users." }, { status: 400 });
    }

    const conversation = await prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          title: parsed.data.title,
          createdById: auth.user.id
        }
      });

      await tx.conversationParticipant.createMany({
        data: participantIds.map((participantId) => ({
          conversationId: created.id,
          userId: participantId
        })),
        skipDuplicates: true
      });

      return created;
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Conversation create error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
