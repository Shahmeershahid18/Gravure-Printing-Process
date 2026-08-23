"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Wordmark as BrandWordmark } from "@/components/brand/Logo"
import type { Role } from "@/lib/roles"

type Item = { href: string; label: string; roles?: Role[] }
type Group = { heading: string; items: Item[] }

/**
 * Navigation is grouped the way the shop thinks, not the way the schema is
 * laid out: what is running now, what the job is, what the plant owns, and
 * what management asks about.
 *
 * Items a role cannot use are removed, not disabled. A disabled row still
 * costs a scan on every visit and teaches nothing.
 */
const GROUPS: Group[] = [
  {
    heading: "Floor",
    items: [
      { href: "/dashboard", label: "Dashboard", roles: ["admin", "qc", "viewer", "supervisor", "planner"] },
      { href: "/shift", label: "Shift board", roles: ["admin", "supervisor", "planner", "qc"] },
      { href: "/runs", label: "Runs" },
    ],
  },
  {
    heading: "Work",
    items: [
      { href: "/jobs", label: "Job files" },
      { href: "/issues", label: "Issues" },
    ],
  },
  {
    heading: "Plant",
    items: [
      { href: "/cylinders", label: "Cylinders" },
      { href: "/inks", label: "Inks" },
      { href: "/substrates", label: "Substrates" },
    ],
  },
  {
    heading: "Insight",
    items: [{ href: "/reports", label: "Reports" }],
  },
  {
    heading: "Setup",
    items: [
      { href: "/notifications", label: "Notifications" },
      { href: "/settings", label: "Settings", roles: ["admin", "planner"] },
    ],
  },
]

export function Sidebar({
  role,
  isSuperadmin = false,
}: {
  role: Role
  isSuperadmin?: boolean
}) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  const groups = GROUPS.map((g) => ({
    ...g,
    // A super admin passes every policy, so filtering the rail by their
    // nominal role would hide pages that would have worked.
    items: g.items.filter((i) => !i.roles || isSuperadmin || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => (
        <div key={g.heading}>
          <h2 className="mb-1.5 px-2 text-[length:calc(var(--base)*0.72)] font-semibold uppercase tracking-wide text-steel-400">
            {g.heading}
          </h2>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const active = isActive(i.href)
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-[var(--tap)] items-center rounded-[var(--radius)] px-2",
                      "text-[length:var(--base)] transition-colors",
                      // A filled black pill inverts to a filled white pill in
                      // dark mode and shouts down the whole rail. The accent
                      // marker states the same thing at a fraction of the
                      // weight, and the marker itself is a shape, not only a
                      // colour (rule 4).
                      active
                        ? "bg-accent-bg font-semibold text-ink-900"
                        : "text-ink-600 hover:bg-paper-100 hover:text-ink-900"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                      />
                    )}
                    {i.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-steel-200 bg-paper-000 lg:flex">
        <Wordmark />
        {nav}
      </aside>

      {/* Narrow screens: a drawer, because a planner checking a job from a
          phone in the store should not get a broken desktop layout. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-[var(--tap)] w-[var(--tap)] items-center justify-center border-r border-steel-200 bg-paper-000 text-ink-900 lg:hidden"
      >
        <span aria-hidden="true" className="space-y-1">
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/40 lg:hidden"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="flex h-full w-64 flex-col border-r border-steel-200 bg-paper-000">
            <Wordmark onClose={() => setOpen(false)} />
            {nav}
          </div>
        </div>
      )}
    </>
  )
}

function Wordmark({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-steel-200 px-4">
      <Link href="/dashboard">
        <BrandWordmark
          size={26}
          nameClassName="text-[length:calc(var(--base)*1.05)]"
        />
      </Link>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="text-ink-600 hover:text-ink-900"
        >
          Close
        </button>
      )}
    </div>
  )
}
