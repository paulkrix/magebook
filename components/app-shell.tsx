import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { isUserAdmin } from "@/lib/auth";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";
import { LogoutButton } from "@/components/logout-button";

type AppShellUser = {
  username: string;
  email: string | null;
  displayName: string;
  profileImageUrl: string | null;
  role: UserRole;
};

type Props = {
  user: AppShellUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const canManageUsers = isUserAdmin(user);

  return (
    <div className="min-h-screen pb-8">
      <header className="fantasy-topbar sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/app" className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-100 sm:text-lg">
              <span className="fantasy-crest inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                C
              </span>
              Community
            </Link>
            <nav className="hidden items-center gap-1 text-sm sm:flex">
              <Link href="/app" className="fantasy-nav-link px-3 py-1.5 font-medium">
                Dashboard
              </Link>
              <Link
                href={`/app/users/${user.username}`}
                className="fantasy-nav-link px-3 py-1.5 font-medium"
              >
                My profile
              </Link>
              <Link
                href="/app/profile"
                className="fantasy-nav-link px-3 py-1.5 font-medium"
              >
                Edit profile
              </Link>
              {canManageUsers ? (
                <Link
                  href="/app/admin"
                  className="fantasy-nav-link px-3 py-1.5 font-medium"
                >
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={`/app/users/${user.username}`} className="inline-flex items-center gap-2">
              <img
                src={user.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                alt={user.displayName}
                className="h-9 w-9 rounded-full border border-slate-300/40 object-cover shadow-sm"
              />
              <span className="hidden text-sm font-medium text-slate-200 sm:inline">{user.displayName}</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}
