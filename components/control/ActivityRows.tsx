import Link from "next/link"
import { Badge, type Tone } from "@/components/ui/badge"
import { dateTime } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { cn } from "@/lib/utils"
import type { ActivityRow } from "@/lib/actions/control"
import { Quiet } from "./ui"

/**
 * The activity stream.
 *
 * A grid with fixed columns rather than a wrapping flex row. The previous
 * version let each cell size to its content, which meant the timestamp landed
 * in a different place on every line and the eye had to re-find it -- fatal
 * for the one thing this list is for, which is scanning down a column looking
 * for the moment something changed.
 *
 * Event names are shown as stored -- `auth.pin_failed`, not "PIN attempt
 * unsuccessful". This is the one screen whose reader is the person who built
 * the system, and a stable machine-readable name is more use to them than
 * prose they have to map back.
 */

const CATEGORY_TONE: Record<string, Tone> = {
  auth:     "info",
  security: "critical",
  admin:    "warn",
  data:     "neutral",
  page:     "neutral",
  general:  "neutral",
}

export function ActivityRows({
  rows,
  showActor = true,
}: {
  rows: ActivityRow[]
  showActor?: boolean
}) {
  if (rows.length === 0) {
    return <Quiet>No activity matches this filter. Widen it, or clear it to see everything.</Quiet>
  }

  // Two layouts from one component. Dropping the actor column on a single
  // person's page and keeping the rest aligned is worth the branch.
  const cols = showActor
    ? "sm:grid-cols-[7rem_10rem_minmax(0,1fr)_6.5rem]"
    : "sm:grid-cols-[7rem_minmax(0,1fr)_6.5rem]"

  return (
    <div>
      <div
        className={cn(
          "hidden border-b border-steel-200 bg-paper-100 px-4 py-1.5 sm:grid sm:gap-3",
          cols,
          "text-[length:calc(var(--base)*0.72)] font-semibold uppercase tracking-wide text-ink-600"
        )}
      >
        <span>Kind</span>
        {showActor && <span>Who</span>}
        <span>What</span>
        <span className="text-right">When</span>
      </div>

      <ul>
        {rows.map((r) => (
          <li
            key={r.id}
            className={cn(
              "grid gap-1 border-b border-steel-200 px-4 py-2 last:border-b-0",
              "sm:items-baseline sm:gap-3",
              cols
            )}
          >
            <span className="flex items-center gap-2">
              <Badge tone={CATEGORY_TONE[r.category] ?? "neutral"} className="py-0">
                {r.category}
              </Badge>
            </span>

            {showActor && (
              <span className="min-w-0 truncate text-[length:calc(var(--base)*0.86)]">
                {r.actor_id ? (
                  <Link
                    href={`/control/users/${r.actor_id}`}
                    className="font-semibold text-ink-900 hover:underline"
                  >
                    {r.actor_name ?? r.actor_email ?? "Unknown"}
                  </Link>
                ) : (
                  <span className="italic text-ink-600">
                    {r.actor_email ?? "signed out"}
                  </span>
                )}
                {/* The hidden account's own entries are marked, so a trail read
                    months later is not mistaken for an ordinary admin. */}
                {r.actor_hidden && (
                  <span className="ml-1.5 text-[length:calc(var(--base)*0.72)] uppercase tracking-wide text-steel-400">
                    hidden
                  </span>
                )}
              </span>
            )}

            <span className="min-w-0">
              <code className="text-[length:calc(var(--base)*0.8)] text-ink-900">
                {r.event}
              </code>
              {r.summary && (
                <span className="ml-2 text-[length:calc(var(--base)*0.84)] text-ink-600">
                  {r.summary}
                </span>
              )}
              {r.path && (
                <code className="ml-2 text-[length:calc(var(--base)*0.76)] text-steel-400">
                  {r.path}
                </code>
              )}
            </span>

            <time
              dateTime={r.occurred_at}
              title={`${dateTime(r.occurred_at)}${r.ip ? ` · ${r.ip}` : ""}`}
              className="text-[length:calc(var(--base)*0.78)] text-steel-400 sm:text-right"
            >
              {relativeTime(r.occurred_at)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  )
}
