"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  initialFollowers: number;
  initialFollowing: number;
};

export function AdminUserSocialCountsForm({ userId, initialFollowers, initialFollowing }: Props) {
  const router = useRouter();
  const [followers, setFollowers] = useState(String(initialFollowers));
  const [following, setFollowing] = useState(String(initialFollowing));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function parseNonNegativeInteger(raw: string): number | null {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      return null;
    }
    return value;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsedFollowers = parseNonNegativeInteger(followers);
    const parsedFollowing = parseNonNegativeInteger(following);

    if (parsedFollowers === null || parsedFollowing === null) {
      setError("Followers and following must be whole numbers of 0 or more.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followers: parsedFollowers,
          following: parsedFollowing
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: { followers: number; following: number };
      };

      if (!response.ok || !payload.user) {
        setError(payload.error ?? "Unable to update social counts.");
        return;
      }

      setFollowers(String(payload.user.followers));
      setFollowing(String(payload.user.following));
      setMessage("Social counts updated.");
      router.refresh();
    } catch {
      setError("Network error while updating social counts.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="social-card space-y-3 p-4 sm:p-5">
      <h2 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Admin social counts</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="admin-followers" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#9da1ad]">
            Followers
          </label>
          <input
            id="admin-followers"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={followers}
            onChange={(event) => setFollowers(event.target.value)}
            className="social-input"
          />
        </div>

        <div>
          <label htmlFor="admin-following" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#9da1ad]">
            Following
          </label>
          <input
            id="admin-following"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={following}
            onChange={(event) => setFollowing(event.target.value)}
            className="social-input"
          />
        </div>
      </div>

      {error ? <p className="notice-danger">{error}</p> : null}
      {message ? <p className="notice-success">{message}</p> : null}

      <button type="submit" disabled={isSubmitting} className="social-button-primary px-4 py-2.5 text-sm">
        {isSubmitting ? "Saving..." : "Save counts"}
      </button>
    </form>
  );
}
