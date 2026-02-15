import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { isUserAdmin } from "@/lib/auth";
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
        <div className="social-page-wrap px-3 sm:px-4">
          <div className="relative flex h-14 items-center justify-between">
            <Link href="/app" className="social-icon-button" aria-label="Back to dashboard">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </Link>

            <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm font-bold tracking-[0.07em] text-white sm:text-base">
              COMMUNITY
            </p>

            <div className="flex items-center gap-2">
              <Link href="/app/profile" className="social-icon-button" aria-label="Profile settings">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 6h18" />
                  <path d="M7 12h10" />
                  <path d="M10 18h4" />
                </svg>
              </Link>
              <Link
                href={canManageUsers ? "/app/admin" : `/app/users/${user.username}`}
                className="social-icon-button"
                aria-label={canManageUsers ? "Admin tools" : "My profile"}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c1.5-3.2 4-5 7-5s5.5 1.8 7 5" />
                </svg>
              </Link>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto pb-3 text-sm">
            <Link href="/app" className="social-nav-link px-3 py-1.5 font-medium">
              Dashboard
            </Link>
            <Link href={`/app/users/${user.username}`} className="social-nav-link px-3 py-1.5 font-medium">
              Profile
            </Link>
            <Link href="/app/profile" className="social-nav-link px-3 py-1.5 font-medium">
              Edit
            </Link>
            {canManageUsers ? (
              <Link href="/app/admin" className="social-nav-link px-3 py-1.5 font-medium">
                Admin
              </Link>
            ) : null}
            <div className="ml-auto">
              <LogoutButton compact />
            </div>
          </nav>
        </div>
      </header>

      <div className="social-page-wrap w-full px-3 py-4 sm:px-4 sm:py-5">{children}</div>
    </div>
  );
}
