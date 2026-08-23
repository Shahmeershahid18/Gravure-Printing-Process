"use client"

import * as React from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Alert } from "@/components/ui/alert"
import { setPreference } from "@/lib/actions/notifications"
import { CATEGORY_GROUPS, type NotificationCategory } from "@/lib/notifications"
import type { PreferenceRow } from "@/lib/actions/notifications"

/**
 * Preferences save on the switch, with no Save button.
 *
 * A settings screen with sixteen switches and one Save at the bottom is a
 * screen people leave without saving. The switch flips immediately, the write
 * follows, and a failure puts it back where it was and says why -- which is
 * the only case where anyone needs to be told anything.
 */
export function PreferencesForm({ rows }: { rows: PreferenceRow[] }) {
  const [state, setState] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.category, r.enabled]))
  )
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const byCategory = React.useMemo(
    () => new Map(rows.map((r) => [r.category, r])),
    [rows]
  )

  const toggle = async (category: NotificationCategory, next: boolean) => {
    setState((s) => ({ ...s, [category]: next }))
    setBusy(category)
    setError(null)

    const result = await setPreference(category, next)

    setBusy(null)
    if (!result.ok) {
      setState((s) => ({ ...s, [category]: !next }))
      setError(result.error ?? "That setting was not saved.")
    }
  }

  return (
    <div className="space-y-5">
      {error && <Alert tone="critical">{error}</Alert>}

      {CATEGORY_GROUPS.map((group) => {
        const items = group.categories
          .map((c) => byCategory.get(c))
          .filter((r): r is PreferenceRow => Boolean(r))
        if (items.length === 0) return null

        return (
          <Card key={group.heading}>
            <CardHeader title={group.heading} />
            <ul>
              {items.map((row) => {
                const on = state[row.category]
                return (
                  <li
                    key={row.category}
                    className="flex items-start justify-between gap-4 border-b border-steel-200 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <label
                        htmlFor={`pref-${row.category}`}
                        className="block text-[length:calc(var(--base)*0.92)] font-semibold text-ink-900"
                      >
                        {row.label}
                      </label>
                      <p className="mt-0.5 text-[length:calc(var(--base)*0.84)] text-ink-600">
                        {row.description}
                      </p>
                      {/* Saying so is kinder than a switch that appears to work
                          and then never produces a notification. */}
                      {!row.routed && (
                        <p className="mt-1 text-[length:calc(var(--base)*0.8)] text-steel-400">
                          Not sent to your role, so this switch has nothing to
                          turn off today. Leave it on and it will work if your
                          role changes.
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      {/* The switch is achromatic by rule, so the word carries
                          the state -- Section 4.4, rule 4. */}
                      <span className="w-8 text-right text-[length:calc(var(--base)*0.8)] text-ink-600">
                        {busy === row.category ? "…" : on ? "On" : "Off"}
                      </span>
                      <Switch
                        id={`pref-${row.category}`}
                        checked={on}
                        disabled={busy === row.category}
                        onCheckedChange={(v) => void toggle(row.category, v)}
                        aria-label={`${row.label}: ${on ? "on" : "off"}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
