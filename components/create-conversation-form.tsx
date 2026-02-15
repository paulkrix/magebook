"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = {
  id: string;
  username: string;
  displayName: string;
};

type Props = {
  users: UserOption[];
  currentUserId: string;
};

export function CreateConversationForm({ users, currentUserId }: Props) {
  const router = useRouter();
  const candidateUsers = useMemo(() => users.filter((user) => user.id !== currentUserId), [users, currentUserId]);
  const [title, setTitle] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleUser(id: string) {
    setSelectedUserIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedUserIds.length === 0) {
      setError("Select at least one participant.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          participantIds: selectedUserIds
        })
      });

      const payload = (await response.json()) as { error?: string; conversation?: { id: string } };

      if (!response.ok || !payload.conversation) {
        setError(payload.error ?? "Unable to create conversation.");
        return;
      }

      setTitle("");
      setSelectedUserIds([]);
      router.push(`/app/conversations/${payload.conversation.id}`);
      router.refresh();
    } catch {
      setError("Unexpected network error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="social-card space-y-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0f84d9]">Create conversation</h3>

      <div>
        <label htmlFor="conversation-title" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Title (optional)
        </label>
        <input
          id="conversation-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="social-input"
          placeholder="Project planning"
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Participants</legend>
        <div className="max-h-44 space-y-1.5 overflow-auto rounded-xl border border-[#d4e1f1] bg-white p-2.5">
          {candidateUsers.map((user) => (
            <label
              key={user.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-[#f3f8ff]"
            >
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => toggleUser(user.id)}
                className="h-4 w-4 rounded border-slate-300 accent-[#1d9bf0]"
              />
              <span className="font-medium">{user.displayName}</span>
              <span className="text-xs text-slate-500">@{user.username}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="social-button-primary w-full px-3 py-2.5 text-sm sm:w-auto"
      >
        {isSubmitting ? "Creating..." : "Start conversation"}
      </button>
    </form>
  );
}
