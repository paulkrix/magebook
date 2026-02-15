"use client";

import { useState } from "react";

type CreatedUser = {
  username: string;
  email: string | null;
  displayName: string;
};

export function AdminCreateUserForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setCreatedUser(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          displayName
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: CreatedUser;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Unable to create user.");
      }

      setCreatedUser(payload.user);
      setMessage("User created successfully.");
      setUsername("");
      setEmail("");
      setDisplayName("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="social-card space-y-4 p-5 sm:p-6">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-200">
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="social-input"
          placeholder="jane_doe"
          required
        />
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-slate-200">
          Display name
        </label>
        <input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="social-input"
          placeholder="Jane Doe"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
          Email (optional)
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="social-input"
          placeholder="jane@example.com"
        />
      </div>

      {error ? <p className="notice-danger">{error}</p> : null}
      {message ? <p className="notice-success">{message}</p> : null}
      {createdUser ? (
        <p className="notice-neutral">
          Created: <strong>{createdUser.displayName}</strong> (@{createdUser.username})
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting} className="social-button-primary px-4 py-2.5 text-sm">
        {isSubmitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
