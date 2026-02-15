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
          <p className="mb-3 inline-flex rounded-full bg-[#e8f4ff] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0f84d9]">
            Community Chat
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-slate-900">A cleaner social hub for your local community.</h1>
          <p className="social-muted max-w-lg text-base">
            Share updates, start conversations, and personalize your profile with a familiar social-media style experience.
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
