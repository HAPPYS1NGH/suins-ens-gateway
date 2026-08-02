import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sui Name Holder Demo",
  description:
    "Sign in with a Sui wallet and manage ENS records for your .sui name.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
        />
      </head>
      <body>
        <div className="glow" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
