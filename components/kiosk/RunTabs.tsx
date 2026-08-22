"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { slug: "", label: "Stations" },
  { slug: "process", label: "Process" },
  { slug: "substrate", label: "Substrate" },
  { slug: "finish", label: "Close run" },
]

/** One task per screen: four passes over the run, never a tab inside a tab. */
export function RunTabs({ runId }: { runId: string }) {
  const pathname = usePathname()
  const base = `/kiosk/runs/${runId}`

  return (
    <nav aria-label="Run entry steps">
      <ul className="flex flex-wrap gap-1 rounded-[var(--radius)] border border-steel-200 bg-paper-100 p-0.5">
        {TABS.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base
          const active = pathname === href
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[calc(var(--tap)-8px)] items-center rounded-[var(--radius)] px-4 font-semibold transition-colors",
                  active
                    ? "bg-paper-000 text-ink-900"
                    : "text-ink-600 hover:text-ink-900"
                )}
              >
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
