import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Four type sizes per screen -- Section 4.4, rule 3. The page header owns the
 * largest one, so a page body never needs to compete with it.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-[length:calc(var(--base)*0.86)] text-ink-600">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden="true" className="text-steel-400">
                    /
                  </span>
                )}
                {b.href ? (
                  <Link href={b.href} className="hover:text-ink-900 hover:underline">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-900">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[length:calc(var(--base)*1.6)] font-semibold tracking-tight text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[length:calc(var(--base)*0.92)] text-ink-600">
              {subtitle}
            </p>
          )}
        </div>
        {/* One primary action per screen -- Section 4.4, rule 1. */}
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}

export function SectionHeading({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-4", className)}>
      <h2 className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
        {children}
      </h2>
      {action}
    </div>
  )
}
