"use client";

import { useCallback, useState } from "react";

import { AddressRecords } from "./address-records";
import { EditDrawer } from "./edit-drawer";
import { PencilIcon } from "./icons/social";
import { ProfileCard } from "./profile-card";
import { RecordEditor, type RecordProfile } from "./record-editor";
import { SuinsRecords, type SuinsRecordsProps } from "./suins-records";

interface ProfileViewProps {
  /** SuiNS name, e.g. `alice.sui`. */
  name: string;
  /**
   * Namespace records at page load. `null` means the name exists on Sui but has no
   * offchain subname yet — a normal, editable state, not an error.
   */
  initialProfile: RecordProfile | null;
  /** The SuiNS-served half of the profile, read from Sui on the server. Read-only. */
  suins: SuinsRecordsProps;
  /** UI gating only; every write is re-authorized server-side against the NFT owner. */
  canEdit: boolean;
}

/** ENSIP-11 coin type for Ethereum, the key Namespace returns `eth` addresses under. */
const ETH_COIN_TYPE = "60";

export function ProfileView({ name, initialProfile, suins, canEdit }: ProfileViewProps) {
  const [profile, setProfile] = useState<RecordProfile | null>(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const texts = profile?.texts ?? {};
  const addresses = profile?.addresses ?? {};

  // Only adopt an editor read once it has something; its initial `null` on mount
  // would otherwise blank a profile the server already rendered.
  const onProfileChange = useCallback((next: RecordProfile | null) => {
    if (next) setProfile(next);
  }, []);

  return (
    <>
      {canEdit ? (
        // Sits above the card rather than absolute-positioned over it, so it never
        // collides with the social chips on the right of the identity block.
        <div className="profile__topbar">
          <button type="button" className="profile__edit" onClick={() => setEditing(true)}>
            <PencilIcon />
            Edit profile
          </button>
        </div>
      ) : null}

      <ProfileCard
        name={name}
        suiAddress={suins.targetAddress}
        ethAddress={addresses[ETH_COIN_TYPE] ?? null}
        avatar={suins.avatar}
        contentHash={suins.contentHash}
        texts={texts}
      />

      <AddressRecords addresses={addresses} />

      <SuinsRecords {...suins} />

      {canEdit ? (
        <EditDrawer
          open={editing}
          title="Edit profile"
          subtitle={name}
          busy={saving}
          onClose={() => setEditing(false)}
        >
          <RecordEditor
            suiName={name}
            suiAvatar={suins.avatar}
            onProfileChange={onProfileChange}
            onBusyChange={setSaving}
            onSaved={() => setEditing(false)}
          />
        </EditDrawer>
      ) : null}
    </>
  );
}