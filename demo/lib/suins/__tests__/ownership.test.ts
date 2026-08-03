import { normalizeSuiAddress } from "@mysten/sui/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getNameRecord, getObject } = vi.hoisted(() => ({
  getNameRecord: vi.fn(),
  getObject: vi.fn(),
}));

vi.mock("../client", () => ({
  suiClient: () => ({
    suins: { getNameRecord },
    core: { getObject },
  }),
}));

const { checkNameOwnership, resolveNameOwner } = await import("../ownership");

const HOLDER = normalizeSuiAddress("0x1");
const STRANGER = normalizeSuiAddress("0x2");
const NFT_ID = normalizeSuiAddress("0xabc");

const record = (overrides: Record<string, unknown> = {}) => ({
  name: "happy.sui",
  nftId: NFT_ID,
  targetAddress: HOLDER,
  expirationTimestampMs: Date.now() + 86_400_000,
  data: {},
  ...overrides,
});

const ownedBy = (address: string) => ({
  object: { owner: { $kind: "AddressOwner", AddressOwner: address } },
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("checkNameOwnership", () => {
  it("confirms the wallet that directly owns the name NFT", async () => {
    getNameRecord.mockResolvedValue(record());
    getObject.mockResolvedValue(ownedBy(HOLDER));

    const result = await checkNameOwnership("HAPPY.sui", HOLDER);

    expect(result).toMatchObject({
      status: "owned",
      normalizedName: "happy.sui",
      nftId: NFT_ID,
      ownerAddress: HOLDER,
    });
    expect(getObject).toHaveBeenCalledWith({ objectId: NFT_ID });
  });

  it("accepts the @label form and normalizes it", async () => {
    getNameRecord.mockResolvedValue(record());
    getObject.mockResolvedValue(ownedBy(HOLDER));

    const result = await checkNameOwnership("@happy", HOLDER);

    expect(result.normalizedName).toBe("happy.sui");
  });

  it("rejects a name that resolves to the wallet but is held by someone else", async () => {
    // targetAddress is the wallet; the NFT is not. Resolution config is not ownership.
    getNameRecord.mockResolvedValue(record({ targetAddress: HOLDER }));
    getObject.mockResolvedValue(ownedBy(STRANGER));

    const result = await checkNameOwnership("happy.sui", HOLDER);

    expect(result.status).toBe("address-owner-mismatch");
  });

  it("reports a missing registration as not-found", async () => {
    getNameRecord.mockResolvedValue(null);

    const result = await checkNameOwnership("nobody.sui", HOLDER);

    expect(result.status).toBe("not-found");
    expect(getObject).not.toHaveBeenCalled();
  });

  it("reports an elapsed registration as expired", async () => {
    getNameRecord.mockResolvedValue(
      record({ expirationTimestampMs: Date.now() - 1_000 }),
    );

    const result = await checkNameOwnership("happy.sui", HOLDER);

    expect(result.status).toBe("expired");
    expect(getObject).not.toHaveBeenCalled();
  });

  it.each([
    ["ObjectOwner", { $kind: "ObjectOwner", ObjectOwner: NFT_ID }, "object-owned"],
    [
      "Shared",
      { $kind: "Shared", Shared: { initialSharedVersion: "1" } },
      "shared",
    ],
    ["Immutable", { $kind: "Immutable", Immutable: true }, "immutable"],
    [
      "ConsensusAddressOwner",
      {
        $kind: "ConsensusAddressOwner",
        ConsensusAddressOwner: { startVersion: "1", owner: HOLDER },
      },
      "unsupported-owner",
    ],
    ["Unknown", { $kind: "Unknown" }, "unsupported-owner"],
  ])("classifies a %s NFT as %s", async (_label, owner, expected) => {
    getNameRecord.mockResolvedValue(record());
    getObject.mockResolvedValue({ object: { owner } });

    const result = await checkNameOwnership("happy.sui", HOLDER);

    expect(result.status).toBe(expected);
  });

  it("rejects a malformed name without touching the network", async () => {
    const result = await checkNameOwnership("not a name", HOLDER);

    expect(result).toMatchObject({
      status: "invalid-name",
      normalizedName: null,
    });
    expect(getNameRecord).not.toHaveBeenCalled();
  });

  it("maps a failed record read to rpc-unavailable, not a mismatch", async () => {
    getNameRecord.mockRejectedValue(new Error("fullnode timeout"));

    const result = await checkNameOwnership("happy.sui", HOLDER);

    expect(result.status).toBe("rpc-unavailable");
  });

  it("maps a failed object read to rpc-unavailable, not a mismatch", async () => {
    getNameRecord.mockResolvedValue(record());
    getObject.mockRejectedValue(new Error("fullnode timeout"));

    const result = await checkNameOwnership("happy.sui", HOLDER);

    expect(result.status).toBe("rpc-unavailable");
  });
});

describe("resolveNameOwner", () => {
  it("returns the holder of a name the caller does not own", async () => {
    getNameRecord.mockResolvedValue(record());
    getObject.mockResolvedValue(ownedBy(STRANGER));

    const result = await resolveNameOwner("happy.sui");

    // The public profile path has no candidate address, so a stranger's name still
    // resolves to `owned` rather than the mismatch `checkNameOwnership` would report.
    expect(result.status).toBe("owned");
    expect(result).toMatchObject({ ownerAddress: STRANGER, normalizedName: "happy.sui" });
  });

  it("reports an unreachable RPC rather than a missing name", async () => {
    getNameRecord.mockRejectedValue(new Error("connect ECONNREFUSED"));

    expect((await resolveNameOwner("happy.sui")).status).toBe("rpc-unavailable");
  });

  it("treats the SDK's thrown 'Object not found' as an unregistered name", async () => {
    // The registry lookup throws instead of returning null when nobody registered the
    // name. Reporting that as `rpc-unavailable` claimed Sui was down for every typo,
    // and answered a write with a retryable 503 instead of a plain ownership refusal.
    getNameRecord.mockRejectedValue(new Error("Object 0xc053d3 not found"));

    expect((await resolveNameOwner("happy.sui")).status).toBe("not-found");
  });

  it("keeps a timeout retryable rather than calling the name unregistered", async () => {
    getNameRecord.mockRejectedValue(new Error("deadline exceeded"));

    expect((await resolveNameOwner("happy.sui")).status).toBe("rpc-unavailable");
  });

  it("reports a name with no record as not-found", async () => {
    getNameRecord.mockResolvedValue(null);

    expect((await resolveNameOwner("happy.sui")).status).toBe("not-found");
  });

  it("rejects a malformed name without touching the network", async () => {
    expect((await resolveNameOwner("not a name")).status).toBe("invalid-name");
    expect(getNameRecord).not.toHaveBeenCalled();
  });
});
