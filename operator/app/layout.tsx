import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manifestation Genie — Revenue Operator",
  description: "Mystical, action-first revenue copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="cosmic-bg min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
