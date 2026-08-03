// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordEditor } from "@/components/record-editor";

const ETH_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

interface StubProfile {
  fullName: string;
  addresses: Record<string, string>;
  texts: Record<string, string>;
  contenthash: string | null;
}

const EMPTY_PROFILE: StubProfile = {
  fullName: "happy.onsui.eth",
  addresses: {},
  texts: {},
  contenthash: null,
};

/**
 * Stubs the two endpoints RecordEditor talks to: the mount-time GET that hydrates
 * existing rows, and the save-time POST. `onSave` inspects the request body and can
 * return a specific status/body; when omitted, POST echoes `profile` back with 200.
 */
function stubRecordsFetch({
  profile = EMPTY_PROFILE,
  onSave,
}: {
  profile?: StubProfile;
  onSave?: (body: Record<string, unknown>) => { status?: number; body?: unknown };
} = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        return { ok: true, status: 200, json: async () => profile };
      }
      const body = JSON.parse((init.body as string) ?? "{}");
      const result = onSave ? onSave(body) : {};
      const status = result.status ?? 200;
      return { ok: status < 400, status, json: async () => result.body ?? profile };
    }),
  );
}

async function waitForLoaded() {
  await waitFor(() =>
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(false),
  );
}

beforeEach(() => {
  stubRecordsFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RecordEditor", () => {
  it("does not render a contenthash field", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    expect(screen.queryByLabelText(/contenthash/i)).toBeNull();
  });

  it("shows the Avatar text-record preset by default", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add text record"));
    const select = screen.getByLabelText("Text record type");
    expect(within(select).getByText("Avatar")).toBeTruthy();
  });

  it("hides the Avatar text-record preset when the SuiNS name already has an avatar", async () => {
    render(<RecordEditor suiName="happy.sui" suiAvatar="https://example.com/avatar.png" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add text record"));
    const select = screen.getByLabelText("Text record type");
    expect(within(select).queryByText("Avatar")).toBeNull();
  });

  it("gives every address row an accessible chain selector and value field", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add address"));

    expect(screen.getByLabelText("Chain")).toBeTruthy();
    expect(screen.getByLabelText("eth address")).toBeTruthy();
  });

  it("associates an invalid address with its error via aria-describedby and role=alert", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add address"));

    const valueInput = screen.getByLabelText("eth address") as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: "not-an-address" } });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/valid eth address/i);
    expect(valueInput.getAttribute("aria-describedby")).toBe(alert.id);
    expect(valueInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("associates a reserved custom text key with its error via aria-describedby", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add text record"));

    fireEvent.change(screen.getByLabelText("Text record type"), {
      target: { value: "__custom__" },
    });
    const keyInput = screen.getByLabelText("Custom record key") as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: "walrus" } });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/reserved for sui-native data/i);
    expect(keyInput.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("prefills existing addresses and text records from the current profile", async () => {
    stubRecordsFetch({
      profile: {
        fullName: "happy.onsui.eth",
        addresses: { eth: ETH_ADDRESS },
        texts: { "com.twitter": "happysingh", "com.example": "custom-value" },
        contenthash: null,
      },
    });

    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    expect(screen.getByDisplayValue(ETH_ADDRESS)).toBeTruthy();
    expect(screen.getByDisplayValue("happysingh")).toBeTruthy();
    expect(screen.getByDisplayValue("custom-value")).toBeTruthy();
    // "com.example" has no preset, so it renders in custom-key mode with the
    // technical key visible for editing.
    expect(screen.getByDisplayValue("com.example")).toBeTruthy();
  });

  it("hydrates coin-type-keyed addresses (the real API shape) as ChainName rows so Save stays enabled", async () => {
    // The Namespace API stores address records keyed by SLIP-44 coin type ("60" =
    // Ethereum), not by ChainName. A loaded ETH row must translate to chain "eth"
    // so validateAddress accepts it; otherwise hasRowErrors keeps Save disabled.
    stubRecordsFetch({
      profile: {
        fullName: "happy.onsui.eth",
        addresses: { "60": ETH_ADDRESS },
        texts: {},
        contenthash: null,
      },
    });

    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    expect(screen.getByLabelText("eth address")).toBeTruthy();
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends a ChainName removal for a coin-type-keyed existing row", async () => {
    stubRecordsFetch({
      profile: {
        fullName: "happy.onsui.eth",
        addresses: { "60": ETH_ADDRESS },
        texts: {},
        contenthash: null,
      },
    });

    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    let savedBody: Record<string, unknown> | null = null;
    stubRecordsFetch({
      profile: EMPTY_PROFILE,
      onSave: (body) => {
        savedBody = body;
        return {};
      },
    });

    fireEvent.click(screen.getByText("Remove"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect((savedBody as unknown as { removeAddresses: string[] }).removeAddresses).toEqual([
      "eth",
    ]);
  });

  it("disables Save until the initial profile load resolves", async () => {
    let resolveFetch: (value: { ok: boolean; status: number; json: () => Promise<StubProfile> }) => void =
      () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    render(<RecordEditor suiName="happy.sui" />);
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(true);

    resolveFetch({ ok: true, status: 200, json: async () => EMPTY_PROFILE });

    await waitForLoaded();
  });

  it("includes an existing row's key in the removal payload but not a new row's", async () => {
    stubRecordsFetch({
      profile: {
        fullName: "happy.onsui.eth",
        addresses: { eth: ETH_ADDRESS },
        texts: {},
        contenthash: null,
      },
    });

    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    let savedBody: Record<string, unknown> | null = null;
    stubRecordsFetch({
      profile: EMPTY_PROFILE,
      onSave: (body) => {
        savedBody = body;
        return {};
      },
    });

    fireEvent.click(screen.getByText("Remove"));
    fireEvent.click(screen.getByText("+ Add address"));
    const chainSelectors = screen.getAllByLabelText("Chain");
    fireEvent.change(chainSelectors[chainSelectors.length - 1], { target: { value: "base" } });
    fireEvent.change(screen.getByLabelText("base address"), { target: { value: ETH_ADDRESS } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect((savedBody as unknown as { removeAddresses: string[] }).removeAddresses).toEqual([
      "eth",
    ]);
  });

  it("omits a removal when an address with the same key is removed then re-added", async () => {
    stubRecordsFetch({
      profile: { ...EMPTY_PROFILE, addresses: { eth: ETH_ADDRESS } },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    fireEvent.click(screen.getByText("Remove"));
    fireEvent.click(screen.getByText("+ Add address"));
    const inputs = screen.getAllByLabelText("eth address");
    fireEvent.change(inputs[inputs.length - 1], { target: { value: ETH_ADDRESS } });

    let savedBody: Record<string, unknown> | null = null;
    stubRecordsFetch({ onSave: (body) => { savedBody = body; return {}; } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect((savedBody as unknown as { removeAddresses: string[] }).removeAddresses).toEqual([]);
  });

  it("does not upsert a new text row removed immediately before save", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add text record"));
    fireEvent.change(screen.getByLabelText("Text record type"), {
      target: { value: "com.twitter" },
    });
    fireEvent.change(screen.getByLabelText("Value for com.twitter"), {
      target: { value: "happysingh" },
    });
    fireEvent.click(screen.getByText("Remove"));

    let savedBody: Record<string, unknown> | null = null;
    stubRecordsFetch({ onSave: (body) => { savedBody = body; return {}; } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect((savedBody as unknown as { texts: unknown[] }).texts).toEqual([]);
  });

  it("treats a newly saved text row as existing when removing it on a second save", async () => {
    const bodies: Record<string, unknown>[] = [];
    stubRecordsFetch({
      onSave: (body) => {
        bodies.push(body);
        return bodies.length === 1
          ? { body: { ...EMPTY_PROFILE, texts: { "com.twitter": "happysingh" } } }
          : { body: EMPTY_PROFILE };
      },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("+ Add text record"));
    fireEvent.change(screen.getByLabelText("Text record type"), {
      target: { value: "com.twitter" },
    });
    fireEvent.change(screen.getByLabelText("Value for com.twitter"), {
      target: { value: "happysingh" },
    });
    fireEvent.click(screen.getByText("Save"));
    await screen.findByDisplayValue("happysingh");

    fireEvent.click(screen.getByText("Remove"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].removeTextKeys).toEqual(["com.twitter"]);
  });

  it("removes original address and text identities when existing keys change", async () => {
    stubRecordsFetch({
      profile: {
        ...EMPTY_PROFILE,
        addresses: { eth: ETH_ADDRESS },
        texts: { "com.twitter": "happysingh" },
      },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.change(screen.getByLabelText("Chain"), { target: { value: "base" } });
    fireEvent.change(screen.getByLabelText("Text record type"), {
      target: { value: "com.github" },
    });

    let savedBody: Record<string, unknown> | null = null;
    stubRecordsFetch({ onSave: (body) => { savedBody = body; return {}; } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(savedBody).not.toBeNull());
    expect((savedBody as unknown as { removeAddresses: string[] }).removeAddresses).toEqual(["eth"]);
    expect((savedBody as unknown as { removeTextKeys: string[] }).removeTextKeys).toEqual(["com.twitter"]);
  });

  it("announces a successful save inside the aria-live status region", async () => {
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();
    fireEvent.click(screen.getByText("Save"));

    const status = await screen.findByText("saved");
    const liveRegion = status.closest('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it("ignores a pending save response after the Sui name changes", async () => {
    const firstProfile = { ...EMPTY_PROFILE, texts: { "com.twitter": "first-name" } };
    const secondProfile = {
      ...EMPTY_PROFILE,
      fullName: "second.onsui.eth",
      texts: { "com.twitter": "second-name" },
    };
    const staleSavedProfile = {
      ...EMPTY_PROFILE,
      texts: { "com.twitter": "stale-save" },
    };
    let resolvePost: (response: {
      ok: boolean;
      status: number;
      json: () => Promise<StubProfile>;
    }) => void = () => {};

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Promise((resolve) => {
            resolvePost = resolve;
          });
        }
        const profile = url.includes("second.sui") ? secondProfile : firstProfile;
        return Promise.resolve({ ok: true, status: 200, json: async () => profile });
      }),
    );

    const { rerender } = render(<RecordEditor suiName="first.sui" />);
    await screen.findByDisplayValue("first-name");
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Saving...")).toBeTruthy();

    rerender(<RecordEditor suiName="second.sui" />);
    await screen.findByDisplayValue("second-name");
    expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      resolvePost({ ok: true, status: 200, json: async () => staleSavedProfile });
    });

    expect(screen.getByDisplayValue("second-name")).toBeTruthy();
    expect(screen.queryByDisplayValue("stale-save")).toBeNull();
    expect(screen.queryByText("saved")).toBeNull();
  });

  it("refuses a second address row for a chain that already has one", async () => {
    stubRecordsFetch({
      profile: { ...EMPTY_PROFILE, addresses: { "60": ETH_ADDRESS } },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    // A new row opens on the first free chain, so it cannot clash on arrival.
    fireEvent.click(screen.getByText("+ Add address"));
    const selectors = screen.getAllByLabelText("Chain") as HTMLSelectElement[];
    expect(selectors).toHaveLength(2);
    expect(selectors[1].value).not.toBe(selectors[0].value);

    // Forcing it onto the taken chain surfaces an error and blocks the save, rather
    // than letting two rows race to define one record.
    fireEvent.change(selectors[1], { target: { value: selectors[0].value } });

    // Only the offending row is flagged; the record already saved stays clean.
    expect(await screen.findAllByText(/already has an address/)).toHaveLength(1);
    await waitFor(() =>
      expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(true),
    );
  });

  it("marks a chain already in use as unselectable", async () => {
    stubRecordsFetch({
      profile: { ...EMPTY_PROFILE, addresses: { "60": ETH_ADDRESS } },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    fireEvent.click(screen.getByText("+ Add address"));
    const selectors = screen.getAllByLabelText("Chain") as HTMLSelectElement[];
    const taken = within(selectors[1]).getByRole("option", {
      name: "Ethereum",
    }) as HTMLOptionElement;

    expect(taken.disabled).toBe(true);
  });

  it("refuses a second text row for a key that already has one", async () => {
    stubRecordsFetch({
      profile: { ...EMPTY_PROFILE, texts: { "com.discord": "alice#1" } },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    fireEvent.click(screen.getByText("+ Add text record"));
    const selectors = screen.getAllByLabelText("Text record type") as HTMLSelectElement[];
    fireEvent.change(selectors[1], { target: { value: "com.discord" } });

    expect(await screen.findAllByText(/com\.discord is already set/)).toHaveLength(1);
    await waitFor(() =>
      expect((screen.getByText("Save") as HTMLButtonElement).disabled).toBe(true),
    );
  });

  it("refuses a custom key that duplicates an existing record", async () => {
    stubRecordsFetch({
      profile: { ...EMPTY_PROFILE, texts: { "com.discord": "alice#1" } },
    });
    render(<RecordEditor suiName="happy.sui" />);
    await waitForLoaded();

    fireEvent.click(screen.getByText("+ Add text record"));
    const selectors = screen.getAllByLabelText("Text record type") as HTMLSelectElement[];
    fireEvent.change(selectors[1], { target: { value: "__custom__" } });
    fireEvent.change(screen.getByLabelText("Custom record key"), {
      target: { value: "com.discord" },
    });

    // The dropdown is not the only way in — a typed key must hit the same rule.
    expect(await screen.findAllByText(/com\.discord is already set/)).toHaveLength(1);
  });
});
