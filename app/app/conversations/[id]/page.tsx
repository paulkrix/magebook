import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { ConversationTitleEditor } from "@/components/conversation-title-editor";
import { MessageComposer } from "@/components/message-composer";

type Props = {
  params: {
    id: string;
  };
};

export default async function ConversationPage({ params }: Props) {
  const user = await requirePageUser();
  const adminView = isUserAdmin(user);

  const conversation = await prisma.conversation.findUnique({
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
              displayName: true,
              profileImageUrl: true
            }
          }
        }
      }
    }
  });

  if (!conversation) {
    notFound();
  }

  const canRenameConversation = conversation.participants.some((entry) => entry.userId === user.id);

  return (
    <AppShell user={user}>
      <main className="space-y-4">
        <Link href="/app" className="inline-flex items-center rounded-full bg-white/75 px-3 py-1.5 text-sm font-medium text-[#0f84d9] shadow-sm transition hover:bg-white">
          Back to dashboard
        </Link>

        <section className="social-card p-4 sm:p-5">
          {canRenameConversation ? (
            <ConversationTitleEditor conversationId={conversation.id} initialTitle={conversation.title} />
          ) : (
            <h1 className="text-xl font-semibold text-slate-900">{conversation.title ?? "Untitled conversation"}</h1>
          )}
          <p className="mt-1 text-sm text-slate-600">
            Participants: {conversation.participants.map((entry) => entry.user.displayName).join(", ")}
          </p>
        </section>

        <section className="social-card p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0f84d9]">Messages</h2>
          <ul className="space-y-3.5">
            {conversation.messages.length === 0 ? (
              <li className="text-sm text-slate-500">No messages yet.</li>
            ) : (
              conversation.messages.map((message) => (
                <li key={message.id} className="rounded-2xl border border-[#d4e1f1] bg-white p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <img
                      src={message.author.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                      alt={message.author.displayName}
                      className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                    <span className="text-sm font-semibold text-slate-800">{message.author.displayName}</span>
                    <span className="text-xs text-slate-500">{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        {!adminView ? <MessageComposer conversationId={conversation.id} /> : null}
      </main>
    </AppShell>
  );
}
