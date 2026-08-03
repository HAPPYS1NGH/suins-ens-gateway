"use client";

import { CopyButton } from "./copy-button";
import { PixelAvatar } from "./pixel-avatar";

interface ProfileCardProps {
  name: string;
  imageUrl: string | null;
  suiAddress: string;
  texts?: Record<string, string>;
}

function truncateAddr(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const SOCIALS: { key: string; label: string; glyph: string }[] = [
  { key: "com.twitter", label: "Twitter / X", glyph: "X" },
  { key: "com.github", label: "GitHub", glyph: "GH" },
  { key: "com.discord", label: "Discord", glyph: "DC" },
  { key: "org.telegram", label: "Telegram", glyph: "TG" },
  { key: "email", label: "Email", glyph: "@" },
];

export function ProfileCard({ name, imageUrl, suiAddress, texts }: ProfileCardProps) {
  const ensName = name.replace(/\.sui$/, "");
  const fullEnsName = `${ensName}.onsui.eth`;
  const record = texts ?? {};

  const bio = record.description?.trim() || null;
  const website = record.url?.trim() || null;
  const socials = SOCIALS.filter((social) => record[social.key]?.trim());
  const email = record.email?.trim();

  return (
    <article className="pcard" aria-labelledby="profile-name">
      <div className="pcard__cover" aria-hidden="true">
        <div className="pcard__cover-motif" />
      </div>

      <div className="pcard__body">
        <div className="pcard__identity">
          <div className="pcard__avatar">
            {imageUrl ? (
              <img src={imageUrl} alt={name} width={112} height={112} />
            ) : (
              <PixelAvatar seed={name} size={112} face />
            )}
          </div>

          <div className="pcard__idmeta">
            <div className="pcard__nameline">
              <h1 className="pcard__name" id="profile-name">
                {name}
              </h1>
              <span className="pcard__badge">Name holder</span>
            </div>
            <span className="pcard__ens mono muted">{fullEnsName}</span>
            <div className="pcard__pill">
              <span className="pcard__dot" aria-hidden="true" />
              <span className="pcard__wallet mono" title={suiAddress}>
                {truncateAddr(suiAddress)}
              </span>
              <CopyButton value={suiAddress} label="Sui wallet address" />
            </div>
            {bio ? <p className="pcard__bio">{bio}</p> : null}
            {website ? (
              <a
                className="pcard__website"
                href={website}
                target="_blank"
                rel="noreferrer noopener"
              >
                {website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </div>

          {socials.length > 0 || email ? (
            <div className="pcard__socials">
              {socials.map((social) => (
                <a
                  key={social.key}
                  className="pcard__social"
                  href={socialHref(social.key, record[social.key])}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={social.label}
                >
                  {social.glyph}
                </a>
              ))}
              {email ? (
                <a
                  className="pcard__social"
                  href={`mailto:${email}`}
                  title="Email"
                >
                  @
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function socialHref(key: string, value: string): string {
  const handle = value.replace(/^@/, "");
  switch (key) {
    case "com.twitter":
      return `https://x.com/${handle}`;
    case "com.github":
      return `https://github.com/${handle}`;
    case "org.telegram":
      return `https://t.me/${handle}`;
    default:
      return value;
  }
}