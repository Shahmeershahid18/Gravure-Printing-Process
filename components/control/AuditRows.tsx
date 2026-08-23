"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { dateTime } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import type { AuditRow } from "@/lib/actions/control"

/**
 * Row changes, with the diff collapsed by default.
 *
 * A row_to_json of a run is thirty columns and two of them changed. Printing
 * all thirty makes the screen unreadable and the change unfindable, so the
 * summary line names only the fields whose value actually moved, and the full
 * before/after is one click away for the case where the omitted columns are
 * the point.
 *
 * Fields that change on every write and say nothing about intent are dropped
 * from the summary -- a generated waste percentage moving is a consequence of
 * the meters moving, not a second edit.
 */

const NOISE = new Set(["updated_at", "created_at", "waste_pct_m", "waste_pct_kg", "has_pin"])

function changedFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return []
  return Object.keys(after)
    .filter((k) => !NOISE.has(k))
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
}

function show(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v === "" ? "(empty)" : v
  return JSON.stringify(v)
}

export function AuditRows({ rows }: { rows: AuditRow[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="No change matches this filter. Widen it, or clear it to see everything." />
      </Card>
    )
  }

  return (
    <Card>
      <ul>
        {rows.map((r) => {
          const fields = changedFields(r.old_data, r.new_data)
          const open = expanded === r.id

          return (
            <li key={r.id} className="border-b border-steel-200 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2.5">
                <Badge
                  tone={r.action === "DELETE" ? "critical" : r.action === "INSERT" ? "ok" : "neutral"}
                  className="shrink-0"
                >
                  {r.action}
                </Badge>

                <code className="shrink-0 text-[length:calc(var(--base)*0.84)] text-ink-900">
                  {r.table_name}
                </code>

                <span className="shrink-0 text-[length:calc(var(--base)*0.86)] text-ink-600">
                  {r.changed_by ? (
                    <Link
                      href={`/control/users/${r.changed_by}`}
                      className="font-semibold hover:underline"
                    >
                      {r.changed_by_name ?? "Unknown"}
                    </Link>
                  ) : (
                    <span className="italic">system</span>
                  )}
                  {r.changed_by_role ? ` · ${r.changed_by_role}` : ""}
                  {r.changed_by_hidden ? " · hidden" : ""}
                </span>

                {r.action === "UPDATE" && (
                  <span className="min-w-0 flex-1 truncate text-[length:calc(var(--base)*0.84)] text-ink-600">
                    {fields.length === 0
                      ? "No visible field changed"
                      : fields.slice(0, 4).join(", ") +
                        (fields.length > 4 ? ` and ${fields.length - 4} more` : "")}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : r.id)}
                  aria-expanded={open}
                  className="shrink-0 text-[length:calc(var(--base)*0.8)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
                >
                  {open ? "Hide" : "Detail"}
                </button>

                <time
                  dateTime={r.changed_at}
                  title={dateTime(r.changed_at)}
                  className="shrink-0 text-[length:calc(var(--base)*0.78)] text-steel-400"
                >
                  {relativeTime(r.changed_at)}
                </time>
              </div>

              {open && (
                <div className="border-t border-steel-200 bg-paper-100 px-4 py-3">
                  <div className="mb-2 text-[length:calc(var(--base)*0.78)] text-steel-400">
                    Record <code>{r.record_id}</code> · {dateTime(r.changed_at)}
                  </div>

                  {r.action === "UPDATE" ? (
                    fields.length === 0 ? (
                      <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                        Every field the summary tracks is unchanged. The write
                        touched only generated or timestamp columns.
                      </p>
                    ) : (
                      <dl className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
                        {fields.map((f) => (
                          <React.Fragment key={f}>
                            <dt className="text-[length:calc(var(--base)*0.84)] font-semibold text-ink-900">
                              {f}
                            </dt>
                            <dd className="min-w-0 text-[length:calc(var(--base)*0.84)]">
                              <span className="text-signal-critical line-through">
                                {show(r.old_data?.[f])}
                              </span>
                              <span aria-hidden="true" className="mx-2 text-steel-400">
                                →
                              </span>
                              <span className="text-signal-ok">{show(r.new_data?.[f])}</span>
                            </dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    )
                  ) : (
                    <pre className="max-h-80 overflow-auto text-[length:calc(var(--base)*0.78)] text-ink-600">
                      {JSON.stringify(r.action === "DELETE" ? r.old_data : r.new_data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
