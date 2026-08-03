import { beforeEach, describe, expect, it, vi } from "vitest";

const { listOwnedObjects, getNameRecord } = vi.hoisted(() => ({
  listOwnedObjects: vi.fn(),
  getNameRecord: vi.fn(),
}));

vi.mock("../client", () => ({
  suiClient: () => ({
    core: { listOwnedObjects },
    suins: { getNameRecord },
  }),
}));

vi.mock("@/lib/env", () => ({ env: { SUI_NETWORK: "mainnet" } }));

const { listOwnedSuiNames } = await import("../names");

const HOLDER = "0x0000000000000000000000000000000000000000000000000000000000000001";
const PACKAGE_ID_V1 = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0";
const REG_TYPE = `${PACKAGE_ID_V1}::suins_registration::SuinsRegistration`;

function nft(objectId: string, name?: string, imageUrl?: string) {
  return {
    objectId,
    type: REG_TYPE,
    display: {
      output: {
        name,
        image_url: imageUrl,
        project_url: "https://suins.io",
      },
      errors: null,
    },
  };
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    name: "happy.sui",
    nftId: "0xabc",
    targetAddress: "",
    expirationTimestampMs: Date.now() + 86_400_000,
    data: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listOwnedSuiNames", () => {
  it("returns a sorted list of owned .sui names with display and record data", async () => {
    listOwnedObjects.mockResolvedValue({
      objects: [
        nft("0xabc", "zebra.sui", "https://example.com/zebra.png"),
        nft("0xdef", "happy.sui", "https://example.com/happy.png"),
      ],
      cursor: null,
      hasNextPage: false,
    });

    getNameRecord.mockImplementation((name: string) =>
      Promise.resolve(
        record({
          name,
          nftId: name === "happy.sui" ? "0xdef" : "0xabc",
          avatar: name === "happy.sui" ? "https://example.com/avatar.png" : undefined,
          targetAddress: name === "happy.sui" ? HOLDER : "",
        }),
      ),
    );

    const result = await listOwnedSuiNames(HOLDER);

    expect(listOwnedObjects).toHaveBeenCalledWith(
      expect.objectContaining({ owner: HOLDER, type: REG_TYPE }),
    );
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("happy.sui");
    expect(result[0].avatar).toBe("https://example.com/avatar.png");
    expect(result[0].imageUrl).toBe("https://example.com/happy.png");
    expect(result[0].targetAddress).toBe(HOLDER);
    expect(result[1].name).toBe("zebra.sui");
  });

  it("skips objects with no display name", async () => {
    listOwnedObjects.mockResolvedValue({
      objects: [nft("0xabc"), nft("0xdef", "valid.sui", "https://example.com/valid.png")],
      cursor: null,
      hasNextPage: false,
    });
    getNameRecord.mockResolvedValue(record({ name: "valid.sui", nftId: "0xdef" }));

    const result = await listOwnedSuiNames(HOLDER);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid.sui");
  });

  it("skips non-SuinsRegistration objects", async () => {
    listOwnedObjects.mockResolvedValue({
      objects: [
        { objectId: "0x111", type: "0x2::coin::Coin<0x2::sui::SUI>", display: null },
        nft("0xdef", "valid.sui", "https://example.com/valid.png"),
      ],
      cursor: null,
      hasNextPage: false,
    });
    getNameRecord.mockResolvedValue(record({ name: "valid.sui", nftId: "0xdef" }));

    const result = await listOwnedSuiNames(HOLDER);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid.sui");
  });

  it("skips names whose record read fails without blocking others", async () => {
    listOwnedObjects.mockResolvedValue({
      objects: [
        nft("0xbad", "broken.sui", "https://example.com/broken.png"),
        nft("0xdef", "valid.sui", "https://example.com/valid.png"),
      ],
      cursor: null,
      hasNextPage: false,
    });
    getNameRecord.mockImplementation((name: string) => {
      if (name === "broken.sui") return Promise.reject(new Error("fullnode timeout"));
      return Promise.resolve(record({ name: "valid.sui", nftId: "0xdef" }));
    });

    const result = await listOwnedSuiNames(HOLDER);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid.sui");
  });

  it("throws for unsupported Sui networks", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({ env: { SUI_NETWORK: "localnet" } }));
    const { listOwnedSuiNames: localList } = await import("../names");

    await expect(localList(HOLDER)).rejects.toThrow("not supported");
  });
});
