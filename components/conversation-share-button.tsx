"use client";

import { useState } from "react";

type Props = {
  conversationId: string;
};

export function ConversationShareButton({ conversationId }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  async function onShare() {
    setStatus(null);
    const shareUrl = `${window.location.origin}/app/conversations/${conversationId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Community conversation",
          text: "Join this conversation thread.",
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("Copied");
      }
    } catch {
      setStatus("Share failed");
    }
  }

  return (
    <button type="button" onClick={onShare} className="social-button-secondary inline-flex items-center justify-center px-4 py-2.5 text-sm">
      Share{status ? ` (${status})` : ""}
    </button>
  );
}
