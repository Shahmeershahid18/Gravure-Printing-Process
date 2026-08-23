"use client"

import * as React from "react"
import Link from "next/link"
import { signOut } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * The account chip and the only sign-out in the desktop shell.
 * Placed top-right, where every operator of every other business system on
 * this floor already expects to find it.
 */
export function AccountMenu({
  name,
  email,
  roleLabel,
  initials,
  machineCode,
  isSuperadmin = false,
}: {
  name: string
  email: string
  roleLabel: string
  initials: string
  machineCode?: string | null
  /**
   * Adds the only link to the console anywhere in the product.
   *
   * It is rendered for that one account and for nobody else, so it is not
   * "hidden with CSS" -- the markup does not exist in anyone else's document,
   * and neither does the route: /control returns 404 for every other visitor.
   * The chip itself stays identical, because a super admin who looks different
   * in the header is not hidden.
   */
  isSuperadmin?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex min-h-[var(--tap)] items-center gap-2.5 rounded-[var(--radius)] px-2",
          "transition-colors hover:bg-paper-100"
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-steel-200 bg-paper-100 text-[length:calc(var(--base)*0.78)] font-semibold text-ink-600"
        >
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[12rem] truncate text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
            {name}
          </span>
          <span className="block text-[length:calc(var(--base)*0.78)] text-ink-600">
            {roleLabel}
            {machineCode ? ` · ${machineCode}` : ""}
          </span>
        </span>
        <span aria-hidden="true" className="text-steel-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-64 rounded-[var(--radius)] border border-steel-200 bg-paper-000 sticky-bar"
        >
          <div className="border-b border-steel-200 px-3 py-2.5">
            <div className="truncate text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
              {name}
            </div>
            <div className="truncate text-[length:calc(var(--base)*0.8)] text-ink-600">
              {email}
            </div>
            <div className="mt-1 text-[length:calc(var(--base)*0.8)] text-steel-400">
              Signed in as {roleLabel}
              {machineCode ? ` on ${machineCode}` : ""}
            </div>
          </div>
          <div className="p-2">
            <Link
              href="/notifications"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-[var(--tap)] items-center rounded-[var(--radius)] px-2",
                "text-[length:calc(var(--base)*0.9)] text-ink-600",
                "transition-colors hover:bg-paper-100 hover:text-ink-900"
              )}
            >
              Notifications
            </Link>
            {isSuperadmin && (
              <Link
                href="/control"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-[var(--tap)] items-center rounded-[var(--radius)] px-2",
                  "text-[length:calc(var(--base)*0.9)] text-ink-600",
                  "transition-colors hover:bg-paper-100 hover:text-ink-900"
                )}
              >
                Console
              </Link>
            )}
          </div>

          <form action={signOut} className="border-t border-steel-200 p-2">
            <Button type="submit" variant="outline" size="full" role="menuitem">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
