import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Chat",
  description: "Local community chat app with shared-password auth."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
