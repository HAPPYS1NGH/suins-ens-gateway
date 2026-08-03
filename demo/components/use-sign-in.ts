"use client";

import {
  type UiWalletAccount,
  useCurrentAccount,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { toMessageBytes } from "@/lib/auth/message";

/** Tiny shared JSON POST — used by the sign-in flow and the header's logout. */
export async function postJson<T extends Record<string, unknown>>(
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with ${response.status}`);
  }
  return data;
}

/**
 * The sign-in flow (challenge → sign → verify → refresh), extracted so the Hero
 * CTA and the header menu share one implementation. Call with an explicit account
 * to sign immediately after connecting — before `useCurrentAccount` has re-rendered.
 */
export function useSignIn() {
  const router = useRouter();
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();

  return useCallback(
    async (explicitAccount?: UiWalletAccount) => {
      const acct = explicitAccount ?? account;
      if (!acct) throw new Error("Select an account first");

      const challenge = await postJson<{ challengeId: string; message: string }>(
        "/api/auth/challenge",
        { suiAddress: acct.address },
      );

      const { signature } = await dAppKit.signPersonalMessage({
        account: acct,
        message: toMessageBytes(challenge.message),
      });

      await postJson("/api/auth/verify", {
        challengeId: challenge.challengeId,
        signature,
      });

      router.refresh();
    },
    [account, dAppKit, router],
  );
}