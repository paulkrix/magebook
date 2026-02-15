import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-2xl">
        <div className="mb-4 space-y-2">
          <p className="fantasy-kicker text-xs font-semibold uppercase tracking-wide">Profile</p>
          <h1 className="text-2xl font-semibold text-slate-100">Edit your profile</h1>
          <p className="text-sm text-slate-400">Keep your name and photo up to date so conversations feel more personal.</p>
          <Link href={`/app/users/${user.username}`} className="fantasy-back-link inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium">
            View public profile
          </Link>
        </div>
        <ProfileForm initialDisplayName={user.displayName} initialImageUrl={user.profileImageUrl} />
      </main>
    </AppShell>
  );
}
