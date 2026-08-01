"use client";

import {
  type UiWallet,
  type UiWalletAccount,
  useCurrentAccount,
  useDAppKit,
  useWalletConnection,
  useWallets,
} from "@mysten/dapp-kit-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toMessageBytes } from "@/lib/auth/message";

const Providers = dynamic(
  () => import("./providers").then((module) => module.Providers),
  {
    ssr: false,
    loading: () => (
      <section className="panel">
        <p className="mono muted">Loading wallets…</p>
      </section>
    ),
  },
);

export interface SessionView {
  suiAddress: string;
  expiresAt: string;
}

export function WalletAuth({ session }: { session: SessionView | null }) {
  return (
    <Providers>
      <WalletPanel session={session} />
    </Providers>
  );
}

async function postJson(
  url: string,
  body?: unknown,
): Promise<Record<string, string>> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with ${response.status}`);
  }
  return data;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function WalletPanel({ session }: { session: SessionView | null }) {
  const router = useRouter();
  const dAppKit = useDAppKit();
  const wallets = useWallets();
  const account = useCurrentAccount();
  const { wallet, isConnected } = useWalletConnection();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const connect = (target: UiWallet) =>
    run(async () => {
      await dAppKit.connectWallet({ wallet: target });
    });

  const signIn = () =>
    run(async () => {
      if (!account) throw new Error("Select an account first");

      const challenge = await postJson("/api/auth/challenge", {
        suiAddress: account.address,
      });

      // The wallet signs the server's exact bytes; nothing is rebuilt client-side.
      const { signature } = await dAppKit.signPersonalMessage({
        account,
        message: toMessageBytes(challenge.message),
      });

      await postJson("/api/auth/verify", {
        challengeId: challenge.challengeId,
        signature,
      });

      router.refresh();
    });

  const signOut = () =>
    run(async () => {
      await postJson("/api/auth/logout");
      router.refresh();
    });

  if (session) {
    return (
      <section className="panel" aria-labelledby="session-title">
        <h2 className="panel-title" id="session-title">
          Wallet authenticated
        </h2>
        <span className="badge">signed in</span>
        <p className="mono">{session.suiAddress}</p>
        <p className="mono muted">
          Session expires {new Date(session.expiresAt).toLocaleString()}
        </p>
        <p className="mono muted">
          Name ownership is not proven yet — that is a separate check.
        </p>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={signOut}
            disabled={busy}
          >
            Sign out
          </button>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="connect-title">
      <h2 className="panel-title" id="connect-title">
        Connect a Sui wallet
      </h2>

      {!isConnected ? (
        wallets.length === 0 ? (
          <p className="mono muted">
            No Sui wallets detected. Install a Wallet Standard wallet and reload.
          </p>
        ) : (
          <div className="btn-row">
            {wallets.map((candidate) => (
              <button
                key={candidate.name}
                type="button"
                className="btn btn-secondary"
                onClick={() => connect(candidate)}
                disabled={busy}
              >
                {candidate.name}
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="mono muted">Connected to {wallet?.name}</p>
          <AccountPicker
            accounts={wallet?.accounts ?? []}
            selected={account}
            onSelect={(next) => dAppKit.switchAccount({ account: next })}
          />
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={signIn}
              disabled={busy || !account}
            >
              {busy ? "Waiting for signature…" : "Sign in with Sui"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => run(() => dAppKit.disconnectWallet())}
              disabled={busy}
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      <p aria-live="polite" className="mono muted">
        {busy ? "Working…" : ""}
      </p>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function AccountPicker({
  accounts,
  selected,
  onSelect,
}: {
  accounts: readonly UiWalletAccount[];
  selected: UiWalletAccount | null;
  onSelect: (account: UiWalletAccount) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="btn-row">
      {accounts.map((candidate) => (
        <button
          key={candidate.address}
          type="button"
          className="btn btn-secondary mono"
          aria-pressed={candidate.address === selected?.address}
          onClick={() => onSelect(candidate)}
        >
          {candidate.address.slice(0, 6)}…{candidate.address.slice(-4)}
        </button>
      ))}
    </div>
  );
}
