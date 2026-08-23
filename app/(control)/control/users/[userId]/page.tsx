import { notFound } from "next/navigation"
import Link from "next/link"
import { getUserDetail } from "@/lib/actions/control"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { dateTime, num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { roleLabel, type Role } from "@/lib/roles"
import { ActivityRows } from "@/components/control/ActivityRows"

export const metadata = { title: "Not found" }

/**
 * One person's whole trail.
 *
 * Two stacked sources rather than one merged list: what they looked at and did
 * (activity), and what they changed with before-and-after values (audit). They
 * answer different questions and merging them would bury the second under the
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
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{roleLabel(p.role as Role)}</Badge>
        <Badge tone={p.is_active ? "ok" : "neutral"}>
          {p.is_active ? "Active" : "Deactivated"}
        </Badge>
        {p.is_superadmin && <Badge tone="info">Hidden super administrator</Badge>}
        {p.has_pin && <Badge tone="neutral">Operator PIN set</Badge>}
        {p.machine_code && <Badge tone="neutral">{p.machine_code}</Badge>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Account created" value={dateTime(p.created_at)} />
        <Fact
          label="Last sign-in"
          value={p.last_sign_in_at ? dateTime(p.last_sign_in_at) : "Never"}
          note={p.last_sign_in_at ? relativeTime(p.last_sign_in_at) : undefined}
        />
        <Fact
          label="Pages opened"
          value={num(detail.counts.page ?? 0)}
          note={`${num(detail.counts.data ?? 0)} records changed`}
        />
        <Fact
          label="Sign-in events"
          value={num(detail.counts.auth ?? 0)}
          note={
            detail.counts.security
              ? `${num(detail.counts.security)} refusals or failures`
              : "No refusals"
          }
        />
      </div>

      <SectionHeading
        action={
          <Link
            href={`/control/activity?actor=${p.id}`}
            className="text-[length:calc(var(--base)*0.86)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
          >
            Filter the full log to this person
          </Link>
        }
      >
        Activity — most recent 200
      </SectionHeading>
      <Card className="mb-6">
        <ActivityRows rows={detail.activity} showActor={false} />
      </Card>

      <SectionHeading>Records changed — most recent 100</SectionHeading>
      {detail.changes.length === 0 ? (
        <Card>
          <EmptyState title="This account has not changed any record." />
        </Card>
      ) : (
        <Table>
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
                  <span title={dateTime(c.changed_at)}>{relativeTime(c.changed_at)}</span>
                </TD>
                <TD>
                  <code className="text-[length:calc(var(--base)*0.84)]">{c.table_name}</code>
                </TD>
                <TD>
                  <Badge
                    tone={
                      c.action === "DELETE" ? "critical" : c.action === "INSERT" ? "ok" : "neutral"
                    }
                  >
                    {c.action}
                  </Badge>
                </TD>
                <TD>
                  <code className="text-[length:calc(var(--base)*0.78)] text-steel-400">
                    {c.record_id}
                  </code>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-ink-600">
          {label}
        </div>
        <div className="mt-1 text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
          {value}
        </div>
        {note && (
          <div className="mt-0.5 text-[length:calc(var(--base)*0.8)] text-steel-400">{note}</div>
        )}
      </CardBody>
    </Card>
  )
}
