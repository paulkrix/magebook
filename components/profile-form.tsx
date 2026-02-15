"use client";

import { useState } from "react";
import { DEFAULT_AVATAR_PATH } from "@/lib/constants";

type Props = {
  initialDisplayName: string;
  initialBio: string | null;
  initialImageUrl: string | null;
};

export function ProfileForm({ initialDisplayName, initialBio, initialImageUrl }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [profileImageUrl, setProfileImageUrl] = useState(initialImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function uploadProfileImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.set("file", file);

    const uploadResponse = await fetch("/api/me/profile-image", {
      method: "POST",
      body: formData
    });

    const uploadPayload = (await uploadResponse.json()) as {
      error?: string;
      publicUrl?: string;
    };

    if (!uploadResponse.ok || !uploadPayload.publicUrl) {
      throw new Error(uploadPayload.error ?? "Profile image upload failed.");
    }

    return uploadPayload.publicUrl;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      let finalImageUrl = profileImageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadProfileImage(selectedFile);
      }

      const payloadToUpdate: { displayName: string; bio: string; profileImageUrl?: string } = {
        displayName,
        bio
      };
      if (finalImageUrl?.startsWith("/uploads/profile-images/")) {
        payloadToUpdate.profileImageUrl = finalImageUrl;
      }

      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToUpdate)
      });

      const payload = (await response.json()) as {
        error?: string;
        user?: { profileImageUrl: string | null; displayName: string; bio: string | null };
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Unable to save profile.");
      }

      setProfileImageUrl(payload.user.profileImageUrl);
      setDisplayName(payload.user.displayName);
      setBio(payload.user.bio ?? "");
      setSelectedFile(null);
      setMessage("Profile updated.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="social-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={profileImageUrl ?? DEFAULT_AVATAR_PATH}
          alt="Profile"
          className="h-20 w-20 rounded-full border-2 border-slate-200/40 object-cover shadow-md"
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-200" htmlFor="profileImage">
            Profile image
          </label>
          <input
            id="profileImage"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setMessage(null);
              setError(null);
            }}
            className="social-input fantasy-file-input block cursor-pointer text-sm"
          />
          <p className="text-xs text-slate-400">JPEG/PNG/WEBP/GIF only. Max size 2 MB.</p>
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-slate-200">
          Display name
        </label>
        <input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="social-input"
          required
        />
      </div>

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-slate-200">
          Profile blurb
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          className="social-input min-h-[110px] resize-y"
          maxLength={280}
          placeholder="Tell people a little about yourself."
        />
        <p className="mt-1 text-xs text-slate-400">{bio.length}/280</p>
      </div>

      {error ? <p className="notice-danger">{error}</p> : null}
      {message ? <p className="notice-success">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="social-button-primary px-4 py-2.5 text-sm"
      >
        {isSubmitting ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
