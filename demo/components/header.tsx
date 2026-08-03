"use client";

import {
  type UiWallet,
  type UiWalletAccount,
  useCurrentAccount,
  useDAppKit,
  useWalletConnection,
  useWallets,
} from "@mysten/dapp-kit-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { toMessageBytes } from "@/lib/auth/message";
import type { Session } from "@/lib/auth/session";

interface HeaderProps {
  session: Session | null;
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a className="logo" href="/">
          on<span className="logo-accent">sui</span>.eth
        </a>
        <WalletMenu session={session} />
      </div>
    </header>
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

function truncateAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletMenu({ session }: HeaderProps) {
  const router = useRouter();
  const dAppKit = useDAppKit();
  const wallets = useWallets();
  const account = useCurrentAccount();
  const { wallet, isConnected } = useWalletConnection();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
      setMenuOpen(false);
    });

  const signIn = () =>
    run(async () => {
      if (!account) throw new Error("Select an account first");

      const challenge = await postJson("/api/auth/challenge", {
        suiAddress: account.address,
      });

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

  const disconnect = () =>
    run(async () => {
      await dAppKit.disconnectWallet();
      setMenuOpen(false);
    });

  const activeAddress = session?.suiAddress ?? account?.address;
  const label = session
    ? truncateAddr(session.suiAddress)
    : isConnected
      ? `Connected: ${truncateAddr(account?.address ?? "")}`
      : "Connect wallet";

  return (
    <div className="wallet-menu" ref={menuRef}>
      <button
        type="button"
        id="wallet-connect-trigger"
        className="wallet-menu__trigger"
        onClick={() => setMenuOpen((value) => !value)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="wallet-menu__dot" aria-hidden="true" data-connected={isConnected || undefined} />
        <span className="wallet-menu__label">{busy ? "Working…" : label}</span>
        <span className="wallet-menu__chev" aria-hidden="true">{menuOpen ? "▾" : "▸"}</span>
      </button>

      {menuOpen && (
        <div className="wallet-menu__sheet" role="menu" aria-label="Wallet">
          {!isConnected ? (
            wallets.length === 0 ? (
              <span className="wallet-menu__item wallet-menu__item--muted" role="menuitem">
                No Sui wallets detected
              </span>
            ) : (
              wallets.map((candidate) => (
                <button
                  key={candidate.name}
                  type="button"
                  className="wallet-menu__item"
                  role="menuitem"
                  onClick={() => connect(candidate)}
                >
                  {candidate.name}
                </button>
              ))
            )
          ) : (
            <>
              {activeAddress ? (
                <span className="wallet-menu__item wallet-menu__item--muted" role="menuitem">
                  {truncateAddr(activeAddress)}
                </span>
              ) : null}

              {wallet && wallet.accounts.length > 1 ? (
                <div className="wallet-menu__accounts">
                  {wallet.accounts.map((candidate) => (
                    <button
                      key={candidate.address}
                      type="button"
                      className="wallet-menu__account"
                      role="menuitem"
                      aria-pressed={candidate.address === account?.address}
                      onClick={() => dAppKit.switchAccount({ account: candidate })}
                    >
                      {truncateAddr(candidate.address)}
                    </button>
                  ))}
                </div>
              ) : null}

              {!session ? (
                <button
                  type="button"
                  className="wallet-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void signIn();
                  }}
                >
                  Sign in with Sui
                </button>
              ) : (
                <button
                  type="button"
                  className="wallet-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut();
                  }}
                >
                  Sign out
                </button>
              )}

              <button
                type="button"
                className="wallet-menu__item wallet-menu__item--secondary"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void disconnect();
                }}
              >
                Disconnect wallet
              </button>
            </>
          )}

          {error ? (
            <span className="wallet-menu__error" role="alert">
              {error}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
