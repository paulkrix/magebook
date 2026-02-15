"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";

type Props = {
  conversationId: string;
  currentUserDisplayName: string;
  currentUserAvatarUrl: string | null;
};

export function MessageComposer({ conversationId, currentUserDisplayName, currentUserAvatarUrl }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to post message.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Network error while posting message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="chat-composer-fixed">
      <div className="chat-composer-inner">
        {error ? <p className="notice-danger mb-2">{error}</p> : null}
        <form onSubmit={sendMessage} className="chat-composer-shell">
          <button type="button" className="chat-icon-circle" aria-label="Attach file">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 13.5 7.8 15.7a3.2 3.2 0 1 0 4.5 4.5l6.5-6.5a4.8 4.8 0 1 0-6.8-6.8l-7 7a2.8 2.8 0 0 0 4 4l6.4-6.4" />
            </svg>
          </button>

          <div>
            <label htmlFor="message-body" className="sr-only">
              Write a new message
            </label>
            <textarea
              id="message-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={1}
              className="chat-composer-input w-full"
              placeholder="Write a new message..."
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="chat-icon-circle" aria-label="Send message">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 21 21 12 3 3l3 7 8 2-8 2-3 7Z" />
            </svg>
          </button>

          <button type="button" className="chat-icon-circle overflow-hidden p-0.5" aria-label={currentUserDisplayName}>
            <img
              src={currentUserAvatarUrl ?? DEFAULT_AVATAR_PATH}
              alt={currentUserDisplayName}
              className="h-full w-full rounded-full object-cover"
            />
          </button>
        </form>
      </div>
    </div>
  );
}
