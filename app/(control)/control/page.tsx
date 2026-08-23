import Link from "next/link"
import { getOverview, getActivity } from "@/lib/actions/control"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { roleLabel } from "@/lib/roles"
import type { Role } from "@/lib/roles"
import { ActivityRows } from "@/components/control/ActivityRows"

export const metadata = { title: "Not found" }

export default async function ControlOverview() {
  const [overview, recent] = await Promise.all([
    getOverview(),
    getActivity({ limit: 25 }),
  ])

  if (!overview) {
    return (
      <Alert tone="critical" title="The console could not read its data.">
        The fn_sa_* functions are missing or this session is no longer granted.
        Apply 20260823200000_superadmin_role.sql and sign in again.
      </Alert>
    )
  }

  const a = overview.activity

  return (
    <div>
      <PageHeader
        title="Console"
        subtitle="Everything this system knows about who is using it. Visible to this account only."
      />

      {/* Numbers first, because the reason to open this page is usually to
          check one of them rather than to read the stream. */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={num(overview.users.total)} note={`${overview.users.active} active, ${overview.users.inactive} deactivated`} />
        <Stat label="Signed in today" value={num(a.sign_ins_today)} note={a.failed_today > 0 ? `${a.failed_today} failed attempts` : "No failed attempts"} tone={a.failed_today > 0 ? "warn" : undefined} />
        <Stat label="Events today" value={num(a.last_day)} note={`${num(a.last_hour)} in the last hour`} />
        <Stat label="Logged in total" value={num(a.total)} note={`${num(a.last_week)} this week`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Active now"
              description="Anyone who has done something in the last 15 minutes."
            />
            {overview.online.length === 0 ? (
              <EmptyState title="Nobody is using the system at the moment." />
            ) : (
              <ul>
                {overview.online.map((o) => (
                  <li
                    key={o.actor_id}
                    className="flex items-center justify-between gap-3 border-b border-steel-200 px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/control/users/${o.actor_id}`}
                        className="block truncate text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900 hover:underline"
                      >
                        {o.actor_name ?? "Unknown"}
                      </Link>
                      <span className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                        {o.actor_role ? roleLabel(o.actor_role as Role) : "—"} ·{" "}
                        {relativeTime(o.last_seen)}
                      </span>
                    </div>
                    <span
                      data-numeric=""
                      className="shrink-0 text-[length:calc(var(--base)*0.8)] text-steel-400"
                    >
                      {num(o.events)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Roles" description="Active accounts only." />
            <CardBody className="space-y-1.5">
              {Object.entries(overview.by_role).length === 0 ? (
                <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                  No active accounts.
                </p>
              ) : (
                Object.entries(overview.by_role)
                  .sort(([, x], [, y]) => y - x)
                  .map(([role, n]) => (
                    <div key={role} className="flex items-center justify-between gap-3">
                      <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">
                        {roleLabel(role as Role)}
                      </span>
                      <span
                        data-numeric=""
                        className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900"
                      >
                        {num(n)}
                      </span>
                    </div>
                  ))
              )}
              {overview.users.hidden > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-steel-200 pt-1.5">
                  <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">
                    Hidden
                  </span>
                  <Badge tone="info">{num(overview.users.hidden)}</Badge>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notifications" description="Across every inbox." />
            <CardBody className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">Sent</span>
                <span data-numeric="" className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900">
                  {num(overview.notifications.total)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">Unread</span>
                <span data-numeric="" className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900">
                  {num(overview.notifications.unread)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            action={
              <Link
                href="/control/activity"
                className="text-[length:calc(var(--base)*0.86)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                All activity
              </Link>
            }
          >
            Latest activity
          </SectionHeading>
          <Card>
            <ActivityRows rows={recent.rows} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note?: string
  tone?: "warn"
}) {
  return (
    <Card>
      <CardBody>
        <div className="text-[length:calc(var(--base)*0.8)] uppercase tracking-wide text-ink-600">
          {label}
        </div>
        <div
          data-numeric=""
          className="mt-1 text-[length:calc(var(--base)*1.6)] font-semibold tracking-tight text-ink-900"
        >
          {value}
        </div>
        {note && (
          <div
            className={
              tone === "warn"
                ? "mt-0.5 text-[length:calc(var(--base)*0.8)] text-signal-warn"
                : "mt-0.5 text-[length:calc(var(--base)*0.8)] text-steel-400"
            }
          >
            {note}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
