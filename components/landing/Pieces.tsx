import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Building blocks for the public landing page.
 *
 * The page sells a shop-floor tool, so it stays inside the product's own rules
 * (plan Section 4.1): achromatic chrome, hairlines instead of shadows, one
 * radius. The only saturated colour is the eight station inks in the press
 * diagram, where they are data about the machine, plus the copper accent that
 * carries the brand.
 *
 * `data-reveal` marks an element for the GSAP entrance in Motion.tsx. It is
 * inert without it -- see the safeguards there.
 */

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  lede?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-steel-200 py-16">
      <div data-reveal="block">
        <p className="flex items-center gap-2 text-[length:calc(var(--base)*0.78)] font-semibold uppercase tracking-[0.12em] text-accent">
          <span aria-hidden="true" className="h-px w-6 bg-accent" />
          {eyebrow}
        </p>
        <h2 className="mt-3 text-[length:clamp(1.5rem,3vw,2.05rem)] font-semibold tracking-tight text-ink-900">
          {title}
        </h2>
        {lede && (
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{lede}</p>
        )}
      </div>
      <div className="mt-9">{children}</div>
    </section>
  )
}

/**
 * One capability. A name and a single sentence -- no more.
 *
 * With `href` the whole tile becomes the link to that feature's guide, so the
 * target is the card rather than a "learn more" tail nobody aims at on a
 * phone.
 */
export function Tile({
  name,
  where,
  href,
  children,
}: {
  name: string
  where: string
  href?: string
  children: React.ReactNode
}) {
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-ink-900 group-hover:text-accent">{name}</h3>
        <span className="shrink-0 rounded-full border border-steel-200 px-2 py-0.5 text-[length:calc(var(--base)*0.72)] uppercase tracking-wide text-steel-400">
          {where}
        </span>
      </div>
      <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
        {children}
      </p>
    </>
  )

  const shell = "group block border-t border-steel-200 pt-4 transition-colors hover:border-accent"

  return href ? (
    <Link href={href} data-reveal="block" className={shell}>
      {body}
    </Link>
  ) : (
    <div data-reveal="block" className={shell}>
      {body}
    </div>
  )
}

/** A stage in the loop, numbered so the sequence is unmissable. */
export function Step({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li data-reveal="block" className="border-t-2 border-ink-900 pt-4">
      <span
        data-numeric=""
        className="text-[length:calc(var(--base)*0.78)] font-semibold text-accent"
      >
        0{n}
      </span>
      <h3 className="mt-1 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-[length:calc(var(--base)*0.95)] leading-relaxed text-ink-600">
        {children}
      </p>
    </li>
  )
}

export function CTA({
  href,
  children,
  primary,
  className,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[var(--tap)] items-center justify-center rounded-[var(--radius)] border px-5 font-semibold transition-colors",
        primary
          ? "border-ink-900 bg-ink-900 text-paper-000 hover:border-accent hover:bg-accent hover:text-accent-fg"
          : "border-steel-200 bg-paper-000 text-ink-900 hover:border-accent hover:text-accent",
        className
      )}
    >
      {children}
    </Link>
  )
}
