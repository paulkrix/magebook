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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
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
    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setError("Title is required.");
      return;
    }

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
          title: trimmedTitle,
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
      setIsMobileExpanded(false);
      router.push(`/app/conversations/${payload.conversation.id}`);
      router.refresh();
    } catch {
      setError("Unexpected network error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsMobileExpanded((previous) => !previous)}
        aria-expanded={isMobileExpanded}
        aria-controls="create-conversation-form"
        className="social-button-primary w-full px-3 py-2.5 text-sm lg:hidden"
      >
        {isMobileExpanded ? "Hide new conversation" : "Start new conversation"}
      </button>

      <form
        id="create-conversation-form"
        onSubmit={handleSubmit}
        className={`social-card space-y-4 p-4 sm:p-5 ${isMobileExpanded ? "block" : "hidden"} lg:block`}
      >
        <h3 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Create conversation</h3>

        <div>
          <label
            htmlFor="conversation-title"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#9da1ad]"
          >
            Title
          </label>
          <input
            id="conversation-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="social-input"
            placeholder="Project planning"
            maxLength={120}
            required
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[#9da1ad]">Participants</legend>
          <div className="max-h-44 space-y-1.5 overflow-auto rounded-xl border border-[#30343d] bg-[#1a1d24] p-2.5">
            {candidateUsers.map((user) => (
              <label
                key={user.id}
                className="fantasy-list-item flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#d5d8e0]"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                  className="h-4 w-4 rounded border-[#4a4f59] accent-[#8b8f99]"
                />
                <span className="font-medium">{user.displayName}</span>
                <span className="text-xs text-[#878b96]">@{user.username}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <p className="notice-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="social-button-primary w-full px-3 py-2.5 text-sm lg:w-auto"
        >
          {isSubmitting ? "Creating..." : "Start conversation"}
        </button>
      </form>
    </div>
  );
}
