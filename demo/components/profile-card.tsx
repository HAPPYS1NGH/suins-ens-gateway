"use client";

import {
  IDENTITY_TEXT_KEYS,
  SOCIAL_TEXTS,
  cleanHandle,
  toEnsName,
  truncateAddr,
} from "@/lib/records";

import { CopyButton } from "./copy-button";
import {
  DiscordLogo,
  FarcasterLogo,
  GithubLogo,
  LinkedinLogo,
  MailLogo,
  PencilIcon,
  TagLogo,
  TelegramLogo,
  XLogo,
} from "./icons/social";
import { PixelAvatar } from "./pixel-avatar";

interface ProfileCardProps {
  /** SuiNS name, e.g. `alice.sui`. */
  name: string;
  /** SuiNS target address for the name — read from Sui, `null` when unset. */
  suiAddress: string | null;
  /** The `60` address record, when the holder has set one. */
  ethAddress: string | null;
  /** SuiNS avatar image URL — overlaid on the pixel avatar when set. */
  avatar: string | null;
  texts: Record<string, string>;
  canEdit: boolean;
  onEdit: () => void;
}

const SOCIAL_GLYPHS: Record<string, typeof XLogo> = {
  "com.twitter": XLogo,
  "com.github": GithubLogo,
  "org.telegram": TelegramLogo,
  "com.discord": DiscordLogo,
  "xyz.farcaster": FarcasterLogo,
  "com.linkedin": LinkedinLogo,
  email: MailLogo,
};

/**
 * Identity block: who this name is, the two addresses worth surfacing above the fold,
 * and every text record as a chip. The green dot marks a present address, not a
 * verified one — the Sui address comes from SuiNS, the ETH address is an ENS record.
 */
export function ProfileCard({
  name,
  suiAddress,
  ethAddress,
  avatar,
  texts,
  canEdit,
  onEdit,
}: ProfileCardProps) {
  const bio = texts.description?.trim() || null;
  const website = texts.url?.trim() || null;

  // Social records render as icon chips — linkable handles open the profile URL,
  // Discord (no safe universal URL) shows as a non-navigation record, anything
  // unset is dropped. Labels live in the title/aria-label, not on the face.
  const socialSlots = SOCIAL_TEXTS.filter((social) => texts[social.key]?.trim()).map((social) => {
    const raw = texts[social.key].trim();
    return {
      key: social.key,
      label: social.label,
      handle: raw,
      url: social.href ? social.href(cleanHandle(raw)) : null,
    };
  });

  // Anything the holder wrote that the identity block does not render itself still
  // gets a chip, under its raw key, rather than being silently dropped.
  const extras = Object.entries(texts)
    .filter(([key, value]) => !IDENTITY_TEXT_KEYS.has(key) && value.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  let chipIndex = 0;

  return (
    <article className="pcard" aria-labelledby="profile-name">
      {canEdit ? (
        <button type="button" className="pcard__edit" onClick={onEdit}>
          <PencilIcon />
          Edit profile
        </button>
      ) : null}

      <div className="pcard__identity">
        <div className="pcard__avatar">
          <PixelAvatar seed={name} size={96} face />
          {avatar ? (
            <img className="pcard__avatar-img" src={avatar} alt={name} />
          ) : null}
        </div>

        <div className="pcard__idmeta">
          <div className="pcard__nameline">
            <h1 className="pcard__name" id="profile-name">
              {name}
            </h1>
            <span className="pcard__badge">Name holder</span>
          </div>
          <span className="pcard__ens mono muted">{toEnsName(name)}</span>

          <div className="pcard__pills">
            {suiAddress ? <AddressPill label="Sui" value={suiAddress} /> : null}
            {ethAddress ? <AddressPill label="ETH" value={ethAddress} /> : null}
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

          {extras.length > 0 ? (
            <div className="pcard__chips">
              {extras.map(([key, value]) => (
                <Chip
                  key={key}
                  index={chipIndex++}
                  label={key}
                  value={value.trim()}
                  href={null}
                  icon={<TagLogo />}
                />
              ))}
            </div>
          ) : null}
        </div>

        {socialSlots.length > 0 ? (
          <div className="pcard__socials" aria-label="Social records">
            {socialSlots.map((slot, index) => {
              const Glyph = SOCIAL_GLYPHS[slot.key] ?? TagLogo;
              const style = { "--prec-i": index } as React.CSSProperties;
              const label = `${slot.label} · ${slot.handle}`;
              if (slot.url) {
                return (
                  <a
                    key={slot.key}
                    className="pcard__social"
                    style={style}
                    href={slot.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    title={label}
                  >
                    <Glyph />
                  </a>
                );
              }
              return (
                <span
                  key={slot.key}
                  className="pcard__social"
                  style={style}
                  aria-label={label}
                  title={label}
                >
                  <Glyph />
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Chip({
  index,
  label,
  value,
  href,
  icon,
}: {
  index: number;
  label: string;
  value: string;
  href: string | null;
  icon: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="chip-rec__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="chip-rec__value">{value}</span>
    </>
  );
  const style = { "--prec-i": index } as React.CSSProperties;

  return href ? (
    <a
      className="chip-rec chip-rec--link"
      style={style}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      title={`${label}: ${value}`}
    >
      {inner}
    </a>
  ) : (
    <span className="chip-rec" style={style} title={`${label}: ${value}`}>
      {inner}
    </span>
  );
}

function AddressPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="pcard__pill">
      <span className="pcard__dot" aria-hidden="true" />
      <span className="pcard__pill-label">{label}</span>
      <span className="pcard__wallet mono" title={value}>
        {truncateAddr(value)}
      </span>
      <CopyButton value={value} label={`${label} address`} />
    </div>
  );
}
