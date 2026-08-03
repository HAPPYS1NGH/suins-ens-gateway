"use client";

import { useState } from "react";

import type { SuiName } from "./name-grid";
import { ProfileCard } from "./profile-card";
import { RecordEditor, type RecordProfile } from "./record-editor";
import { ResolutionPreview } from "./resolution-preview";

interface ProfilePanelProps {
  name: SuiName;
  suiAddress: string;
  onBack: () => void;
}

export function ProfilePanel({ name, suiAddress, onBack }: ProfilePanelProps) {
  const [profile, setProfile] = useState<RecordProfile | null>(null);

  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn-secondary" onClick={onBack}>
          &larr; Back to names
        </button>
      </div>

      <ProfileCard
        name={name.name}
        imageUrl={name.imageUrl}
        suiAddress={suiAddress}
        texts={profile?.texts}
      />

      <RecordEditor
        suiName={name.name}
        suiAvatar={name.avatar}
        onProfileChange={setProfile}
      />

      <ResolutionPreview suiName={name.name} />
    </>
  );
}
