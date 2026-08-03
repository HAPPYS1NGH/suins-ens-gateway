import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfileView } from "@/components/profile-view";
import { getCurrentSession } from "@/lib/auth/session";
import { readProfile, toEnsFullName } from "@/lib/namespace/upsert";
import { labelOf, toEnsName } from "@/lib/records";
import { resolveNameOwner } from "@/lib/suins/ownership";
import { readSuinsProfile } from "@/lib/suins/profile";

export const dynamic = "force-dynamic";

/**
 * Labels that would otherwise be shadowed by this catch-all route. `api` and `_next`
 * are matched by Next before this route, but listing them keeps the guard honest if
 * routing ever changes.
 */
const RESERVED_LABELS = new Set(["api", "_next", "favicon.ico", "robots.txt"]);

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const label = labelOf(decodeURIComponent((await params).name));
  return {
    title: `${label}.sui — Sui Name Holder Demo`,
    description: `ENS records for ${label}.sui, resolvable at ${toEnsName(label)}.`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const raw = decodeURIComponent((await params).name);
  const label = labelOf(raw);

  if (!label || RESERVED_LABELS.has(label)) notFound();
  // `/Alice` and `/alice.sui` both name one profile; send them to the canonical URL
  // so links, caches and copy-paste all agree on it.
  if (label !== raw) redirect(`/${encodeURIComponent(label)}`);

  const suiName = `${label}.sui`;
  const owner = await resolveNameOwner(suiName);

  if (owner.status === "rpc-unavailable") {
    // A transient Sui outage is not a missing name. Say so instead of rendering a 404
    // that tells a holder their name is gone.
    return (
      <section className="panel" aria-labelledby="unavailable-title">
        <h1 className="panel-title" id="unavailable-title">
          Cannot reach Sui right now
        </h1>
        <p className="mono muted">
          {suiName} could not be looked up. This is temporary — reload in a moment.
        </p>
      </section>
    );
  }

  if (owner.status !== "owned") notFound();

  const session = await getCurrentSession();
  const [profile, suins] = await Promise.all([
    readProfile(toEnsFullName(owner.normalizedName)),
    readSuinsProfile(owner.normalizedName),
  ]);

  return (
    <ProfileView
      name={owner.normalizedName}
      initialProfile={profile}
      suins={suins}
      // Gates the edit button only. Every write re-derives this server-side against
      // the current NFT owner, so a stale or forged `canEdit` cannot authorize one.
      canEdit={
        Boolean(session) &&
        normalizeSuiAddress(session!.suiAddress) === owner.ownerAddress
      }
    />
  );
}
