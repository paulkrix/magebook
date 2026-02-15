import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="social-card hidden p-8 lg:block lg:p-10">
          <p className="fantasy-pill mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Community network
          </p>
          <h1 className="mb-4 text-4xl font-semibold leading-tight text-slate-100">
            A social feed for your local circle.
          </h1>
          <p className="social-muted max-w-lg text-base">
            Share updates, run group conversations, and browse profile pages in one place.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-2">
            <div className="profile-grid-item h-24" />
            <div className="profile-grid-item h-24" />
            <div className="profile-grid-item h-24" />
            <div className="profile-grid-item h-24" />
            <div className="profile-grid-item h-24" />
            <div className="profile-grid-item h-24" />
          </div>
        </section>

        <section className="social-card mx-auto w-full max-w-md p-6 sm:p-8">
          <h2 className="mb-1 text-2xl font-semibold text-slate-100">Welcome back</h2>
          <p className="social-muted mb-6 text-sm">Sign in with your username/email and the shared password.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
