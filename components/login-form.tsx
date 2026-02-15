"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Login failed.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="identifier">
          Username or email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="social-input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200" htmlFor="password">
          Shared password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="social-input"
        />
      </div>

      {error ? <p className="notice-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="social-button-primary w-full px-4 py-2.5 text-sm"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
