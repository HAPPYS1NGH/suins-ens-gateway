import { randomUUID } from "node:crypto";

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toMessageBytes, type ChallengeInput } from "../message";

/**
 * In-memory stand-in for Upstash Redis. It mirrors the two behaviours the auth store
 * depends on: `SET ... NX` refuses to overwrite, and reads JSON-deserialize.
 */
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("../redis", () => {
  const parse = (value: string | undefined) =>
    value === undefined ? null : JSON.parse(value);

  return {
    redis: () => ({
      set: async (
        key: string,
        value: string,
        options?: { nx?: boolean; ex?: number },
      ) => {
        if (options?.nx && store.has(key)) return null;
        store.set(key, value);
        return "OK";
      },
      get: async (key: string) => parse(store.get(key)),
      getdel: async (key: string) => {
        const value = store.get(key);
        store.delete(key);
        return parse(value);
      },
      del: async (key: string) => {
        store.delete(key);
      },
    }),
  };
});

const { createChallenge } = await import("../store");
const { verifyChallengeSignature } = await import("../verify");

const ORIGIN = "https://demo.example";
const CHAIN = "sui:mainnet";

const keypair = Ed25519Keypair.generate();
const impostor = Ed25519Keypair.generate();

function issue(overrides: Partial<ChallengeInput> = {}) {
  const now = Date.now();
  return createChallenge({
    suiAddress: keypair.toSuiAddress(),
    uri: ORIGIN,
    origin: ORIGIN,
    chain: CHAIN,
    nonce: "a".repeat(64),
    issuedAt: new Date(now).toISOString(),
    expirationTime: new Date(now + 300_000).toISOString(),
    challengeId: randomUUID(),
    ...overrides,
  });
}

const verify = (challengeId: string, signature: string) =>
  verifyChallengeSignature({
    challengeId,
    signature,
    expectedOrigin: ORIGIN,
    expectedChain: CHAIN,
  });

beforeEach(() => {
  store.clear();
});

describe("verifyChallengeSignature", () => {
  it("accepts a signature over the exact server-issued bytes", async () => {
    const challenge = await issue();
    const { signature } = await keypair.signPersonalMessage(
      toMessageBytes(challenge.message),
    );

    const verified = await verify(challenge.challengeId, signature);

    expect(verified.suiAddress).toBe(keypair.toSuiAddress());
  });

  it("rejects a signature from a different address", async () => {
    const challenge = await issue();
    const { signature } = await impostor.signPersonalMessage(
      toMessageBytes(challenge.message),
    );

    await expect(verify(challenge.challengeId, signature)).rejects.toThrow(
      /Signature does not match/,
    );
  });

  it("rejects a signature over mutated bytes", async () => {
    const challenge = await issue();
    const { signature } = await keypair.signPersonalMessage(
      toMessageBytes(challenge.message.replace("Chain: sui:mainnet", "Chain: sui:testnet")),
    );

    await expect(verify(challenge.challengeId, signature)).rejects.toThrow(
      /Signature does not match/,
    );
  });

  it("rejects an expired challenge", async () => {
    const challenge = await issue({
      expirationTime: new Date(Date.now() - 1_000).toISOString(),
    });
    const { signature } = await keypair.signPersonalMessage(
      toMessageBytes(challenge.message),
    );

    await expect(verify(challenge.challengeId, signature)).rejects.toThrow(
      /expired/,
    );
  });

  it("rejects a challenge bound to another origin", async () => {
    const challenge = await issue({ origin: "https://evil.example" });
    const { signature } = await keypair.signPersonalMessage(
      toMessageBytes(challenge.message),
    );

    await expect(verify(challenge.challengeId, signature)).rejects.toThrow(
      /origin is not allowed/,
    );
  });

  it("consumes the challenge so it cannot be replayed", async () => {
    const challenge = await issue();
    const { signature } = await keypair.signPersonalMessage(
      toMessageBytes(challenge.message),
    );

    await verify(challenge.challengeId, signature);

    await expect(verify(challenge.challengeId, signature)).rejects.toThrow(
      /already used/,
    );
  });

  it("refuses to overwrite an existing challenge id", async () => {
    const challenge = await issue();
    await expect(issue({ challengeId: challenge.challengeId })).rejects.toThrow(
      /already exists/,
    );
  });
});
