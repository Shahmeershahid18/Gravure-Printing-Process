import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ActivityIcon,
  HistoryIcon,
  ClockIcon,
  KeyRoundIcon,
  FileSearchIcon,
  ShieldIcon,
} from "lucide-react"
import { getUserDetail } from "@/lib/actions/control"
import { PageHeader } from "@/components/ui/page-header"
import { Badge } from "@/components/ui/badge"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { buttonVariants } from "@/components/ui/button"
import { dateTime, num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { roleLabel, type Role } from "@/lib/roles"
import { ActivityRows } from "@/components/control/ActivityRows"
import { Stat, Panel, Quiet } from "@/components/control/ui"

export const metadata = { title: "Not found" }

/**
 * One person's whole trail.
 *
 * Two stacked sources rather than one merged list: what they looked at and did
 * (activity), and what they changed with before-and-after values (audit). They
 * answer different questions, and merging them buries the second under the
 * volume of the first.
 */
export default async function ControlUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const detail = await getUserDetail(userId)

  if (!detail?.profile) notFound()
  const p = detail.profile

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Accounts", href: "/control/users" }, { label: p.full_name }]}
        title={p.full_name}
        subtitle={p.email ?? "No email on the sign-in record"}
        action={
          <Link href="/control/users" className={buttonVariants({ variant: "outline" })}>
            Manage this account
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{roleLabel(p.role as Role)}</Badge>
        <Badge tone={p.is_active ? "ok" : "critical"}>
          {p.is_active ? "Active" : "Suspended"}
        </Badge>
        {p.is_superadmin && (
          <Badge tone="info">
            <ShieldIcon aria-hidden="true" className="h-3 w-3" />
            Hidden super administrator
          </Badge>
        )}
        {p.has_pin && <Badge tone="neutral">Operator PIN set</Badge>}
        {p.machine_code && <Badge tone="neutral">{p.machine_code}</Badge>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={ClockIcon}
          label="Last sign-in"
          value={p.last_sign_in_at ? relativeTime(p.last_sign_in_at) : "Never"}
          note={p.last_sign_in_at ? dateTime(p.last_sign_in_at) : "This account has never been used"}
        />
        <Stat
          icon={FileSearchIcon}
          label="Pages opened"
          value={num(detail.counts.page ?? 0)}
          note={`${num(detail.counts.data ?? 0)} records changed`}
        />
        <Stat
          icon={KeyRoundIcon}
          label="Sign-in events"
          value={num(detail.counts.auth ?? 0)}
          note={`Account created ${dateTime(p.created_at)}`}
        />
        <Stat
          icon={ActivityIcon}
          label="Refusals"
          value={num(detail.counts.security ?? 0)}
          tone={(detail.counts.security ?? 0) > 0 ? "warn" : "neutral"}
          note={
            (detail.counts.security ?? 0) > 0
              ? "Failed sign-ins, wrong PINs or denied writes"
              : "Nothing refused"
          }
        />
      </div>

      <div className="space-y-6">
        <Panel
          icon={ActivityIcon}
          title="Activity"
          description="Most recent 200 events."
          action={
            <Link
              href={`/control/activity?actor=${p.id}`}
              className="text-[length:calc(var(--base)*0.82)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              Filter the full log
            </Link>
          }
        >
          <ActivityRows rows={detail.activity} showActor={false} />
        </Panel>

        <Panel
          icon={HistoryIcon}
          title="Records changed"
          description="Most recent 100."
          action={
            <Link
              href={`/control/audit?actor=${p.id}`}
              className="text-[length:calc(var(--base)*0.82)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              With before and after
            </Link>
          }
        >
          {detail.changes.length === 0 ? (
            <Quiet>This account has not changed any record.</Quiet>
          ) : (
            <Table className="border-0">
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Table</TH>
                  <TH>Action</TH>
                  <TH>Record</TH>
                </TR>
              </THead>
              <TBody>
                {detail.changes.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <span
                        title={dateTime(c.changed_at)}
                        className="text-[length:calc(var(--base)*0.84)]"
                      >
                        {relativeTime(c.changed_at)}
                      </span>
                    </TD>
                    <TD>
                      <code className="text-[length:calc(var(--base)*0.82)]">{c.table_name}</code>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          c.action === "DELETE"
                            ? "critical"
                            : c.action === "INSERT"
                              ? "ok"
                              : "neutral"
                        }
                      >
                        {c.action}
                      </Badge>
                    </TD>
                    <TD>
                      <code className="text-[length:calc(var(--base)*0.76)] text-steel-400">
                        {c.record_id}
                      </code>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>
    </div>
  )
}
