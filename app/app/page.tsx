import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { CreateConversationForm } from "@/components/create-conversation-form";

export default async function AppDashboardPage() {
  const user = await requirePageUser();
  const adminView = isUserAdmin(user);

  const [users, conversations] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImageUrl: true
      }
    }),
    prisma.conversation.findMany({
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
                displayName: true
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
                displayName: true
              }
            }
          }
        }
      }
    })
  ]);

  return (
    <AppShell user={user}>
      <main className="space-y-6">
        <section className="fantasy-hero p-5 text-[#fff3d5] sm:p-7">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d9a1]">Guild Hall</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#fff5dc] sm:text-3xl">Welcome back, {user.displayName}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#f8e8c5]/95 sm:text-base">
                Start a conversation, follow ongoing threads, and keep your local community in sync.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:gap-3">
              <div className="fantasy-stat rounded-2xl px-4 py-2.5">
                <p className="text-lg font-bold sm:text-xl">{users.length}</p>
                <p className="text-[11px] uppercase tracking-wide text-[#f3deb1]">People</p>
              </div>
              <div className="fantasy-stat rounded-2xl px-4 py-2.5">
                <p className="text-lg font-bold sm:text-xl">{conversations.length}</p>
                <p className="text-[11px] uppercase tracking-wide text-[#f3deb1]">Threads</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            {!adminView ? <CreateConversationForm users={users} currentUserId={user.id} /> : null}

            <div className="social-card p-4 sm:p-5">
              <h2 className="fantasy-card-title mb-3 text-sm font-semibold uppercase tracking-wide">People</h2>
              <ul className="space-y-2.5">
                {users.map((item) => (
                  <li key={item.id} className="fantasy-list-item flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-slate-700">
                    <img
                      src={item.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                      alt={item.displayName}
                      className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{item.displayName}</div>
                      <div className="truncate text-xs text-slate-500">@{item.username}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="social-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Latest conversations</h2>
              <span className="fantasy-pill rounded-full px-2.5 py-1 text-xs font-semibold">
                {conversations.length} active
              </span>
            </div>
            <ul className="space-y-3.5">
              {conversations.map((conversation) => {
                const participantNames = conversation.participants.map((participant) => participant.user.displayName).join(", ");
                const latestMessage = conversation.messages[0];

                return (
                  <li key={conversation.id}>
                    <Link
                      href={`/app/conversations/${conversation.id}`}
                      className="fantasy-link-card block rounded-2xl p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{conversation.title ?? "Untitled conversation"}</p>
                        <span className="text-xs text-slate-500">{new Date(conversation.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Participants: {participantNames || "None"}</p>
                      {latestMessage ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                          <span className="font-semibold text-slate-800">{latestMessage.author.displayName}:</span> {latestMessage.body}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">No messages yet.</p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
