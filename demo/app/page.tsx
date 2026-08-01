import { NameStatus } from "@/components/name-status";
import { WalletAuth } from "@/components/wallet-auth";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getCurrentSession();

  return (
    <div className="app">
      <header className="header">
        <span className="logo">
          on<span className="logo-accent">sui</span>.eth
        </span>
        <a
          className="mono muted"
          href="https://github.com/HAPPYS1NGH/suins-ens-gateway"
        >
          GitHub
        </a>
      </header>

      <main className="main">
        <section className="hero">
          <h1 className="title">
            <span>Sui name holders,</span>
            <span className="title-highlight">sign in.</span>
          </h1>
          <p className="tagline">
            Connect a Sui wallet and sign a single-use challenge. Name ownership
            is verified separately, before any record is written.
          </p>
        </section>

        <WalletAuth
          session={
            session
              ? { suiAddress: session.suiAddress, expiresAt: session.expiresAt }
              : null
          }
        />

        {/* Authenticated and authorized stay two visibly separate states. */}
        {session ? <NameStatus /> : null}
      </main>

      <footer className="footer">
        <span className="mono muted">SuiNS &rarr; ENS gateway demo</span>
      </footer>
    </div>
  );
}
