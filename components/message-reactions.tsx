"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ReactionUser = {
  id: string;
  username: string;
  displayName: string;
};

type MessageReaction = {
  id: string;
  emoji: string;
  user: ReactionUser;
};

type Props = {
  conversationId: string;
  messageId: string;
  currentUserId: string;
  canReact: boolean;
  initialReactions: MessageReaction[];
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

export function MessageReactions({ conversationId, messageId, currentUserId, canReact, initialReactions }: Props) {
  const router = useRouter();
  const [reactions, setReactions] = useState<MessageReaction[]>(initialReactions);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [expandedEmoji, setExpandedEmoji] = useState<string | null>(null);
  const [customEmoji, setCustomEmoji] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, ReactionUser[]>();

    for (const reaction of reactions) {
      const users = map.get(reaction.emoji) ?? [];
      users.push(reaction.user);
      map.set(reaction.emoji, users);
    }

    return Array.from(map.entries())
      .map(([emoji, users]) => ({
        emoji,
        users
      }))
      .sort((left, right) => right.users.length - left.users.length || left.emoji.localeCompare(right.emoji));
  }, [reactions]);

  async function reactWith(emoji: string) {
    if (!canReact || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/reactions`, {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ emoji })
      });

      const payload = (await response.json()) as { error?: string; reactions?: MessageReaction[] };

      if (!response.ok || !payload.reactions) {
        setError(payload.error ?? "Unable to update reaction.");
        return;
      }

      setReactions(payload.reactions);
      setExpandedEmoji(null);
      setCustomEmoji("");
      setIsPickerOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update reaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="chat-reactions-wrap">
      <div className="chat-reactions-row">
        {grouped.map((group) => {
          const reactedByCurrentUser = group.users.some((user) => user.id === currentUserId);

          return (
            <button
              key={group.emoji}
              type="button"
              className={`chat-reaction-chip ${reactedByCurrentUser ? "chat-reaction-chip-active" : ""}`}
              onClick={() => setExpandedEmoji((current) => (current === group.emoji ? null : group.emoji))}
              aria-expanded={expandedEmoji === group.emoji}
              title={`${group.users.length} reaction${group.users.length === 1 ? "" : "s"}`}
            >
              <span>{group.emoji}</span>
              <span className="chat-reaction-count">{group.users.length}</span>
            </button>
          );
        })}

        {canReact ? (
          <button
            type="button"
            className="chat-reaction-add"
            onClick={() => setIsPickerOpen((current) => !current)}
            disabled={isSubmitting}
            aria-expanded={isPickerOpen}
          >
            +
          </button>
        ) : null}
      </div>

      {isPickerOpen && canReact ? (
        <>
          <div className="chat-reaction-picker" role="group" aria-label="Add reaction">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat-reaction-emoji"
                onClick={() => reactWith(emoji)}
                disabled={isSubmitting}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="chat-reaction-custom">
            <input
              type="text"
              className="chat-reaction-input"
              value={customEmoji}
              onChange={(event) => setCustomEmoji(event.target.value)}
              placeholder="Custom emoji"
              maxLength={16}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="chat-reaction-custom-submit"
              disabled={isSubmitting || customEmoji.trim().length === 0}
              onClick={() => reactWith(customEmoji.trim())}
            >
              Add
            </button>
          </div>
        </>
      ) : null}

      {expandedEmoji ? (
        <div className="chat-reaction-details">
          <p className="chat-reaction-details-title">{expandedEmoji} reacted by</p>
          <ul className="chat-reaction-user-list">
            {(grouped.find((group) => group.emoji === expandedEmoji)?.users ?? []).map((user) => (
              <li key={user.id} className="chat-reaction-user-item">
                {user.displayName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="chat-reaction-error">{error}</p> : null}
    </div>
  );
}
