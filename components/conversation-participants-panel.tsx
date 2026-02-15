"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";

type Participant = {
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  };
};

type InviteCandidate = {
  id: string;
  username: string;
  displayName: string;
};

type Props = {
  conversationId: string;
  participants: Participant[];
  inviteCandidates: InviteCandidate[];
  canInvite: boolean;
  canRemoveParticipants: boolean;
};

export function ConversationParticipantsPanel({
  conversationId,
  participants,
  inviteCandidates,
  canInvite,
  canRemoveParticipants
}: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedInviteeId, setSelectedInviteeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isInvitePanelOpen, setIsInvitePanelOpen] = useState(false);

  const participantUserIds = useMemo(() => new Set(participants.map((entry) => entry.userId)), [participants]);
  const availableInvitees = useMemo(
    () => inviteCandidates.filter((candidate) => !participantUserIds.has(candidate.id)),
    [inviteCandidates, participantUserIds]
  );

  async function inviteParticipant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedInviteeId) {
      setError("Pick someone to invite.");
      return;
    }

    setIsInviting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedInviteeId })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to invite participant.");
        return;
      }

      setSelectedInviteeId("");
      setMessage("Participant added.");
      router.refresh();
    } catch {
      setError("Network error while inviting participant.");
    } finally {
      setIsInviting(false);
    }
  }

  async function removeParticipant(userId: string) {
    setError(null);
    setMessage(null);
    setRemovingUserId(userId);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/participants/${userId}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to remove participant.");
        return;
      }

      setMessage("Participant removed.");
      router.refresh();
    } catch {
      setError("Network error while removing participant.");
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-expanded={isExpanded}
        aria-controls="conversation-participants-panel"
        className="social-button-secondary w-full px-3 py-2.5 text-sm"
      >
        {isExpanded ? "Hide participants" : `Participants (${participants.length})`}
      </button>

      <section id="conversation-participants-panel" className={`social-card space-y-4 p-4 sm:p-5 ${isExpanded ? "block" : "hidden"}`}>
        <div>
          <h2 className="fantasy-card-title text-sm font-semibold uppercase tracking-wide">Participants</h2>
          <ul className="mt-3 space-y-2">
            {participants.map((entry) => {
              const isRemoving = removingUserId === entry.userId;

              return (
                <li key={entry.userId} className="fantasy-list-item flex items-center justify-between gap-3 rounded-xl px-3 py-2">
                  <Link href={`/app/users/${entry.user.username}`} className="min-w-0 flex items-center gap-2">
                    <img
                      src={entry.user.profileImageUrl ?? DEFAULT_AVATAR_PATH}
                      alt={entry.user.displayName}
                      className="h-8 w-8 rounded-full border border-[#353943] object-cover"
                    />
                    <span className="truncate text-sm font-medium text-[#f1f2f6]">{entry.user.displayName}</span>
                    <span className="truncate text-xs text-[#858a95]">@{entry.user.username}</span>
                  </Link>

                  {canRemoveParticipants ? (
                    <button
                      type="button"
                      onClick={() => removeParticipant(entry.userId)}
                      disabled={isRemoving}
                      className="social-button-secondary px-2.5 py-1.5 text-xs"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {canInvite ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsInvitePanelOpen((previous) => !previous)}
              className="social-button-secondary px-3 py-2 text-sm"
            >
              {isInvitePanelOpen ? "Hide Invite Controls" : "Invite Someone to This Chat"}
            </button>

            {isInvitePanelOpen ? (
              <form onSubmit={inviteParticipant} className="space-y-2">
                <label htmlFor="invite-user" className="text-xs font-medium uppercase tracking-wide text-[#9da1ad]">
                  Invite to conversation
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="invite-user"
                    value={selectedInviteeId}
                    onChange={(event) => setSelectedInviteeId(event.target.value)}
                    className="social-input min-w-[220px] flex-1"
                    disabled={isInviting || availableInvitees.length === 0}
                  >
                    <option value="">Select a person</option>
                    {availableInvitees.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.displayName} (@{candidate.username})
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || availableInvitees.length === 0}
                    className="social-button-primary px-3 py-2 text-sm"
                  >
                    {isInviting ? "Inviting..." : "Invite"}
                  </button>
                </div>
                {availableInvitees.length === 0 ? <p className="text-xs text-[#858a95]">Everyone is already in this conversation.</p> : null}
              </form>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="notice-danger">{error}</p> : null}
        {message ? <p className="notice-success">{message}</p> : null}
      </section>
    </div>
  );
}
