// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RecordEditor } from "@/components/record-editor";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RecordEditor accessibility", () => {
  it("gives the contenthash field an accessible name via its <label>", () => {
    render(<RecordEditor suiName="happy.sui" />);
    expect(screen.getByLabelText("Contenthash (IPFS CID)")).toBeTruthy();
  });

  it("gives every address row an accessible chain selector and value field", () => {
    render(<RecordEditor suiName="happy.sui" />);
    fireEvent.click(screen.getByText("+ Add address"));

    expect(screen.getByLabelText("Chain")).toBeTruthy();
    expect(screen.getByLabelText("eth address")).toBeTruthy();
  });

  it("associates an invalid address with its error via aria-describedby and role=alert", () => {
    render(<RecordEditor suiName="happy.sui" />);
    fireEvent.click(screen.getByText("+ Add address"));

    const valueInput = screen.getByLabelText("eth address") as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: "not-an-address" } });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/valid eth address/i);
    expect(valueInput.getAttribute("aria-describedby")).toBe(alert.id);
    expect(valueInput.getAttribute("aria-invalid")).toBe("true");
  });

  it("associates a reserved text key with its error via aria-describedby", () => {
    render(<RecordEditor suiName="happy.sui" />);
    fireEvent.click(screen.getByText("+ Add text record"));

    const keyInput = screen.getByLabelText("Text record key") as HTMLInputElement;
    fireEvent.change(keyInput, { target: { value: "walrus" } });

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/reserved for sui-native data/i);
    expect(keyInput.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("announces a successful save inside the aria-live status region", async () => {
    const profile = {
      fullName: "happy.onsui.eth",
      addresses: {},
      texts: {},
      contenthash: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => profile,
      }),
    );

    render(<RecordEditor suiName="happy.sui" />);
    fireEvent.click(screen.getByText("Save"));

    const status = await screen.findByText("saved");
    const liveRegion = status.closest('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });
});
