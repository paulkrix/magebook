"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";

type Props = {
  conversationId: string;
  currentUserDisplayName: string;
  currentUserAvatarUrl: string | null;
};

type UploadedMediaPayload = {
  mediaId: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  width?: number;
  height?: number;
  originalName?: string;
};

type GiphySearchResult = {
  id: string;
  title: string;
  previewUrl: string;
  width?: number;
  height?: number;
};

export function MessageComposer({ conversationId, currentUserDisplayName, currentUserAvatarUrl }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [isGiphyOpen, setIsGiphyOpen] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState("");
  const [debouncedGiphyQuery, setDebouncedGiphyQuery] = useState("");
  const [giphyResults, setGiphyResults] = useState<GiphySearchResult[]>([]);
  const [isGiphySearching, setIsGiphySearching] = useState(false);
  const [giphyError, setGiphyError] = useState<string | null>(null);
  const [importingGiphyId, setImportingGiphyId] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<UploadedMediaPayload | null>(null);

  const isBusy = isSubmitting || isUploading;
  const canSubmit = !isBusy && (body.trim().length > 0 || pendingMedia !== null);

  useEffect(() => {
    if (!isGiphyOpen) {
      setDebouncedGiphyQuery("");
      return;
    }

    const trimmed = giphyQuery.trim();
    if (trimmed.length < 2) {
      setDebouncedGiphyQuery("");
      setGiphyResults([]);
      setGiphyError(null);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedGiphyQuery(trimmed);
    }, 450);

    return () => clearTimeout(timeout);
  }, [giphyQuery, isGiphyOpen]);

  useEffect(() => {
    if (!isGiphyOpen || debouncedGiphyQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    setIsGiphySearching(true);
    setGiphyError(null);

    fetch(`/api/media/giphy/search?q=${encodeURIComponent(debouncedGiphyQuery)}`, {
      method: "GET",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json()) as { error?: string; results?: GiphySearchResult[] };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to search GIFs.");
        }

        if (!active) {
          return;
        }

        setGiphyResults(payload.results ?? []);
      })
      .catch((caughtError) => {
        if (!active || controller.signal.aborted) {
          return;
        }

        setGiphyError(caughtError instanceof Error ? caughtError.message : "Unable to search GIFs.");
      })
      .finally(() => {
        if (active) {
          setIsGiphySearching(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedGiphyQuery, isGiphyOpen]);

  function uploadMediaFile(file: File): Promise<UploadedMediaPayload> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const request = new XMLHttpRequest();
      request.open("POST", "/api/media/upload");
      request.responseType = "json";

      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      };

      request.onload = () => {
        const payload =
          typeof request.response === "object" && request.response !== null
            ? (request.response as { error?: string; mediaId?: string; contentType?: string; width?: number; height?: number; originalName?: string })
            : {};

        if (request.status < 200 || request.status >= 300) {
          reject(new Error(payload.error ?? "Unable to upload media."));
          return;
        }

        if (!payload.mediaId || !payload.contentType) {
          reject(new Error("Upload succeeded but response is invalid."));
          return;
        }

        resolve({
          mediaId: payload.mediaId,
          contentType: payload.contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          width: payload.width,
          height: payload.height,
          originalName: payload.originalName
        });
      };

      request.onerror = () => {
        reject(new Error("Network error while uploading media."));
      };

      request.send(formData);
    });
  }

  async function sendMediaMessage(media: UploadedMediaPayload) {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "media",
        mediaId: media.mediaId,
        contentType: media.contentType,
        width: media.width,
        height: media.height,
        caption: body.trim() || undefined
      })
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to post media message.");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isUploading) {
      setError("Please wait for media upload to finish.");
      return;
    }

    if (!pendingMedia && !body.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (pendingMedia) {
        await sendMediaMessage(pendingMedia);
      } else {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "text", body })
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          setError(payload.error ?? "Unable to post message.");
          return;
        }
      }

      setBody("");
      setPendingMedia(null);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Network error while posting message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function attachFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    event.target.value = "";
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingName(selectedFile.name);

    try {
      const uploadResult = await uploadMediaFile(selectedFile);
      setPendingMedia(uploadResult);
      setIsGiphyOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to upload media.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadingName(null);
    }
  }

  async function importGiphyGif(giphyId: string) {
    setError(null);
    setImportingGiphyId(giphyId);
    setIsUploading(true);
    setUploadProgress(null);
    setUploadingName("GIF from GIPHY");

    try {
      const response = await fetch("/api/media/giphy/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giphyId })
      });

      const payload = (await response.json()) as { error?: string } & UploadedMediaPayload;

      if (!response.ok || !payload.mediaId || !payload.contentType) {
        throw new Error(payload.error ?? "Unable to import GIF.");
      }

      setPendingMedia(payload);
      setIsGiphyOpen(false);
      setGiphyQuery("");
      setDebouncedGiphyQuery("");
      setGiphyResults([]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to import GIF.");
    } finally {
      setImportingGiphyId(null);
      setIsUploading(false);
      setUploadProgress(null);
      setUploadingName(null);
    }
  }

  return (
    <div className="chat-composer-fixed">
      <div className="chat-composer-inner">
        {error ? <p className="notice-danger mb-2">{error}</p> : null}
        {isUploading ? (
          <p className="notice-neutral mb-2">
            Uploading {uploadingName ?? "file"}
            {uploadProgress !== null ? ` (${uploadProgress}%)` : "..."}
          </p>
        ) : null}

        {pendingMedia ? (
          <div className="chat-pending-media">
            <img
              src={`/api/media/${pendingMedia.mediaId}`}
              alt={pendingMedia.originalName ?? "Pending media"}
              loading="lazy"
              width={pendingMedia.width}
              height={pendingMedia.height}
              className="chat-pending-media-preview"
            />
            <div className="chat-pending-media-meta">
              <p className="chat-pending-media-title">
                Ready to send {pendingMedia.originalName ? `"${pendingMedia.originalName}"` : "media"}.
              </p>
              <button
                type="button"
                className="chat-pending-media-remove"
                disabled={isBusy}
                onClick={() => setPendingMedia(null)}
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="chat-composer-shell">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={attachFile}
            className="sr-only"
            tabIndex={-1}
          />

          <button
            type="button"
            className="chat-icon-circle"
            aria-label="Attach file"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 13.5 7.8 15.7a3.2 3.2 0 1 0 4.5 4.5l6.5-6.5a4.8 4.8 0 1 0-6.8-6.8l-7 7a2.8 2.8 0 0 0 4 4l6.4-6.4" />
            </svg>
          </button>

          <button
            type="button"
            className={`chat-icon-circle ${isGiphyOpen ? "chat-icon-circle-active" : ""}`}
            aria-label="Search GIFs"
            disabled={isBusy}
            onClick={() => setIsGiphyOpen((value) => !value)}
          >
            GIF
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
              disabled={isBusy}
              className="chat-composer-input w-full"
              placeholder={isUploading ? "Uploading media..." : pendingMedia ? "Add a caption (optional)..." : "Write a new message..."}
            />
          </div>

          <button type="submit" disabled={!canSubmit} className="chat-icon-circle" aria-label="Send message">
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

        {isGiphyOpen ? (
          <div className="chat-giphy-panel">
            <div className="chat-giphy-head">
              <label htmlFor="giphy-search" className="chat-giphy-title">
                GIF search
              </label>
              <span className="chat-giphy-hint">Debounced to reduce API calls</span>
            </div>

            <input
              id="giphy-search"
              type="text"
              value={giphyQuery}
              onChange={(event) => setGiphyQuery(event.target.value)}
              placeholder="Search GIFs on GIPHY..."
              className="chat-giphy-input"
              maxLength={100}
              autoComplete="off"
              disabled={isBusy}
            />

            {giphyError ? <p className="chat-giphy-status chat-giphy-status-error">{giphyError}</p> : null}
            {!giphyError && giphyQuery.trim().length > 0 && giphyQuery.trim().length < 2 ? (
              <p className="chat-giphy-status">Type at least 2 characters.</p>
            ) : null}
            {isGiphySearching ? <p className="chat-giphy-status">Searching GIFs...</p> : null}

            {!isGiphySearching && giphyResults.length > 0 ? (
              <ul className="chat-giphy-grid">
                {giphyResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="chat-giphy-item"
                      disabled={isBusy}
                      onClick={() => importGiphyGif(result.id)}
                      aria-label={`Import GIF ${result.title}`}
                    >
                      <img
                        src={result.previewUrl}
                        alt={result.title || "GIF preview"}
                        loading="lazy"
                        width={result.width}
                        height={result.height}
                        className="chat-giphy-preview"
                      />
                      <span className="chat-giphy-caption">
                        {importingGiphyId === result.id ? "Importing..." : "Use GIF"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
