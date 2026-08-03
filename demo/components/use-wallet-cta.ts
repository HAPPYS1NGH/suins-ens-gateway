"use client";

import { useWalletConnection } from "@mysten/dapp-kit-react";

import type { Session } from "@/lib/auth/session";
import { truncateAddr } from "@/lib/records";

/**
 * One label for the wallet trigger, shared by the header menu and the Hero CTA so
 * the two surfaces never disagree. Reflects the *next* action, not the current
 * state: once a wallet is connected the user still has to sign, so the prompt is
 * "Sign in" — not "Connect wallet".
 */
export function useWalletCtaLabel(session: Session | null): string {
  const { isConnected } = useWalletConnection();
  if (session) return truncateAddr(session.suiAddress);
  return isConnected ? "Sign in" : "Connect wallet";
}