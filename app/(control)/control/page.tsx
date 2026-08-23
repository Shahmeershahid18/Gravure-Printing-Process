import Link from "next/link"
import {
  UsersIcon,
  KeyRoundIcon,
  ActivityIcon,
  TriangleAlertIcon,
  ShieldAlertIcon,
  MonitorIcon,
  ClockIcon,
  Trash2Icon,
  FileSearchIcon,
} from "lucide-react"
import { getOverview, getActivity, getSignals } from "@/lib/actions/control"
import { PageHeader } from "@/components/ui/page-header"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { roleLabel, type Role } from "@/lib/roles"
import { ActivityRows } from "@/components/control/ActivityRows"
import { Stat, Panel, Row, Quiet } from "@/components/control/ui"

export const metadata = { title: "Not found" }

/**
 * The overview answers one question: is anything wrong right now?
 *
 * So it is ordered by how much a thing might need doing about it, not by how
 * interesting it is. Signals first, because they are the only part of this
 * page that can require action. Counts second, because they are the reason
 * someone glances at it. The stream last, because it is where you go when the
 * first two have told you where to look.
 */
export default async function ControlOverview() {
  const [overview, signals, recent] = await Promise.all([
    getOverview(),
    getSignals(24),
    getActivity({ limit: 20 }),
  ])

  if (!overview) {
    return (
      <Alert tone="critical" title="The console could not read its data.">
        The fn_sa_* functions are missing, or this session is no longer granted.
        Apply the migrations in <code>supabase/migrations/</code> and sign in again.
      </Alert>
    )
  }

  const a = overview.activity

  // Everything worth a second look, flattened into one list so the page can
  // say "nothing needs you" with confidence rather than showing six empty
  // panels that each have to be read to establish the same thing.
  const alerts: { tone: "warn" | "critical"; text: string; href?: string }[] = []

  for (const f of signals?.failed_sign_ins ?? []) {
    alerts.push({
      tone: f.attempts >= 10 ? "critical" : "warn",
      text: `${f.attempts} failed sign-ins for ${f.email}${
        f.distinct_ips > 1 ? ` from ${f.distinct_ips} addresses` : ""
      }, last ${relativeTime(f.last_attempt)}`,
      href: "/control/activity?category=security",
    })
  }
  for (const p of signals?.pin_failures ?? []) {
    alerts.push({
      tone: "critical",
      text: `${p.attempts} wrong PIN attempts against ${p.name ?? "an operator"} at a tablet`,
      href: p.user_id ? `/control/users/${p.user_id}` : "/control/activity?category=security",
    })
  }
  for (const r of signals?.refusals ?? []) {
    alerts.push({
      tone: "warn",
      text: `${r.name ?? "Someone"} (${r.role ?? "?"}) was refused ${r.events} times`,
      href: `/control/users/${r.actor_id}`,
    })
  }
  for (const h of signals?.heavy_readers ?? []) {
    alerts.push({
      tone: "warn",
      text: `${h.name ?? "Someone"} (${h.role ?? "?"}) opened ${num(h.pages)} pages in 24 hours`,
      href: `/control/users/${h.actor_id}`,
    })
  }
  for (const d of signals?.deletions ?? []) {
    alerts.push({
      tone: d.n >= 10 ? "critical" : "warn",
      text: `${d.name ?? "Someone"} deleted ${d.n} record${d.n === 1 ? "" : "s"}`,
      href: d.actor_id ? `/control/users/${d.actor_id}` : "/control/audit?action=DELETE",
    })
  }

  const worst = alerts.some((x) => x.tone === "critical") ? "critical" : "warn"

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Who is using the system, what they are doing, and anything worth a second look. Visible to this account only."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={UsersIcon}
          label="Accounts"
          value={num(overview.users.total)}
          note={`${overview.users.active} active · ${overview.users.inactive} suspended`}
        />
        <Stat
          icon={KeyRoundIcon}
          label="Signed in today"
          value={num(a.sign_ins_today)}
          tone={a.failed_today > 0 ? "warn" : "neutral"}
          note={
            a.failed_today > 0
              ? `${a.failed_today} failed attempt${a.failed_today === 1 ? "" : "s"}`
              : "No failed attempts"
          }
        />
        <Stat
          icon={ActivityIcon}
          label="Events today"
          value={num(a.last_day)}
          note={`${num(a.last_hour)} in the last hour`}
        />
        <Stat
          icon={alerts.length > 0 ? TriangleAlertIcon : ShieldAlertIcon}
          label="Needs a look"
          value={num(alerts.length)}
          tone={alerts.length > 0 ? worst : "neutral"}
          note={alerts.length > 0 ? "Listed below" : "Nothing flagged in 24 hours"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel
            icon={TriangleAlertIcon}
            title="Needs a look"
            description="The last 24 hours. None of these is a verdict — each is a reason to go and check."
            action={
              <Link
                href="/control/activity?category=security"
                className="text-[length:calc(var(--base)*0.82)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                Security log
              </Link>
            }
          >
            {alerts.length === 0 ? (
              <Quiet>
                Nothing flagged. No repeated sign-in failures, no wrong PINs, no
                refused writes and no unusual reading in the last 24 hours.
              </Quiet>
            ) : (
              alerts.slice(0, 12).map((x, i) => (
                <Row key={i}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Badge tone={x.tone === "critical" ? "critical" : "warn"} />
                    <span className="min-w-0 text-[length:calc(var(--base)*0.88)] text-ink-900">
                      {x.text}
                    </span>
                  </span>
                  {x.href && (
                    <Link
                      href={x.href}
                      className="shrink-0 text-[length:calc(var(--base)*0.8)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
                    >
                      Look
                    </Link>
                  )}
                </Row>
              ))
            )}
          </Panel>

          <Panel
            icon={ActivityIcon}
            title="Latest activity"
            action={
              <Link
                href="/control/activity"
                className="text-[length:calc(var(--base)*0.82)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                All activity
              </Link>
            }
          >
            <ActivityRows rows={recent.rows} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            icon={MonitorIcon}
            title="Active now"
            description="Anyone who did something in the last 15 minutes."
          >
            {overview.online.length === 0 ? (
              <Quiet>Nobody is using the system at the moment.</Quiet>
            ) : (
              overview.online.map((o) => (
                <Row key={o.actor_id}>
                  <span className="min-w-0">
                    <Link
                      href={`/control/users/${o.actor_id}`}
                      className="block truncate text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900 hover:underline"
                    >
                      {o.actor_name ?? "Unknown"}
                    </Link>
                    <span className="text-[length:calc(var(--base)*0.78)] text-steel-400">
                      {o.actor_role ? roleLabel(o.actor_role as Role) : "—"} ·{" "}
                      {relativeTime(o.last_seen)}
                    </span>
                  </span>
                  <span
                    data-numeric=""
                    className="shrink-0 text-[length:calc(var(--base)*0.8)] text-steel-400"
                  >
                    {num(o.events)}
                  </span>
                </Row>
              ))
            )}
          </Panel>

          <Panel icon={UsersIcon} title="Roles" description="Active accounts.">
            {Object.entries(overview.by_role).length === 0 ? (
              <Quiet>No active accounts.</Quiet>
            ) : (
              Object.entries(overview.by_role)
                .sort(([, x], [, y]) => y - x)
                .map(([role, n]) => (
                  <Row key={role}>
                    <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">
                      {roleLabel(role as Role)}
                    </span>
                    <span
                      data-numeric=""
                      className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900"
                    >
                      {num(n)}
                    </span>
                  </Row>
                ))
            )}
            {overview.users.hidden > 0 && (
              <Row>
                <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">
                  Hidden
                </span>
                <Badge tone="info">{num(overview.users.hidden)}</Badge>
              </Row>
            )}
          </Panel>

          {(signals?.dormant?.length ?? 0) > 0 && (
            <Panel
              icon={ClockIcon}
              title="Dormant but active"
              description="Can still sign in, but has not in 60 days."
            >
              {signals!.dormant.slice(0, 8).map((d) => (
                <Row key={d.id}>
                  <Link
                    href={`/control/users/${d.id}`}
                    className="min-w-0 truncate text-[length:calc(var(--base)*0.88)] text-ink-900 hover:underline"
                  >
                    {d.full_name}
                  </Link>
                  <span className="shrink-0 text-[length:calc(var(--base)*0.78)] text-steel-400">
                    {d.last_sign_in_at ? relativeTime(d.last_sign_in_at) : "never"}
                  </span>
                </Row>
              ))}
            </Panel>
          )}

          <Panel icon={FileSearchIcon} title="Logged in total">
            <Row>
              <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">
                Activity entries
              </span>
              <span
                data-numeric=""
                className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900"
              >
                {num(a.total)}
              </span>
            </Row>
            <Row>
              <span className="text-[length:calc(var(--base)*0.88)] text-ink-600">This week</span>
              <span
                data-numeric=""
                className="text-[length:calc(var(--base)*0.88)] font-semibold text-ink-900"
              >
                {num(a.last_week)}
              </span>
            </Row>
            <Row>
              <span className="flex items-center gap-1.5 text-[length:calc(var(--base)*0.88)] text-ink-600">
                <Trash2Icon aria-hidden="true" className="h-3.5 w-3.5 text-steel-400" />
                Retention
              </span>
              <Link
                href="/control/activity"
                className="text-[length:calc(var(--base)*0.8)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                Prune
              </Link>
            </Row>
          </Panel>
        </div>
      </div>
    </div>
  )
}
