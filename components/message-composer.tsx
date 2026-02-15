"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  conversationId: string;
};

export function MessageComposer({ conversationId }: Props) {
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
    <form onSubmit={sendMessage} className="social-card space-y-3 p-4 sm:p-5">
      <label htmlFor="message-body" className="text-sm font-semibold uppercase tracking-wide text-[#0f84d9]">
        New message
      </label>
      <textarea
        id="message-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        className="social-input min-h-[110px] resize-y"
        placeholder="Write your message..."
      />
      {error ? <p className="rounded-xl bg-red-50 p-2.5 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="social-button-primary px-4 py-2.5 text-sm"
      >
        {isSubmitting ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
