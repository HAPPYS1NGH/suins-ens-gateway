import {
  IDENTITY_TEXT_KEYS,
  SOCIAL_TEXTS,
  cleanHandle,
  toEnsName,
  truncateAddr,
} from "../records.js";

import { CopyButton } from "./copy-button.jsx";
import {
  DiscordLogo,
  FarcasterLogo,
  GithubLogo,
  GlobeLogo,
  LinkedinLogo,
  MailLogo,
  TagLogo,
  TelegramLogo,
  XLogo,
} from "./icons/social.jsx";
import { PixelAvatar } from "./pixel-avatar.jsx";

const SOCIAL_GLYPHS = {
  "com.twitter": XLogo,
  "com.github": GithubLogo,
  "org.telegram": TelegramLogo,
  "com.discord": DiscordLogo,
  "xyz.farcaster": FarcasterLogo,
  "com.linkedin": LinkedinLogo,
  email: MailLogo,
};

export function ProfileCard({ name, avatar, contentHash, texts }) {
  const bio = texts.description?.trim() || null;
  const website = texts.url?.trim() || null;

  const socialSlots = SOCIAL_TEXTS.filter((social) => texts[social.key]?.trim()).map((social) => {
    const raw = texts[social.key].trim();
    return {
      key: social.key,
      label: social.label,
      handle: raw,
      url: social.href ? social.href(cleanHandle(raw)) : null,
    };
  });

  const extras = Object.entries(texts)
    .filter(([key, value]) => !IDENTITY_TEXT_KEYS.has(key) && value.trim())
    .sort(([a], [b]) => a.localeCompare(b));

  let chipIndex = 0;
  const hasSide = socialSlots.length > 0 || Boolean(contentHash);

  return (
    <article className="pcard" aria-labelledby="profile-name">
      <div className="pcard__identity">
        <div className="pcard__avatar">
          <PixelAvatar seed={name} size={96} face />
          {avatar ? <img className="pcard__avatar-img" src={avatar} alt={name} /> : null}
        </div>

        <div className="pcard__idmeta">
          <div className="pcard__nameline">
            <h1 className="pcard__name" id="profile-name">{name}</h1>
            <span className="pcard__badge">Name holder</span>
          </div>
          <span className="pcard__ens mono muted">{toEnsName(name)}</span>

          {bio ? <p className="pcard__bio">{bio}</p> : null}

          {website ? (
            <a className="pcard__website" href={website} target="_blank" rel="noreferrer noopener">
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

        {hasSide ? (
          <aside className="pcard__side">
            {socialSlots.length > 0 ? (
              <div className="pcard__socials" aria-label="Social records">
                {socialSlots.map((slot, index) => {
                  const Glyph = SOCIAL_GLYPHS[slot.key] ?? TagLogo;
                  const style = { "--prec-i": index };
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

            {contentHash ? (
              <AddressPill
                icon={<GlobeLogo />}
                label="Site"
                value={contentHash}
                copyLabel="Site content reference"
              />
            ) : null}
          </aside>
        ) : null}
      </div>
    </article>
  );
}

function Chip({ index, label, value, href, icon }) {
  const inner = (
    <>
      <span className="chip-rec__icon" aria-hidden="true">{icon}</span>
      <span className="chip-rec__value">{value}</span>
    </>
  );
  const style = { "--prec-i": index };

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

function AddressPill({ icon, label, value, copyLabel }) {
  return (
    <div className="pcard__pill">
      <span className="pcard__pill-mark" aria-hidden="true">
        {icon ?? <span className="pcard__dot" />}
      </span>
      <span className="pcard__pill-label">{label}</span>
      <span className="pcard__wallet mono" title={value}>
        {truncateAddr(value)}
      </span>
      <CopyButton value={value} label={copyLabel ?? `${label} address`} />
    </div>
  );
}