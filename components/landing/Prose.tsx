import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CardCap } from "./Chrome"

/**
 * Typography for the long-form public pages -- guides and policies.
 *
 * Measure is capped near 68 characters. A policy nobody can read is a policy
 * nobody has read, and full-width body text on a laptop is how that happens.
 */

export function DocHeader({
  eyebrow,
  title,
  lede,
  meta,
}: {
  eyebrow: string
  title: string
  lede?: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <header className="border-b border-steel-200 pb-8">
      <p className="flex items-center gap-2 text-[length:calc(var(--base)*0.78)] font-semibold uppercase tracking-[0.12em] text-accent">
        <span aria-hidden="true" className="h-px w-6 bg-accent" />
        {eyebrow}
      </p>
      <h1 className="mt-3 text-[length:clamp(1.9rem,4.5vw,2.8rem)] font-semibold leading-[1.1] tracking-tight text-ink-900">
        {title}
      </h1>
      {lede && (
        <p className="mt-4 max-w-2xl text-[length:calc(var(--base)*1.12)] leading-relaxed text-ink-600">
          {lede}
        </p>
      )}
      {meta && (
        <p className="mt-5 text-[length:calc(var(--base)*0.85)] text-steel-400">{meta}</p>
      )}
    </header>
  )
}

/**
 * A page of prose.
 *
 * Two containers rather than one centred column: the outer matches the header
 * and footer, so the text starts under the wordmark instead of floating in the
 * middle of a wide screen, and the inner caps the measure for reading.
 */
export function Doc({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className={cn("max-w-3xl", className)}>{children}</div>
    </main>
  )
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-20 text-[length:clamp(1.25rem,2.5vw,1.55rem)] font-semibold tracking-tight text-ink-900"
    >
      {children}
    </h2>
  )
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-7 text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
      {children}
    </h3>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 leading-relaxed text-ink-600">{children}</p>
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 space-y-2.5">{children}</ul>
}

export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed text-ink-600">
      <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-steel-400" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** A numbered procedure. */
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-5 space-y-3">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3.5 leading-relaxed text-ink-600">
          <span
            data-numeric=""
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-steel-200 bg-paper-000 text-[length:calc(var(--base)*0.78)] text-ink-900"
          >
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5">{s}</span>
        </li>
      ))}
    </ol>
  )
}

/** Term and meaning, stacked on a phone and side by side above it. */
export function Definitions({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-5 divide-y divide-steel-200 border-y border-steel-200">
      {items.map(([term, meaning]) => (
        <div key={term} className="py-3.5 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-5">
          <dt className="font-semibold text-ink-900">{term}</dt>
          <dd className="mt-1 leading-relaxed text-ink-600 sm:mt-0">{meaning}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn"
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mt-6 rounded-[var(--radius)] border-l-2 py-4 pl-5 pr-4",
        tone === "warn"
          ? "border-l-signal-warn bg-signal-warn-bg"
          : "border-l-signal-info bg-signal-info-bg"
      )}
    >
      <p className="flex items-center gap-2 font-semibold text-ink-900">
        <span
          aria-hidden="true"
          className={tone === "warn" ? "text-signal-warn" : "text-signal-info"}
        >
          {tone === "warn" ? "▲" : "◆"}
        </span>
        {title}
      </p>
      <div className="mt-1.5 leading-relaxed text-ink-600">{children}</div>
    </div>
  )
}

/** Cross-links at the foot of a document. */
export function SeeAlso({ links }: { links: { href: string; label: string }[] }) {
  if (links.length === 0) return null
  return (
    <nav aria-label="See also" className="mt-14 border-t border-steel-200 pt-6">
      <h2 className="text-[length:calc(var(--base)*0.75)] font-semibold uppercase tracking-wide text-steel-400">
        See also
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 text-[length:calc(var(--base)*0.9)] text-ink-900 transition-colors hover:border-accent hover:text-accent"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The banner on the policy pages.
 *
 * These are a starting point written to describe what the software actually
 * does, not legal advice, and saying so on the page is more honest than a
 * disclaimer buried at the bottom.
 */
export function DraftNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-000">
      <CardCap />
      <div className="p-5">
        <p className="font-semibold text-ink-900">Before you publish this page</p>
        <div className="mt-2 leading-relaxed text-ink-600">{children}</div>
      </div>
    </div>
  )
}
