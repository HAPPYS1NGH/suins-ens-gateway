"use client";

import { useState } from "react";

import { NameStatus } from "@/components/name-status";
import { RecordEditor } from "@/components/record-editor";

/**
 * Holds the one name both panels agree on. `RecordEditor` only ever mounts once
 * `NameStatus` has confirmed ownership, and always for exactly that normalized
 * name — there is no second, independently typed name field to drift out of sync.
 */
export function NameWorkspace() {
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  return (
    <>
      <NameStatus onVerified={setVerifiedName} />
      {verifiedName ? <RecordEditor suiName={verifiedName} /> : null}
    </>
  );
}
