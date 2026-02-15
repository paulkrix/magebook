import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { CreateConversationForm } from "@/components/create-conversation-form";

type Props = {
  searchParams?: {
    activity?: string;
  };
};

export default async function AppDashboardPage({ searchParams }: Props) {
  const user = await requirePageUser();
  const adminView = isUserAdmin(user);
  const activityIncrement = 12;
  const requestedActivity = Number(searchParams?.activity);
  const activityLimit =
    Number.isFinite(requestedActivity) && requestedActivity >= activityIncrement
      ? Math.min(Math.floor(requestedActivity), 120)
      : activityIncrement;

  const [users, conversations, recentActivity] = await Promise.all([
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
                displayName: true,
                username: true
              }
            }
          }
        }
      }
    }),
    prisma.message.findMany({
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
      take: activityLimit + 1,
      include: {
        author: {
          select: {
            username: true,
            displayName: true
          }
        },
        conversation: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  ]);
  const hasMoreActivity = recentActivity.length > activityLimit;
  const visibleActivity = hasMoreActivity ? recentActivity.slice(0, activityLimit) : recentActivity;

  return (
    <AppShell user={user}>
      <main className="space-y-6">
        <section className="social-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Recent activity</h2>
            <span className="fantasy-pill rounded-full px-2.5 py-1 text-xs font-semibold">{visibleActivity.length} updates</span>
          </div>
          {visibleActivity.length === 0 ? (
            <p className="text-sm text-slate-400">No recent activity yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {visibleActivity.map((entry) => (
                <li key={entry.id}>
                  <div className="fantasy-list-item rounded-xl px-3 py-2">
                    <p className="text-sm text-slate-200">
                      <Link href={`/app/users/${entry.author.username}`} className="font-semibold text-slate-100 hover:text-white">
                        {entry.author.displayName}
                      </Link>{" "}
                      posted in{" "}
                      <Link href={`/app/conversations/${entry.conversation.id}`} className="font-semibold text-slate-100 hover:text-white">
                        {entry.conversation.title ?? "Untitled conversation"}
                      </Link>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-300">{entry.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {hasMoreActivity ? (
            <div className="mt-4">
              <Link
                href={`/app?activity=${activityLimit + activityIncrement}`}
                className="social-button-secondary inline-flex rounded-full px-3 py-2 text-xs font-semibold transition"
              >
                Load 12 more
              </Link>
            </div>
          ) : null}
        </section>

        <section className="fantasy-hero p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="fantasy-kicker text-xs font-semibold uppercase">Dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
                Welcome back, {user.displayName}
              </h1>
              <p className="social-muted mt-2 max-w-2xl text-sm sm:text-base">
                Browse profiles, continue conversations, and keep your community feed active.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:gap-3">
              <div className="fantasy-stat rounded-2xl px-4 py-2.5">
                <p className="text-lg font-bold text-slate-100 sm:text-xl">{users.length}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-300">People</p>
              </div>
              <div className="fantasy-stat rounded-2xl px-4 py-2.5">
                <p className="text-lg font-bold text-slate-100 sm:text-xl">{conversations.length}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-300">Threads</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <div className="space-y-4">
            {!adminView ? <CreateConversationForm users={users} currentUserId={user.id} /> : null}

            <details className="sm:hidden">
              <summary className="social-button-secondary w-full cursor-pointer rounded-full px-3 py-2.5 text-sm font-semibold">
                People
              </summary>
              <div className="social-card mt-3 p-4">
                <ul className="space-y-2.5">
                  {users.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/app/users/${item.username}`}
                        className="fantasy-list-item flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm"
                      >
                        <img
                          src={item.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                          alt={item.displayName}
                          className="h-9 w-9 rounded-full border border-slate-300/30 object-cover shadow-sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-100">{item.displayName}</div>
                          <div className="truncate text-xs text-slate-400">@{item.username}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <div className="social-card hidden p-4 sm:block sm:p-5">
              <h2 className="fantasy-card-title mb-3 text-sm font-semibold uppercase tracking-wide">People</h2>
              <ul className="space-y-2.5">
                {users.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/app/users/${item.username}`}
                      className="fantasy-list-item flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm"
                    >
                      <img
                        src={item.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                        alt={item.displayName}
                        className="h-9 w-9 rounded-full border border-slate-300/30 object-cover shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-100">{item.displayName}</div>
                        <div className="truncate text-xs text-slate-400">@{item.username}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="social-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Latest conversations</h2>
              <span className="fantasy-pill rounded-full px-2.5 py-1 text-xs font-semibold">{conversations.length} active</span>
            </div>
            <ul className="space-y-3.5">
              {conversations.map((conversation) => {
                const participantNames = conversation.participants.map((participant) => participant.user.displayName).join(", ");
                const latestMessage = conversation.messages[0];

                return (
                  <li key={conversation.id}>
                    <Link href={`/app/conversations/${conversation.id}`} className="fantasy-link-card block rounded-2xl p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{conversation.title ?? "Untitled conversation"}</p>
                        <span className="text-xs text-slate-400">{new Date(conversation.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Participants: {participantNames || "None"}</p>
                      {latestMessage ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                          <Link href={`/app/users/${latestMessage.author.username}`} className="font-semibold text-slate-100 hover:text-white">
                            {latestMessage.author.displayName}:
                          </Link>{" "}
                          {latestMessage.body}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">No messages yet.</p>
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
