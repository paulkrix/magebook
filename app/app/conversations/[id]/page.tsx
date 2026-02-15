import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { ConversationTitleEditor } from "@/components/conversation-title-editor";
import { MessageComposer } from "@/components/message-composer";
import { ConversationParticipantsPanel } from "@/components/conversation-participants-panel";

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
  const canRenameConversation = isParticipant;
  const canInviteParticipants = isParticipant && !adminView;
  const canRemoveParticipants = adminView;

  return (
    <AppShell user={user}>
      <main className="space-y-4">
        <Link href="/app" className="fantasy-back-link inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium shadow-sm transition">
          Back to dashboard
        </Link>

        <section className="social-card p-4 sm:p-5">
          {canRenameConversation ? (
            <ConversationTitleEditor conversationId={conversation.id} initialTitle={conversation.title} />
          ) : (
            <h1 className="text-xl font-semibold text-slate-100">{conversation.title ?? "Untitled conversation"}</h1>
          )}
        </section>

        <ConversationParticipantsPanel
          conversationId={conversation.id}
          participants={conversation.participants}
          inviteCandidates={users}
          canInvite={canInviteParticipants}
          canRemoveParticipants={canRemoveParticipants}
        />

        <section className="social-card p-4 sm:p-5">
          <h2 className="fantasy-card-title mb-3 text-sm font-semibold uppercase tracking-wide">Messages</h2>
          <ul className="space-y-3.5">
            {conversation.messages.length === 0 ? (
              <li className="text-sm text-slate-400">No messages yet.</li>
            ) : (
              conversation.messages.map((message) => (
                <li key={message.id} className="fantasy-link-card rounded-2xl p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <img
                      src={message.author.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                      alt={message.author.displayName}
                      className="h-8 w-8 rounded-full border border-slate-200/35 object-cover shadow-sm"
                    />
                    <Link href={`/app/users/${message.author.username}`} className="text-sm font-semibold text-slate-100 hover:text-white">
                      {message.author.displayName}
                    </Link>
                    <span className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-300">{message.body}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        {!adminView && isParticipant ? <MessageComposer conversationId={conversation.id} /> : null}
        {!adminView && !isParticipant ? (
          <p className="text-sm text-slate-400">Only participants can post in this conversation.</p>
        ) : null}
      </main>
    </AppShell>
  );
}
