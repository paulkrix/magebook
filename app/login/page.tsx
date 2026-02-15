import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="social-card hidden p-10 lg:block">
          <p className="fantasy-pill mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Owl Post Network
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-[#2c1f13]">
            Gather your guild, share whispers, and chronicle every quest.
          </h1>
          <p className="social-muted max-w-lg text-base">
            A parchment-toned commons for local circles, study groups, and tavern-table strategy.
          </p>
        </section>

        <section className="social-card mx-auto w-full max-w-md p-6 sm:p-8">
          <h2 className="mb-1 text-2xl font-semibold text-slate-900">Welcome back</h2>
          <p className="social-muted mb-6 text-sm">Sign in with an existing username/email and the shared password.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
