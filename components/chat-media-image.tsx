"use client";

import { useState } from "react";

type Props = {
  mediaId: string;
  caption: string | null;
  width: number | null;
  height: number | null;
};

export function ChatMediaImage({ mediaId, caption, width, height }: Props) {
  const [broken, setBroken] = useState(false);
  const altText = caption?.trim() || "Shared image";

  if (broken) {
    return <p className="chat-media-fallback">Media could not be loaded.</p>;
  }

  return (
    <img
      src={`/api/media/${mediaId}`}
      alt={altText}
      width={width ?? undefined}
      height={height ?? undefined}
      loading="lazy"
      className="chat-media-image"
      onError={() => setBroken(true)}
    />
  );
}
