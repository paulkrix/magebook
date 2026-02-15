import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminCreateUserForm } from "@/components/admin-create-user-form";
import { isUserAdmin, requirePageUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await requirePageUser();

  if (!isUserAdmin(user)) {
    redirect("/app");
  }

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-2xl space-y-4">
        <div>
          <p className="fantasy-kicker text-xs font-semibold uppercase tracking-wide">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100">User management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create user accounts here. Only existing accounts can sign in.
          </p>
        </div>
        <AdminCreateUserForm />
      </main>
    </AppShell>
  );
}
