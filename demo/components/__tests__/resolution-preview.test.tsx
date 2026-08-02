// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResolutionPreview } from "@/components/resolution-preview";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ResolutionPreview", () => {
  it("labels resolution lag instead of hiding it, and announces results via aria-live", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          profile: {
            fullName: "happy.onsui.eth",
            addresses: { "60": "0xabc" },
            texts: { "com.twitter": "happy" },
            contenthash: null,
          },
          preview: {
            ensName: "happy.onsui.eth",
            resolvedAt: new Date().toISOString(),
            ethAddress: { status: "empty", value: null },
            suiAddress: { status: "resolved", value: "0xsui" },
            texts: { "com.twitter": { status: "empty", value: null } },
            contenthash: { status: "empty", value: null },
          },
        }),
      }),
    );

    render(<ResolutionPreview suiName="happy.sui" />);

    expect(screen.getByText(/propagation lag|lag briefly/i)).toBeTruthy();

    const savedEth = await screen.findByText(/saved: 0xabc/);
    const liveRegion = savedEth.closest('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(screen.getAllByText(/resolved: not resolvable yet/).length).toBeGreaterThan(0);
  });
});
