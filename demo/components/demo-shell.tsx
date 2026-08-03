"use client";

import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { NameWorkspace } from "@/components/name-workspace";
import type { Session } from "@/lib/auth/session";

import { Providers } from "./providers";

interface DemoShellProps {
  session: Session | null;
}

export function DemoShell({ session }: DemoShellProps) {
  return (
    <Providers>
      <div className="app">
        <Header session={session} />
        <main className="main">
          {session ? (
            <NameWorkspace session={session} />
          ) : (
            <Hero />
          )}
        </main>
        <footer className="footer">
          <span className="mono muted">SuiNS → ENS gateway demo</span>
        </footer>
      </div>
    </Providers>
  );
}
