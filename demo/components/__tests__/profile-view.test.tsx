// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileView } from "../profile-view";

const OWNER = "0x1111111111111111111111111111111111111111111111111111111111111111";
const ETH = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

/** SuiNS-served half of the profile; empty unless a test sets a field. */
const suins = (overrides: Partial<Parameters<typeof ProfileView>[0]["suins"]> = {}) => ({
  targetAddress: null,
  avatar: null,
  contentHash: null,
  walrusSiteId: null,
  ...overrides,
});

const profile = (overrides: Partial<Parameters<typeof ProfileView>[0]["initialProfile"]> = {}) => ({
  fullName: "alice.onsui.eth",
  addresses: { "60": ETH },
  texts: { description: "builder on sui", "com.twitter": "@alice" },
  contenthash: null,
  ...overrides,
});

beforeEach(() => {
  // The record editor fetches on mount; nothing here asserts on that response.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => profile(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProfileView", () => {
  it("renders a profile with no Namespace subname yet", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={null}
        canEdit={false}
      />,
    );

    // A name registered on Sui but never written to offchain is a normal state, not
    // an error: identity still renders and every record reads "Not set".
    expect(screen.getByRole("heading", { name: "alice.sui" })).toBeTruthy();
    expect(screen.getByText("alice.onsui.eth")).toBeTruthy();
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  });

  it("omits both pills when neither SuiNS nor Namespace has an address", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={null}
        canEdit={false}
      />,
    );

    // The Sui address is SuiNS-only and this name has no target set.
    expect(screen.queryByRole("button", { name: "Copy Sui address" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy ETH address" })).toBeNull();
  });

  it("shows the Sui address from SuiNS, never from a Namespace record", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins({ targetAddress: OWNER })}
        // A stale 784 record must not be able to displace the SuiNS target address.
        initialProfile={profile({ addresses: { "60": ETH, "784": "0xdecoy" } })}
        canEdit={false}
      />,
    );

    // The identity pill and the "From SuiNS" row, both from the SuiNS target.
    expect(screen.getAllByTitle(new RegExp(OWNER)).length).toBeGreaterThan(0);
    expect(screen.queryByText("0xdecoy")).toBeNull();
  });

  it("brands the Sui address pill with the Sui logo, not a status dot", () => {
    const { container } = render(
      <ProfileView
        name="alice.sui"
        suins={suins({ targetAddress: OWNER })}
        initialProfile={null}
        canEdit={false}
      />,
    );

    // The pill's mark slot holds an SVG (the Sui brand mark), not the bare dot.
    const mark = container.querySelector(".pcard__pill-mark");
    expect(mark).toBeTruthy();
    expect(mark?.querySelector("svg")).toBeTruthy();
  });

  it("shows the SuiNS content hash as a Site pill under the socials", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins({ contentHash: "QmHashExample1234567890abcdef" })}
        initialProfile={profile()}
        canEdit={false}
      />,
    );

    // Labelled "Site" — never the wire field name "content hash".
    expect(screen.getByText("Site")).toBeTruthy();
    expect(screen.queryByText(/content hash/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Copy Site content reference" })).toBeTruthy();
  });

  it("overlays the SuiNS avatar on the pixel avatar, not as a separate row", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins({ avatar: "https://example.com/a.png" })}
        initialProfile={profile()}
        canEdit={false}
      />,
    );

    // The avatar image renders inside the identity block.
    const img = screen.getByRole("img", { name: "alice.sui" });
    expect(img.getAttribute("src")).toBe("https://example.com/a.png");
    // It is not duplicated as a "From SuiNS" record row.
    expect(screen.queryByText("Avatar")).toBeNull();
  });

  it("shows the ETH pill from the coin-type-60 record", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile()}
        canEdit={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy ETH address" })).toBeTruthy();
    // Same value surfaces twice by design: the top pill and the Ethereum row.
    expect(screen.getAllByTitle(ETH)).toHaveLength(2);
  });

  it("hides the edit affordance from a visitor who is not the holder", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile()}
        canEdit={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /edit profile/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the editor in a modal drawer for the holder", async () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile()}
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("closes the drawer on Escape", async () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile()}
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("renders a curated text record as an outbound link", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile()}
        canEdit={false}
      />,
    );

    // Socials render as icon chips; the handle lives in the accessible name.
    const link = screen.getByRole("link", { name: "X · @alice" });
    // The leading @ is stripped for the URL but kept in the label.
    expect(link.getAttribute("href")).toBe("https://x.com/alice");
  });

  it("does not linkify a handle into another origin", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile({ texts: { "com.github": "https://evil.example/x" } })}
        canEdit={false}
      />,
    );

    const link = screen.getByRole("link", { name: "GitHub · https://evil.example/x" });
    expect(link.getAttribute("href")).toBe(
      "https://github.com/https%3A%2F%2Fevil.example%2Fx",
    );
  });

  it("keeps a text record with no glyph of its own as a chip", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile({ texts: { "com.example.custom": "kept" } })}
        canEdit={false}
      />,
    );

    // The chip shows the value; the raw key identifies it on hover.
    expect(screen.getByText("kept")).toBeTruthy();
    expect(screen.getByTitle("com.example.custom: kept")).toBeTruthy();
  });

  it("shows an unlinkable social as an icon chip without a link", () => {
    render(
      <ProfileView
        name="alice.sui"
        suins={suins()}
        initialProfile={profile({ texts: { "com.discord": "alice#1" } })}
        canEdit={false}
      />,
    );

    // Discord has no universal profile URL, so the icon must not pretend to be one.
    // The handle is surfaced via the title/aria-label, not as link text.
    expect(screen.getByTitle("Discord · alice#1")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /alice#1/ })).toBeNull();
  });
});
