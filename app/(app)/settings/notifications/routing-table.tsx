"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Alert } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { ROLES, roleLabel, type Role } from "@/lib/roles"
import { setCategoryRoles } from "@/lib/actions/notification-routing"

export type RoutingRow = {
  category: string
  label: string
  description: string
  roles: string[]
  defaultEnabled: boolean
}

/**
 * A grid of categories by roles, each cell a toggle.
 *
 * A checkbox matrix rather than six multi-selects: the question an admin
 * actually has is "who is being told about critical issues", which reads down
 * a column, and "what does a viewer hear", which reads across a row. Neither
 * is answerable from a list of dropdowns without opening every one.
 */
export function RoutingTable({ rows }: { rows: RoutingRow[] }) {
  const router = useRouter()
  const [state, setState] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(rows.map((r) => [r.category, r.roles]))
  )
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const toggle = async (category: string, role: Role) => {
    const current = state[category] ?? []
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role]

    setState((s) => ({ ...s, [category]: next }))
    setBusy(`${category}:${role}`)
    setError(null)

    const result = await setCategoryRoles(category, next as Role[])

    setBusy(null)
    if (!result.ok) {
      setState((s) => ({ ...s, [category]: current }))
      setError(result.error ?? "That change was not saved.")
      return
    }
    router.refresh()
  }

  return (
    <>
      {error && (
        <Alert tone="critical" className="mb-3">
          {error}
        </Alert>
      )}

      <Table>
        <THead>
          <TR>
            <TH>Event</TH>
            {ROLES.map((r) => (
              <TH key={r} className="text-center">
                {roleLabel(r)}
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR key={row.category}>
              <TD className="max-w-sm">
                <div className="font-semibold text-ink-900">{row.label}</div>
                <div className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                  {row.description}
                </div>
              </TD>
              {ROLES.map((role) => {
                const on = (state[row.category] ?? []).includes(role)
                const pending = busy === `${row.category}:${role}`
                return (
                  <TD key={role} className="text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${row.label} to ${roleLabel(role)}`}
                      disabled={pending}
                      onClick={() => void toggle(row.category, role)}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] border",
                        "text-[length:calc(var(--base)*0.8)] font-semibold transition-colors",
                        "disabled:opacity-50",
                        on
                          ? "border-ink-900 bg-ink-900 text-paper-000"
                          : "border-steel-200 bg-paper-000 text-steel-400 hover:bg-paper-100"
                      )}
                    >
                      {/* A tick and a dash, not a filled and empty box: the
                          state is legible without relying on the fill. */}
                      <span aria-hidden="true">{pending ? "…" : on ? "✓" : "–"}</span>
                    </button>
                  </TD>
                )
              })}
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  )
}
