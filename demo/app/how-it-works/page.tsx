import type { Metadata } from "next";

import { FlowExplainer } from "@/components/flow-explainer";

export const metadata: Metadata = {
  title: "How it works · onsui.eth",
  description:
    "A Sui name, readable from Ethereum: wallet to ENS resolver to gateway to SuiNS.",
};

/** The root layout already supplies <main>, so this page is just its content. */
export default function HowItWorksPage() {
  return (
    <section style={{ width: "100%", display: "grid", gap: "var(--s-3)" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>
        One Sui name, read from Ethereum
      </h1>
      <FlowExplainer />
    </section>
  );
}
