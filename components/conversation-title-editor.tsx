"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  conversationId: string;
  initialTitle: string | null;
};

export function ConversationTitleEditor({ conversationId, initialTitle }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to rename conversation.");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Network error while renaming conversation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-white">{initialTitle ?? "Untitled conversation"}</h1>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="fantasy-pill rounded-full px-3 py-1 text-xs font-semibold transition"
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="conversation-title-editor" className="text-xs font-medium uppercase tracking-wide text-[#9da1ad]">
        Conversation title
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="conversation-title-editor"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="social-input max-w-md"
          maxLength={120}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="social-button-primary px-3 py-2 text-xs"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTitle(initialTitle ?? "");
            setError(null);
            setIsEditing(false);
          }}
          className="social-button-secondary rounded-full px-3 py-2 text-xs font-semibold transition"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="notice-danger">{error}</p> : null}
    </form>
  );
}
