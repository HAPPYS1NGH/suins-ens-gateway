import { describe, expect, it } from "vitest";

import {
  buildChallengeMessage,
  toMessageBytes,
  type ChallengeInput,
} from "../message";

const base: ChallengeInput = {
  suiAddress:
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  uri: "https://demo.example",
  origin: "https://demo.example",
  chain: "sui:mainnet",
  nonce: "a".repeat(64),
  issuedAt: "2026-08-01T12:00:00.000Z",
  expirationTime: "2026-08-01T12:05:00.000Z",
  challengeId: "5f0a3f0e-0000-4000-8000-000000000001",
};

const CANONICAL = `Sui Name Holder Demo wants you to sign in with your Sui account.

Address: 0x0000000000000000000000000000000000000000000000000000000000000001
URI: https://demo.example
Origin: https://demo.example
Chain: sui:mainnet
Nonce: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Issued At: 2026-08-01T12:00:00.000Z
Expiration Time: 2026-08-01T12:05:00.000Z
Request ID: 5f0a3f0e-0000-4000-8000-000000000001
Version: 1
Statement: Prove control of this wallet. Name ownership is verified separately.`;

describe("buildChallengeMessage", () => {
  it("serializes the canonical message byte for byte", () => {
    expect(buildChallengeMessage(base)).toBe(CANONICAL);
    expect(toMessageBytes(buildChallengeMessage(base))).toEqual(
      new TextEncoder().encode(CANONICAL),
    );
  });

  it.each([
    ["nonce", { nonce: "b".repeat(64) }],
    ["origin", { origin: "https://evil.example" }],
    ["uri", { uri: "https://evil.example" }],
    ["chain", { chain: "sui:testnet" }],
    ["expiry", { expirationTime: "2026-08-01T12:06:00.000Z" }],
    ["issued at", { issuedAt: "2026-08-01T11:00:00.000Z" }],
    ["address", { suiAddress: `0x${"2".padStart(64, "0")}` }],
    ["challenge id", { challengeId: "5f0a3f0e-0000-4000-8000-000000000002" }],
  ] satisfies Array<[string, Partial<ChallengeInput>]>)(
    "changing the %s changes the signed bytes",
    (_label, patch) => {
      expect(buildChallengeMessage({ ...base, ...patch })).not.toBe(CANONICAL);
    },
  );

  it("encodes as UTF-8", () => {
    const bytes = toMessageBytes(buildChallengeMessage(base));
    expect(new TextDecoder("utf-8").decode(bytes)).toBe(CANONICAL);
  });
});
