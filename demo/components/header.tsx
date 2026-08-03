"use client";

import {
  type UiWallet,
  useCurrentAccount,
  useDAppKit,
  useWalletConnection,
  useWallets,
} from "@mysten/dapp-kit-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { Session } from "@/lib/auth/session";
import { truncateAddr } from "@/lib/records";
import { postJson, useSignIn } from "./use-sign-in";
import { useWalletCtaLabel } from "./use-wallet-cta";

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
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

  const signInAction = useSignIn();
  const signIn = () => run(async () => signInAction());

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
  const label = useWalletCtaLabel(session);

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
