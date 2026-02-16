import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { formatSydneyDateTime } from "@/lib/date-time";
import { AppShell } from "@/components/app-shell";
import { ConversationAutoScroll } from "@/components/conversation-auto-scroll";
import { ConversationTitleEditor } from "@/components/conversation-title-editor";
import { MessageComposer } from "@/components/message-composer";
import { ConversationParticipantsPanel } from "@/components/conversation-participants-panel";
import { ChatMediaImage } from "@/components/chat-media-image";

type Props = {
  params: {
    id: string;
  };
};

export default async function ConversationPage({ params }: Props) {
  const user = await requirePageUser();
  const adminView = isUserAdmin(user);

  const [conversation, users] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: params.id },
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
    }),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    })
  ]);

  if (!conversation) {
    notFound();
  }

  const isParticipant = conversation.participants.some((entry) => entry.userId === user.id);

  if (isParticipant) {
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        userId: user.id
      },
      data: {
        unreadMessageCount: 0,
        lastReadAt: new Date()
      }
    });
  }

  const canRenameConversation = isParticipant;
  const canInviteParticipants = isParticipant && !adminView;
  const canRemoveParticipants = adminView;
  const showComposer = !adminView && isParticipant;

  return (
    <AppShell user={user}>
      <main className={`space-y-4 ${showComposer ? "chat-page-bottom-pad" : ""}`}>
        <section className="chat-subheader p-4 sm:p-5">
          <div className="mb-3">
            <Link href="/app" className="fantasy-back-link inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition">
              Back to dashboard
            </Link>
          </div>

          {canRenameConversation ? (
            <ConversationTitleEditor conversationId={conversation.id} initialTitle={conversation.title} />
          ) : (
            <h1 className="text-xl font-semibold text-white">{conversation.title ?? "Untitled conversation"}</h1>
          )}
        </section>

        <ConversationParticipantsPanel
          conversationId={conversation.id}
          participants={conversation.participants}
          inviteCandidates={users}
          canInvite={canInviteParticipants}
          canRemoveParticipants={canRemoveParticipants}
        />

        <section className="chat-messages-shell p-4 sm:p-5">
          <h2 className="fantasy-card-title mb-3 text-sm font-semibold uppercase tracking-wide">Messages</h2>
          <ul className="chat-message-list">
            {conversation.messages.length === 0 ? (
              <li className="text-sm text-slate-400">No messages yet.</li>
            ) : (
              conversation.messages.map((message, index) => {
                const outgoing = message.author.id === user.id;
                const statusLabel = outgoing ? (index === conversation.messages.length - 1 ? "Seen" : "Sent") : "Delivered";

                return (
                  <li
                    key={message.id}
                    className={`chat-message-row ${outgoing ? "chat-message-row-outgoing" : "chat-message-row-incoming"}`}
                  >
                    <article className={`chat-bubble ${outgoing ? "chat-bubble-outgoing" : "chat-bubble-incoming"}`}>
                      <div className="flex items-center gap-2">
                        <img
                          src={message.author.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                          alt={message.author.displayName}
                          className="h-6 w-6 rounded-full border border-[#363a44] object-cover"
                        />
                        <Link href={`/app/users/${message.author.username}`} className="chat-author hover:text-white">
                          {message.author.displayName}
                        </Link>
                      </div>
                      {message.type === "MEDIA" ? (
                        <>
                          {message.mediaId ? (
                            <ChatMediaImage
                              mediaId={message.mediaId}
                              caption={message.body}
                              width={message.mediaWidth}
                              height={message.mediaHeight}
                            />
                          ) : (
                            <p className="chat-media-fallback">Media unavailable.</p>
                          )}
                          {message.body ? <p className="chat-body">{message.body}</p> : null}
                        </>
                      ) : (
                        <p className="chat-body">{message.body ?? ""}</p>
                      )}
                      <div className="chat-meta">
                        <span>{formatSydneyDateTime(message.createdAt)}</span>
                        <span>{statusLabel}</span>
                      </div>
                    </article>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {showComposer ? (
          <MessageComposer
            conversationId={conversation.id}
            currentUserDisplayName={user.displayName}
            currentUserAvatarUrl={user.profileImageUrl}
          />
        ) : null}
        {!adminView && !isParticipant ? (
          <p className="text-sm text-slate-400">Only participants can post in this conversation.</p>
        ) : null}
        <ConversationAutoScroll conversationId={conversation.id} messageCount={conversation.messages.length} />
      </main>
    </AppShell>
  );
}
