"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/control", label: "Overview" },
  { href: "/control/users", label: "Accounts" },
  { href: "/control/activity", label: "Activity" },
  { href: "/control/audit", label: "Changes" },
  { href: "/control/broadcast", label: "Announce" },
]

export function ControlNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Console sections">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {ITEMS.map((i) => {
          const active = i.href === "/control" ? pathname === i.href : pathname.startsWith(i.href)
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[var(--tap-sm)] items-center border-b-2 px-3",
                  "text-[length:calc(var(--base)*0.9)] whitespace-nowrap transition-colors",
                  active
                    ? "border-accent font-semibold text-ink-900"
                    : "border-transparent text-ink-600 hover:text-ink-900"
                )}
              >
                {i.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
