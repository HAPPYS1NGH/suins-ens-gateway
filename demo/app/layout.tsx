import type { Metadata } from "next";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { getCurrentSession } from "@/lib/auth/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sui Name Holder Demo",
  description:
    "Connect a Sui wallet, pick your .sui name, and manage its ENS records on onsui.eth.",
};

/**
 * Chrome lives here rather than per-page so `/` and `/[name]` share one wallet menu
 * and one session read. Every route under it is dynamic — the header reflects the
 * session cookie.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body>
        <div className="glow app-atmosphere" aria-hidden="true" />
        <Providers>
          <div className="app">
            <Header session={session} />
            <main className="main">{children}</main>
            <footer className="footer">
              <span className="mono muted">SuiNS → ENS gateway demo</span>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
