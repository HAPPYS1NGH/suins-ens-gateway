import { SubnameAlreadyExistsError } from "@thenamespace/offchain-manager";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSingleSubname, createSubname, updateSubname } = vi.hoisted(() => ({
  getSingleSubname: vi.fn(),
  createSubname: vi.fn(),
  updateSubname: vi.fn(),
}));

const { checkNameOwnership } = vi.hoisted(() => ({ checkNameOwnership: vi.fn() }));

vi.mock("../client", () => ({
  namespaceClient: () => ({ getSingleSubname, createSubname, updateSubname }),
}));

vi.mock("@/lib/suins/ownership", () => ({ checkNameOwnership }));

// upsertSubname stamps env.SUI_NETWORK into provenance; real env.ts requires the
// full Upstash/Namespace configuration this unit test has no reason to provide.
vi.mock("@/lib/env", () => ({ env: { SUI_NETWORK: "mainnet" } }));

const { upsertSubname, NameNotOwnedError, NamespaceLabelCollisionError } = await import(
  "../upsert"
);

const HOLDER = "0x0000000000000000000000000000000000000000000000000000000000000001";
const NFT_ID = "0xabc";
const ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const ETH_ADDRESS_LOWERCASE = ETH_ADDRESS.toLowerCase();
const SOL_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

const owned = (overrides: Record<string, unknown> = {}) => ({
  status: "owned",
  normalizedName: "happy.sui",
  nftId: NFT_ID,
  ownerAddress: HOLDER,
  expirationTimestampMs: Date.now() + 86_400_000,
  checkedAt: new Date().toISOString(),
  ...overrides,
});

const provenanceMetadata = (overrides: Record<string, string> = {}) => ({
  app: "sui-name-holder-demo",
  schemaVersion: "1",
  suiNetwork: "mainnet",
  suinsName: "happy.sui",
  suinsNftId: NFT_ID,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("upsertSubname", () => {
  it("creates the subname when the label is absent", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue(null);
    createSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
    });

    expect(createSubname).toHaveBeenCalledWith(
      expect.objectContaining({
        parentName: "onsui.eth",
        label: "happy",
        addresses: [{ chain: "eth", value: ETH_ADDRESS }],
        metadata: expect.arrayContaining([
          { key: "app", value: "sui-name-holder-demo" },
          { key: "suinsNftId", value: NFT_ID },
        ]),
      }),
    );
    expect(updateSubname).not.toHaveBeenCalled();
  });

  it("creates the subname when the SDK's own 404-to-null translation fails to fire", async () => {
    // The SDK is supposed to swallow a 404 into `null`, but its internal
    // `instanceof AxiosError` check is unreliable across Next.js's bundled module
    // graph, so upsert.ts must treat a raw 404 AxiosError the same as `null`.
    checkNameOwnership.mockResolvedValue(owned());
    const notFound = new AxiosError("Request failed with status code 404");
    notFound.response = {
      status: 404,
      statusText: "Not Found",
      data: { message: "happy.onsui.eth doesn't exist" },
      headers: {},
      config: notFound.config as never,
    };
    getSingleSubname.mockRejectedValue(notFound);
    createSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
    });

    expect(createSubname).toHaveBeenCalled();
    expect(updateSubname).not.toHaveBeenCalled();
  });

  it("idempotently updates when the label already carries this app's provenance", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue({
      fullName: "happy.onsui.eth",
      metadata: provenanceMetadata(),
      addresses: {},
      texts: {},
    });
    updateSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
    });

    expect(createSubname).not.toHaveBeenCalled();
    expect(updateSubname).toHaveBeenCalledWith("happy.onsui.eth", {
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
      texts: [],
      contenthash: undefined,
      metadata: expect.arrayContaining([
        { key: "app", value: "sui-name-holder-demo" },
        { key: "suinsNftId", value: NFT_ID },
      ]),
    });
  });

  it("maps text records and contenthash into a complete desired-state write", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue({
      fullName: "happy.onsui.eth",
      metadata: provenanceMetadata(),
      addresses: {},
      texts: {},
    });
    updateSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [
        { chain: "eth", value: ETH_ADDRESS },
        { chain: "sol", value: SOL_ADDRESS },
      ],
      texts: [{ key: "com.twitter", value: "happysingh" }],
      contenthash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    });

    expect(updateSubname).toHaveBeenCalledWith("happy.onsui.eth", {
      addresses: [
        { chain: "eth", value: ETH_ADDRESS },
        { chain: "sol", value: SOL_ADDRESS },
      ],
      texts: [{ key: "com.twitter", value: "happysingh" }],
      contenthash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      metadata: expect.arrayContaining([
        { key: "app", value: "sui-name-holder-demo" },
        { key: "suinsNftId", value: NFT_ID },
      ]),
    });
  });

  it("checksums an Ethereum address that was not already checksummed", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue(null);
    createSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [{ chain: "eth", value: ETH_ADDRESS_LOWERCASE }],
    });

    expect(createSubname).toHaveBeenCalledWith(
      expect.objectContaining({ addresses: [{ chain: "eth", value: ETH_ADDRESS }] }),
    );
  });

  it("fails closed as a collision when provenance does not match", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue({
      fullName: "happy.onsui.eth",
      metadata: provenanceMetadata({ suinsNftId: "0xsomeone-elses-nft" }),
      addresses: {},
      texts: {},
    });

    await expect(
      upsertSubname({ suiName: "happy.sui", suiAddress: HOLDER }),
    ).rejects.toBeInstanceOf(NamespaceLabelCollisionError);

    expect(updateSubname).not.toHaveBeenCalled();
  });

  it("refetches and rechecks provenance after a create conflict", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        fullName: "happy.onsui.eth",
        metadata: provenanceMetadata(),
        addresses: {},
        texts: {},
      });
    createSubname.mockRejectedValue(new SubnameAlreadyExistsError("happy.onsui.eth"));
    updateSubname.mockResolvedValue(undefined);

    await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
    });

    expect(getSingleSubname).toHaveBeenCalledTimes(2);
    expect(updateSubname).toHaveBeenCalledWith("happy.onsui.eth", {
      addresses: [{ chain: "eth", value: ETH_ADDRESS }],
      texts: [],
      contenthash: undefined,
      metadata: expect.arrayContaining([
        { key: "app", value: "sui-name-holder-demo" },
        { key: "suinsNftId", value: NFT_ID },
      ]),
    });
  });

  it("rejects a create conflict whose refetch still comes back empty", async () => {
    checkNameOwnership.mockResolvedValue(owned());
    getSingleSubname.mockResolvedValue(null);
    const conflict = new SubnameAlreadyExistsError("happy.onsui.eth");
    createSubname.mockRejectedValue(conflict);

    await expect(
      upsertSubname({ suiName: "happy.sui", suiAddress: HOLDER }),
    ).rejects.toBe(conflict);
  });

  it.each([
    "address-owner-mismatch",
    "not-found",
    "expired",
    "rpc-unavailable",
    "invalid-name",
  ] as const)("rejects a write when ownership status is %s", async (status) => {
    checkNameOwnership.mockResolvedValue({
      status,
      normalizedName: "happy.sui",
      checkedAt: new Date().toISOString(),
    });

    const error = await upsertSubname({
      suiName: "happy.sui",
      suiAddress: HOLDER,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NameNotOwnedError);
    expect((error as InstanceType<typeof NameNotOwnedError>).status).toBe(status);
    expect(getSingleSubname).not.toHaveBeenCalled();
  });
});
