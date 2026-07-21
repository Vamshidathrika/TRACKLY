import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trackly", description: "Project tracking for teams" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
