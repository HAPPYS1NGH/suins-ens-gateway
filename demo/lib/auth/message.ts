/**
 * Canonical challenge serialization. Pure, no I/O, no environment access — the exact
 * bytes produced here are the authentication contract shared by wallet and verifier.
 * Changing field order, spacing, or wording is a breaking protocol change.
 */

export const CHALLENGE_VERSION = "1";

export const CHALLENGE_HEADER =
  "Sui Name Holder Demo wants you to sign in with your Sui account.";

export const CHALLENGE_STATEMENT =
  "Prove control of this wallet. Name ownership is verified separately.";

export interface ChallengeInput {
  /** Normalized Sui address the signature must verify against. */
  suiAddress: string;
  uri: string;
  origin: string;
  /** CAIP-style chain identifier, e.g. `sui:mainnet`. */
  chain: string;
  /** Server-generated 256-bit random value, hex encoded. */
  nonce: string;
  /** RFC3339 UTC. */
  issuedAt: string;
  /** RFC3339 UTC. */
  expirationTime: string;
  /** Opaque server-generated challenge identifier. */
  challengeId: string;
}

export function buildChallengeMessage(input: ChallengeInput): string {
  return [
    CHALLENGE_HEADER,
    "",
    `Address: ${input.suiAddress}`,
    `URI: ${input.uri}`,
    `Origin: ${input.origin}`,
    `Chain: ${input.chain}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
    `Request ID: ${input.challengeId}`,
    `Version: ${CHALLENGE_VERSION}`,
    `Statement: ${CHALLENGE_STATEMENT}`,
  ].join("\n");
}

export function toMessageBytes(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}
