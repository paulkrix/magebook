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
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
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
        <h1 className="text-xl font-semibold text-slate-900">{initialTitle ?? "Untitled conversation"}</h1>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-full border border-[#cfe1f3] bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#0f84d9] transition hover:bg-[#e3f1ff]"
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="conversation-title-editor" className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Conversation title
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="conversation-title-editor"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="social-input max-w-md"
          maxLength={120}
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
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
