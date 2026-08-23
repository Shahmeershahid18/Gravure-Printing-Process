"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GaugeIcon,
  UsersIcon,
  ActivityIcon,
  HistoryIcon,
  MegaphoneIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
  { href: "/control",           label: "Overview",  hint: "Signals and who is active", icon: GaugeIcon },
  { href: "/control/users",     label: "Accounts",  hint: "Every account, hidden included", icon: UsersIcon },
  { href: "/control/activity",  label: "Activity",  hint: "Sign-ins, pages, writes", icon: ActivityIcon },
  { href: "/control/audit",     label: "Changes",   hint: "Before and after values", icon: HistoryIcon },
  { href: "/control/broadcast", label: "Announce",  hint: "Message any role", icon: MegaphoneIcon },
]

/**
 * A rail, not tabs.
 *
 * Five destinations that are each a place you stay and work in, rather than
 * five views of one thing -- which is what a tab strip implies. It also leaves
 * the full width of the page for tables that genuinely need it, and the hint
 * line under each label means the console does not need a separate page
 * explaining what "Changes" means as against "Activity".
 */
export function ControlNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Console sections" className="p-2">
      <ul className="space-y-0.5">
        {ITEMS.map((i) => {
          const active =
            i.href === "/control" ? pathname === i.href : pathname.startsWith(i.href)
          const Icon = i.icon
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-start gap-2.5 rounded-[var(--radius)] px-2.5 py-2",
                  "transition-colors",
                  active
                    ? "bg-accent-bg text-ink-900"
                    : "text-ink-600 hover:bg-paper-100 hover:text-ink-900"
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                )}
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    active ? "text-ink-900" : "text-steel-400 group-hover:text-ink-600"
                  )}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[length:calc(var(--base)*0.92)] leading-tight",
                      active ? "font-semibold" : "font-medium"
                    )}
                  >
                    {i.label}
                  </span>
                  <span className="mt-0.5 block text-[length:calc(var(--base)*0.76)] leading-tight text-steel-400">
                    {i.hint}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
