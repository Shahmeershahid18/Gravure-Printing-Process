import * as React from "react"
import Link from "next/link"
import { getSessionProfile, landingFor } from "@/lib/auth"
import { Mark } from "@/components/brand/Logo"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { CTA } from "@/components/landing/Pieces"
import { cn } from "@/lib/utils"

/**
 * Shared chrome for every page a signed-out visitor can reach.
 *
 * The header, the footer and the ink rule are identical across the landing
 * page, the guides and the policies, so a reader never loses the thread when
 * they follow a link out of one and into another.
 */

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#inside", label: "What's inside" },
  { href: "/guide", label: "Guides" },
]

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
]

/**
 * The cap on a feature card.
 *
 * This was a strip of the eight station inks, which looked good in exactly one
 * theme. Measured against the card surface, yellow sits at 1.35:1 and white at
 * 1.00:1 on the light card, and black at 1.02:1 on the dark one -- two of the
 * eight segments are invisible whichever theme you are in, so the rule renders
 * as a stripe with holes in it.
 *
 * It was also decoration made out of data colour, which is the one thing plan
 * Section 4.1 forbids: teach a reader that those eight colours identify print
 * stations and then use them as a flourish, and they mean nothing. The accent
 * is the colour that is allowed to be ornamental, so the accent does the job.
 */
export function CardCap({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("h-[3px] w-full bg-accent", className)} />
}

export async function PublicHeader() {
  const profile = await getSessionProfile()
  const home = profile ? landingFor(profile.role) : "/login"

  return (
    <header className="sticky top-0 z-40 border-b border-steel-200 bg-paper-000/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          aria-label="Intaglio home"
          className="-my-2 flex min-h-[var(--tap)] shrink-0 items-center gap-2.5 py-2"
        >
          <Mark size={28} />
          <span className="text-[length:calc(var(--base)*1.15)] font-semibold tracking-tight text-ink-900">
            Intaglio
          </span>
        </Link>

        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="rounded-[var(--radius)] px-3 py-2 text-[length:calc(var(--base)*0.9)] text-ink-600 transition-colors hover:bg-paper-100 hover:text-ink-900"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden md:inline-flex" />
          {/* Guides is the one nav item worth keeping on a phone: it is the
              only link that leads somewhere rather than down the page. */}
          <Link
            href="/guide"
            className="rounded-[var(--radius)] px-2 py-2 text-[length:calc(var(--base)*0.9)] text-ink-600 transition-colors hover:text-ink-900 lg:hidden"
          >
            Guides
          </Link>
          <CTA href={home} primary>
            {profile ? "Open the app" : "Sign in"}
          </CTA>
        </div>
      </div>

      {/* Read progress on the landing page; inert everywhere else. */}
      <div
        data-scroll-progress=""
        aria-hidden="true"
        className="h-px origin-left scale-x-0 bg-accent"
      />
    </header>
  )
}

export async function PublicFooter() {
  const profile = await getSessionProfile()
  const home = profile ? landingFor(profile.role) : "/login"

  return (
    <footer className="mt-8 border-t border-steel-200">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="-my-2 inline-flex min-h-[var(--tap)] items-center gap-2.5 py-2">
              <Mark size={24} />
              <span className="font-semibold tracking-tight text-ink-900">Intaglio</span>
            </Link>
            <p className="mt-3 text-[length:calc(var(--base)*0.86)] leading-relaxed text-steel-400">
              The memory of a gravure printing press.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14">
            <nav aria-label="Learn">
              <h2 className="text-[length:calc(var(--base)*0.75)] font-semibold uppercase tracking-wide text-steel-400">
                Learn
              </h2>
              <ul className="mt-1 text-[length:calc(var(--base)*0.9)]">
                <li>
                  <Link href="/guide" className="flex min-h-[var(--tap)] items-center text-ink-600 transition-colors hover:text-ink-900">
                    All guides
                  </Link>
                </li>
                <li>
                  <Link href="/guide/getting-started" className="flex min-h-[var(--tap)] items-center text-ink-600 transition-colors hover:text-ink-900">
                    Getting started
                  </Link>
                </li>
                <li>
                  <Link href="/guide/words" className="flex min-h-[var(--tap)] items-center text-ink-600 transition-colors hover:text-ink-900">
                    Glossary
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <h2 className="text-[length:calc(var(--base)*0.75)] font-semibold uppercase tracking-wide text-steel-400">
                Legal
              </h2>
              <ul className="mt-1 text-[length:calc(var(--base)*0.9)]">
                {LEGAL.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex min-h-[var(--tap)] items-center text-ink-600 transition-colors hover:text-ink-900">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-steel-200 pt-6 text-[length:calc(var(--base)*0.82)] text-steel-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Gravure print traceability.</span>
          <div className="flex items-center gap-4">
            <ThemeToggle className="md:hidden" />
            <Link href={home} className="inline-flex min-h-[var(--tap)] items-center transition-colors hover:text-ink-900">
              {profile ? "Open the app" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
