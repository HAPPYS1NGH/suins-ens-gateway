/** Single-path glyphs sized to sit on the 18px social row. Ported from the demo. */
const glyph = (props) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  ...props,
});

export const XLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M18.2 3h3.3l-7.2 8.2L23 21h-6.6l-5.2-6.8L5.3 21H2l7.7-8.8L1.7 3h6.8l4.7 6.2L18.2 3zm-1.2 16h1.8L7.1 4.9H5.2L17 19z" />
  </svg>
);

export const GithubLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
  </svg>
);

export const TelegramLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M21.8 4.3 18.4 20c-.25 1.1-.9 1.38-1.84.86l-5.08-3.75-2.45 2.36c-.27.27-.5.5-1 .5l.36-5.1 9.3-8.4c.4-.36-.09-.56-.63-.2L5.2 13.02l-4.96-1.55c-1.08-.34-1.1-1.08.23-1.6L20.4 2.7c.9-.33 1.68.2 1.4 1.6z" />
  </svg>
);

export const DiscordLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M19.3 5.6A16 16 0 0 0 15.3 4.4l-.2.4a12 12 0 0 1 3.5 1.8 13.7 13.7 0 0 0-11.4 0 12 12 0 0 1 3.5-1.8l-.2-.4A16 16 0 0 0 4.7 5.6 16.7 16.7 0 0 0 2 17.4a16 16 0 0 0 4.9 2.5l.6-1a10.6 10.6 0 0 1-1.7-.8l.4-.3a11.4 11.4 0 0 0 9.7 0l.4.3c-.5.3-1.1.6-1.7.8l.6 1a16 16 0 0 0 4.9-2.5 16.7 16.7 0 0 0-2.7-11.8zM9.3 15c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm5.4 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z" />
  </svg>
);

export const FarcasterLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M5 4h14v2.4h-1.6v11.2H19V20h-4.7v-2.4h1.4V9.4c0-2.2-1.7-3.8-3.7-3.8S8.3 7.2 8.3 9.4v8.2h1.4V20H5v-2.4h1.6V6.4H5V4z" />
  </svg>
);

export const LinkedinLogo = (props) => (
  <svg {...glyph(props)}>
    <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3V9zm6 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.76-1.95C20.4 8.75 21 11 21 14v7h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.27V21H9V9z" />
  </svg>
);

export const MailLogo = (props) => (
  <svg {...glyph({ fill: "none", stroke: "currentColor", strokeWidth: 1.8, ...props })}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GlobeLogo = (props) => (
  <svg {...glyph({ fill: "none", stroke: "currentColor", strokeWidth: 1.8, ...props })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
  </svg>
);

/** Fallback for a custom text record with no glyph of its own. */
export const TagLogo = (props) => (
  <svg {...glyph({ fill: "none", stroke: "currentColor", strokeWidth: 1.8, ...props })}>
    <path
      d="M3 12.5V4.5A1.5 1.5 0 0 1 4.5 3h8l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-7.4 7.4a1.5 1.5 0 0 1-2.1 0z"
      strokeLinejoin="round"
    />
    <circle cx="7.75" cy="7.75" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);

export const PencilIcon = (props) => (
  <svg {...glyph({ width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.8, ...props })}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" strokeLinejoin="round" />
    <path d="m13.5 6.5 3 3" strokeLinecap="round" />
  </svg>
);