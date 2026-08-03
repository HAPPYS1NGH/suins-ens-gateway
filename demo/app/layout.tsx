import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sui Name Holder Demo",
  description:
    "Connect a Sui wallet, pick your .sui name, and manage its ENS records on onsui.eth.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="glow app-atmosphere" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
