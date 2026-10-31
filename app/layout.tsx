import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import "./appearance.css";
import "./clock.css";
import "./accessibility.css";
import { AppearanceSync } from "@/components/appearance";
import { appearanceBootstrap } from "@/lib/appearance";
export const metadata: Metadata = {
  title: "EventIQ — Smarter Planning. Better Celebrations.",
  description:
    "Your intelligent workspace for extraordinary events. Plan budgets, timelines, vendors and every little detail.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body>
        <div className="site-backdrop" aria-hidden="true" />
        <AppearanceSync />
        {children}
      </body>
    </html>
  );
}
