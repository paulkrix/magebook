import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isUserAdmin, requirePageUser } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { formatSydneyDate } from "@/lib/date-time";
import { AppShell } from "@/components/app-shell";
import { AdminUserSocialCountsForm } from "@/components/admin-user-social-counts-form";

type Props = {
  params: {
    username: string;
  };
};

const tileGradients = [
  "linear-gradient(170deg, rgba(121, 90, 54, 0.58), rgba(35, 36, 44, 0.92))",
  "linear-gradient(170deg, rgba(77, 67, 56, 0.62), rgba(30, 31, 39, 0.92))",
  "linear-gradient(170deg, rgba(95, 74, 48, 0.6), rgba(32, 33, 40, 0.94))",
  "linear-gradient(170deg, rgba(64, 56, 49, 0.58), rgba(29, 31, 38, 0.93))",
  "linear-gradient(170deg, rgba(111, 84, 56, 0.6), rgba(28, 30, 38, 0.94))",
  "linear-gradient(170deg, rgba(84, 70, 56, 0.58), rgba(31, 32, 39, 0.93))"
];

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const defaultBio = "Part of the Community network. Keeping conversations active and sharing updates with the local circle.";

export default async function UserProfilePage({ params }: Props) {
  const viewer = await requirePageUser();
  const normalizedUsername = params.username.trim().toLowerCase();

  const profile = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      profileImageUrl: true,
      followers: true,
      following: true
    }
  });

  if (!profile) {
    notFound();
  }

  const [postCount, recentMessages] = await Promise.all([
    prisma.message.count({ where: { authorId: profile.id } }),
    prisma.message.findMany({
      where: { authorId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        conversation: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  ]);

  const isOwnProfile = viewer.id === profile.id;
  const viewerIsAdmin = isUserAdmin(viewer);
  const followingCount = profile.following;
  const followerCount = profile.followers;
  const tiles =
    recentMessages.length > 0
      ? recentMessages
      : Array.from({ length: 9 }, (_, index) => ({
          id: `placeholder-${index}`,
          body: "No post yet.",
          createdAt: new Date(),
          conversation: {
            id: `placeholder-conversation-${index}`,
            title: "Start your first conversation"
          }
        }));

  return (
    <AppShell user={viewer}>
      <main className="social-profile-wrap space-y-4">
        <section className="social-card p-4 sm:p-6">
          <div className="profile-top">
            <div className="profile-identity">
              <img src={profile.profileImageUrl ?? DEFAULT_AVATAR_PATH} alt={profile.displayName} className="profile-avatar" />
              <div className="min-w-0">
                <p className="profile-display-name truncate">{profile.displayName}</p>
                <p className="profile-handle mt-1 truncate">@{profile.username}</p>
              </div>
            </div>

            <div>
              <p className="profile-bio">{profile.bio?.trim() || defaultBio}</p>
              <div className="profile-stat-grid">
                <div className="profile-stat-card">
                  <p className="profile-stat-value">{formatCount(postCount)}</p>
                  <p className="profile-stat-label">posts</p>
                </div>
                <div className="profile-stat-card">
                  <p className="profile-stat-value">{formatCount(followerCount)}</p>
                  <p className="profile-stat-label">followers</p>
                </div>
                <div className="profile-stat-card">
                  <p className="profile-stat-value">{formatCount(followingCount)}</p>
                  <p className="profile-stat-label">following</p>
                </div>
              </div>

              <div className="profile-actions">
                {isOwnProfile ? (
                  <Link href="/app/profile" className="social-button-primary inline-flex items-center justify-center px-4 py-2.5 text-sm">
                    Edit profile
                  </Link>
                ) : (
                  <Link href="/app" className="social-button-primary inline-flex items-center justify-center px-4 py-2.5 text-sm">
                    Message
                  </Link>
                )}
                <Link href="/app" className="social-button-secondary inline-flex items-center justify-center px-4 py-2.5 text-sm">
                  Back to feed
                </Link>
              </div>
            </div>
          </div>
        </section>
        {viewerIsAdmin ? (
          <AdminUserSocialCountsForm
            userId={profile.id}
            initialFollowers={profile.followers}
            initialFollowing={profile.following}
          />
        ) : null}

        <section className="social-card p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="fantasy-card-title text-xs font-semibold uppercase tracking-wide">Posts</p>
            <p className="text-xs text-slate-400">Recent activity</p>
          </div>

          <div className="profile-grid">
            {tiles.map((message, index) => {
              const tileBody =
                "type" in message && message.type === "MEDIA" ? message.body?.trim() || "Shared media" : message.body ?? "";

              return (
                <article
                  key={message.id}
                  className="profile-grid-item"
                  style={{ backgroundImage: tileGradients[index % tileGradients.length] }}
                >
                  <div className="profile-grid-content">
                    <div>
                      <p className="profile-grid-title line-clamp-2">{message.conversation.title ?? "Untitled conversation"}</p>
                      <p className="profile-grid-body line-clamp-3">{tileBody}</p>
                    </div>
                    <p className="profile-grid-time">{formatSydneyDate(message.createdAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
