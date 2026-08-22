"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/settings/customers", label: "Customers" },
  { href: "/settings/machines", label: "Machines" },
  { href: "/settings/suppliers", label: "Suppliers" },
  { href: "/settings/colours", label: "Colour names" },
  { href: "/settings/issue-templates", label: "Issue templates" },
  { href: "/settings/life-rules", label: "Cylinder life rules" },
  { href: "/settings/users", label: "Users and PINs", adminOnly: true },
  { href: "/settings/import", label: "Import from Excel" },
]

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin)

  return (
    <nav aria-label="Settings sections" className="lg:w-56 lg:shrink-0">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {items.map((i) => {
          const active = pathname === i.href
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[var(--tap)] items-center rounded-[var(--radius)] px-3 transition-colors",
                  active
                    ? "bg-ink-900 font-semibold text-paper-000"
                    : "text-ink-600 hover:bg-paper-000 hover:text-ink-900"
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
