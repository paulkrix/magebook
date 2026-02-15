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
      <header className="sticky top-0 z-20 border-b border-[#dbe6f4] bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/app" className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f4ff] text-sm font-bold text-[#0f84d9]">
                C
              </span>
              Community
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/app" className="rounded-full px-3 py-1.5 font-medium text-slate-700 transition hover:bg-[#f1f7ff] hover:text-slate-900">
                Dashboard
              </Link>
              <Link
                href="/app/profile"
                className="rounded-full px-3 py-1.5 font-medium text-slate-700 transition hover:bg-[#f1f7ff] hover:text-slate-900"
              >
                Profile
              </Link>
              {canManageUsers ? (
                <Link
                  href="/app/admin"
                  className="rounded-full px-3 py-1.5 font-medium text-slate-700 transition hover:bg-[#f1f7ff] hover:text-slate-900"
                >
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={user.profileImageUrl ?? DEFAULT_AVATAR_PATH}
              alt={user.displayName}
              className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
            />
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user.displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  );
}
