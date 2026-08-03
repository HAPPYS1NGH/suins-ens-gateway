import type { Metadata } from "next";

import { FlowExplainer } from "@/components/flow-explainer";

export const metadata: Metadata = {
  title: "How it works · onsui.eth",
  description:
    "A Sui name, readable from Ethereum: wallet to ENS resolver to gateway to SuiNS.",
};

export default function HowItWorksPage() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "var(--s-6) var(--s-3)",
        display: "grid",
        gap: "var(--s-3)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>One Sui name, read from Ethereum</h1>
      <FlowExplainer />
    </main>
  );
}
