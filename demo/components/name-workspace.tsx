"use client";

import { useState } from "react";

import { NameStatus } from "@/components/name-status";
import { RecordEditor } from "@/components/record-editor";
import { ResolutionPreview } from "@/components/resolution-preview";

/**
 * Holds the one name both panels agree on. `RecordEditor` and `ResolutionPreview`
 * only ever mount once `NameStatus` has confirmed ownership, and always for exactly
 * that normalized name — there is no second, independently typed name field to
 * drift out of sync.
 */
export function NameWorkspace() {
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  return (
    <>
      <NameStatus onVerified={setVerifiedName} />
      {verifiedName ? (
        <>
          <RecordEditor suiName={verifiedName} />
          <ResolutionPreview suiName={verifiedName} />
        </>
      ) : null}
    </>
  );
}
