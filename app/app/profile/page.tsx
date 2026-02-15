import { requirePageUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const user = await requirePageUser();

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-2xl">
        <div className="mb-4">
          <p className="fantasy-kicker text-xs font-semibold uppercase tracking-wide">Profile</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Edit your profile</h1>
          <p className="mt-1 text-sm text-slate-600">Keep your name and photo up to date so conversations feel more personal.</p>
        </div>
        <ProfileForm initialDisplayName={user.displayName} initialImageUrl={user.profileImageUrl} />
      </main>
    </AppShell>
  );
}
