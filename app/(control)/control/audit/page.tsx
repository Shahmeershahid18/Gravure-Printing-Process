import Link from "next/link"
import { getAudit, getAuditTables, getUsers } from "@/lib/actions/control"
import { PageHeader } from "@/components/ui/page-header"
import { buttonVariants } from "@/components/ui/button"
import { num } from "@/lib/format"
import { AuditRows } from "@/components/control/AuditRows"
import { AuditFilters } from "@/components/control/AuditFilters"

export const metadata = { title: "Not found" }

const PAGE = 50

/**
 * The audit trail, unfiltered.
 *
 * An admin and a supervisor can already read audit_log through the policy in
 * 20260823200000 -- minus rows attributed to a hidden account. This page is
 * the same table with that subtraction removed, plus the before-and-after
 * values expanded, which no other screen in the product shows.
 */
export default async function ControlAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const one = (k: string) => {
    const v = sp[k]
    return (Array.isArray(v) ? v[0] : v) || null
  }

  const page = Math.max(Number(one("page") ?? 1) || 1, 1)

  const [data, tables, users] = await Promise.all([
    getAudit({
      limit: PAGE,
      offset: (page - 1) * PAGE,
      table: one("table"),
      actor: one("actor"),
      action: one("action"),
    }),
    getAuditTables(),
    getUsers(),
  ])

  const pages = Math.max(Math.ceil(data.total / PAGE), 1)

  const linkTo = (nextPage: number) => {
    const params = new URLSearchParams()
    for (const k of ["table", "actor", "action"]) {
      const v = one(k)
      if (v) params.set(k, v)
    }
    if (nextPage > 1) params.set("page", String(nextPage))
    const qs = params.toString()
    return `/control/audit${qs ? `?${qs}` : ""}`
  }

  return (
    <div>
      <PageHeader
        title="Changes"
        subtitle={`${num(data.total)} recorded row changes, with what the values were before and after.`}
      />

      <AuditFilters
        tables={tables}
        users={users.map((u) => ({ id: u.id, name: u.full_name, role: u.role }))}
      />

      <div className="mt-4">
        <AuditRows rows={data.rows} total={data.total} />
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[length:calc(var(--base)*0.86)] text-ink-600">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={linkTo(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Newer
              </Link>
            )}
            {page < pages && (
              <Link href={linkTo(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Older
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
