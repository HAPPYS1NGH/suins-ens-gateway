import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { buildChallengeMessage, type ChallengeInput } from "./message";
import { redis } from "./redis";

export const CHALLENGE_TTL_SECONDS = 300;
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export interface StoredChallenge extends ChallengeInput {
  /** The exact message the wallet is asked to sign. */
  message: string;
}

export interface Session {
  suiAddress: string;
  issuedAt: string;
  expiresAt: string;
}

const challengeKey = (challengeId: string) => `challenge:${challengeId}`;
const sessionKey = (tokenHash: string) => `session:${tokenHash}`;

/** Sessions are stored by hash so a store dump cannot be replayed as a cookie. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createChallenge(
  input: ChallengeInput,
): Promise<StoredChallenge> {
  const challenge: StoredChallenge = {
    ...input,
    message: buildChallengeMessage(input),
  };

  const stored = await redis().set(
    challengeKey(input.challengeId),
    JSON.stringify(challenge),
    { nx: true, ex: CHALLENGE_TTL_SECONDS },
  );

  if (stored !== "OK") {
    throw new Error("Challenge identifier already exists");
  }

  return challenge;
}

/**
 * Single atomic read-and-delete. A `GET` followed by a `DEL` would let two concurrent
 * verifications observe the same live challenge, which is exactly the replay this
 * protects against.
 */
export async function consumeChallengeOnce(
  challengeId: string,
): Promise<StoredChallenge | null> {
  const challenge = await redis().getdel<StoredChallenge>(
    challengeKey(challengeId),
  );
  return challenge ?? null;
}

export async function createSession(
  suiAddress: string,
): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const session: Session = {
    suiAddress,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
  };

  await redis().set(sessionKey(hashSessionToken(token)), JSON.stringify(session), {
    ex: SESSION_TTL_SECONDS,
  });

  return { token, expiresAt: session.expiresAt };
}

export async function readSession(token: string): Promise<Session | null> {
  const session = await redis().get<Session>(
    sessionKey(hashSessionToken(token)),
  );
  if (!session) return null;

  // Absolute expiry is enforced here as well as by the Redis TTL, so a store that
  // loses its TTL cannot resurrect an old session.
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await revokeSession(token);
    return null;
  }

  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await redis().del(sessionKey(hashSessionToken(token)));
}
