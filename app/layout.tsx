import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import { THEME_SCRIPT } from "@/lib/theme"
import "./globals.css"

/**
 * Two weights exist in the whole product -- plan Section 4.2. Loading only 400
 * and 600 makes the rule physically true rather than a convention someone can
 * break with a font-bold.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Intaglio",
    template: "%s · Intaglio",
  },
  description:
    "Intaglio is the memory of a gravure press: job files, run records, the eight station grid, cylinder life and the pre run briefing.",
  applicationName: "Intaglio",
  // Nothing here should describe the shape of the application to a crawler.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The kiosk is a fixed tablet install; pinch-zooming it mid-shift only ever
  // strands the operator on a zoomed corner of the station grid.
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0F12" },
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minted per request by the middleware. The Content-Security-Policy names
  // this nonce, so an injected <script> without it will not run.
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        {/* Runs before first paint, so the app never flashes the light palette
            on the way to the dark one. See lib/theme.ts.

            suppressHydrationWarning is required, not papering over a bug. The
            HTML spec has the browser blank the nonce *content attribute* as
            soon as the element is processed -- otherwise a CSS attribute
            selector could exfiltrate the nonce and defeat the policy. The
            value survives on the element's .nonce property, which is what the
            browser actually enforces against. So the server sends
            nonce="xpA4…" and the DOM hydrates as nonce="", and no amount of
            correctness on our side can make those two strings match. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
