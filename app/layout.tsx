import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
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
    default: "GravureTrace",
    template: "%s · GravureTrace",
  },
  description:
    "Gravure print traceability: job files, runs, the 8 station grid, cylinder life and the pre run briefing.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The kiosk is a fixed tablet install; pinch-zooming it mid-shift only ever
  // strands the operator on a zoomed corner of the station grid.
  maximumScale: 1,
  themeColor: "#14161A",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
