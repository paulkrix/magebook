"use client";

import { useEffect } from "react";

type Props = {
  conversationId: string;
  messageCount: number;
};

export function ConversationAutoScroll({ conversationId, messageCount }: Props) {
  useEffect(() => {
    let cancelled = false;

    const scrollToBottom = () => {
      if (cancelled) {
        return;
      }

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto"
      });
    };

    const frame = window.requestAnimationFrame(() => {
      scrollToBottom();
      window.requestAnimationFrame(scrollToBottom);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [conversationId, messageCount]);

  return null;
}
