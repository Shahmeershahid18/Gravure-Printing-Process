import Link from "next/link"
import { Badge, type Tone } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { dateTime } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import type { ActivityRow } from "@/lib/actions/control"

/**
 * The activity stream, as rows.
 *
 * Server-rendered and shared between the overview and the full activity page,
 * so there is one definition of what an event looks like.
 *
 * Event names are shown as they are stored -- `auth.pin_failed`, not "PIN
 * attempt unsuccessful". This is the one screen in the product where the
 * reader is the person who built the system, and a stable machine-readable
 * name is more useful to them than prose that has to be mapped back.
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
    return <EmptyState title="No activity matches this filter. Widen it, or wait for someone to use the system." />
  }

  return (
    <ul>
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-steel-200 px-4 py-2.5 last:border-b-0"
        >
          <Badge tone={CATEGORY_TONE[r.category] ?? "neutral"} className="shrink-0">
            {r.category}
          </Badge>

          <code className="shrink-0 text-[length:calc(var(--base)*0.82)] text-ink-900">
            {r.event}
          </code>

          {showActor && (
            <span className="shrink-0 text-[length:calc(var(--base)*0.86)] text-ink-600">
              {r.actor_id ? (
                <Link
                  href={`/control/users/${r.actor_id}`}
                  className="font-semibold hover:underline"
                >
                  {r.actor_name ?? r.actor_email ?? "Unknown"}
                </Link>
              ) : (
                <span className="italic">{r.actor_email ?? "signed out"}</span>
              )}
              {r.actor_role ? ` · ${r.actor_role}` : ""}
              {/* The hidden account's own entries are marked, so a trail read
                  months later does not mistake them for an ordinary admin. */}
              {r.actor_hidden ? " · hidden" : ""}
            </span>
          )}

          {r.summary && (
            <span className="min-w-0 flex-1 truncate text-[length:calc(var(--base)*0.86)] text-ink-600">
              {r.summary}
            </span>
          )}

          {r.path && (
            <code className="shrink-0 text-[length:calc(var(--base)*0.78)] text-steel-400">
              {r.path}
            </code>
          )}

          <time
            dateTime={r.occurred_at}
            title={dateTime(r.occurred_at)}
            className="ml-auto shrink-0 text-[length:calc(var(--base)*0.78)] text-steel-400"
          >
            {relativeTime(r.occurred_at)}
          </time>
        </li>
      ))}
    </ul>
  )
}
