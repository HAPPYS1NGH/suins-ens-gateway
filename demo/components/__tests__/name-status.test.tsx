// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NameStatus } from "@/components/name-status";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NameStatus accessibility", () => {
  it("gives the name field an accessible name via its <label>", () => {
    render(<NameStatus />);
    expect(screen.getByLabelText("SuiNS name")).toBeTruthy();
  });

  it("announces the check result inside the aria-live status region", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "owned",
          normalizedName: "happy.sui",
          nftId: "0xnft",
          expirationTimestampMs: null,
          checkedAt: new Date().toISOString(),
        }),
      }),
    );

    render(<NameStatus />);
    fireEvent.change(screen.getByLabelText("SuiNS name"), { target: { value: "happy.sui" } });
    fireEvent.click(screen.getByText("Check"));

    const chip = await screen.findByText("owned");
    const liveRegion = chip.closest('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it("associates a failed check with a role=alert error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Something broke" }),
      }),
    );

    render(<NameStatus />);
    fireEvent.change(screen.getByLabelText("SuiNS name"), { target: { value: "happy.sui" } });
    fireEvent.click(screen.getByText("Check"));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something broke");
  });
});
