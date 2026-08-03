import "server-only";

import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

import { RequestRejected } from "@/lib/http/origin";

import { toMessageBytes } from "./message";
import { consumeChallengeOnce, type StoredChallenge } from "./store";

export interface VerifyChallengeInput {
  challengeId: string;
  signature: string;
  expectedOrigin: string;
  expectedChain: string;
  /** Injectable clock for tests. */
  now?: number;
}

/**
 * Consumes the challenge exactly once and proves the signature belongs to the address
 * the server bound it to. Every failure path throws; nothing here can degrade into a
 * successful-but-empty result.
 */
export async function verifyChallengeSignature(
  input: VerifyChallengeInput,
): Promise<StoredChallenge> {
  const challenge = await consumeChallengeOnce(input.challengeId);
  if (!challenge) {
    throw new RequestRejected(
      "Challenge is unknown, expired, or already used",
      401,
    );
  }

  const now = input.now ?? Date.now();
  const expiresAt = Date.parse(challenge.expirationTime);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new RequestRejected("Challenge has expired", 401);
  }

  if (challenge.origin !== input.expectedOrigin) {
    throw new RequestRejected("Challenge origin is not allowed", 401);
  }

  if (challenge.chain !== input.expectedChain) {
    throw new RequestRejected("Challenge chain does not match", 401);
  }

  try {
    await verifyPersonalMessageSignature(
      toMessageBytes(challenge.message),
      input.signature,
      { address: challenge.suiAddress },
    );
  } catch {
    throw new RequestRejected("Signature does not match the challenge", 401);
  }

  return challenge;
}
