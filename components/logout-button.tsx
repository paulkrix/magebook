"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  compact?: boolean;
};

export function LogoutButton({ compact = false }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoading}
      className={compact ? "social-button-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs disabled:opacity-60" : "social-button-secondary px-3 py-2 text-sm disabled:opacity-60"}
    >
      {compact ? (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 7V5h10v14H9v-2" />
            <path d="M14 12H4" />
            <path d="m7 9-3 3 3 3" />
          </svg>
          <span>{isLoading ? "Signing out..." : "Logout"}</span>
        </>
      ) : (
        <span>{isLoading ? "Signing out..." : "Logout"}</span>
      )}
    </button>
  );
}
