import { describe, expect, it } from "vitest";

import { ensRecordSchema } from "../schema";

const ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const SOL_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

describe("ensRecordSchema", () => {
  it("accepts multichain addresses, text records, and a contenthash together", () => {
    const result = ensRecordSchema.safeParse({
      suiName: "happy.sui",
      addresses: [
        { chain: "eth", value: ETH_ADDRESS },
        { chain: "sol", value: SOL_ADDRESS },
      ],
      texts: [{ key: "com.twitter", value: "happysingh" }],
      contenthash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    });

    expect(result.success).toBe(true);
  });

  it("defaults addresses and texts to empty arrays when omitted", () => {
    const result = ensRecordSchema.safeParse({ suiName: "happy.sui" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addresses).toEqual([]);
      expect(result.data.texts).toEqual([]);
    }
  });

  it("rejects an unsupported chain name", () => {
    const result = ensRecordSchema.safeParse({
      suiName: "happy.sui",
      addresses: [{ chain: "not-a-real-chain", value: ETH_ADDRESS }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an address malformed for its declared chain", () => {
    const result = ensRecordSchema.safeParse({
      suiName: "happy.sui",
      addresses: [{ chain: "eth", value: "not-an-address" }],
    });

    expect(result.success).toBe(false);
  });

  it.each(["org.suins.name", "walrus", "walrusSiteId"])(
    "rejects the reserved text key %s",
    (key) => {
      const result = ensRecordSchema.safeParse({
        suiName: "happy.sui",
        texts: [{ key, value: "anything" }],
      });

      expect(result.success).toBe(false);
    },
  );

  it("accepts a non-reserved text key", () => {
    const result = ensRecordSchema.safeParse({
      suiName: "happy.sui",
      texts: [{ key: "url", value: "https://example.com" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects more address records than the cap", () => {
    const addresses = Array.from({ length: 21 }, () => ({ chain: "eth", value: ETH_ADDRESS }));

    const result = ensRecordSchema.safeParse({ suiName: "happy.sui", addresses });

    expect(result.success).toBe(false);
  });

  it("rejects unknown top-level fields", () => {
    const result = ensRecordSchema.safeParse({
      suiName: "happy.sui",
      ethereumAddress: ETH_ADDRESS,
    });

    expect(result.success).toBe(false);
  });
});
