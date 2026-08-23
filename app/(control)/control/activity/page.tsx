import Link from "next/link"
import { ActivityIcon } from "lucide-react"
import { getActivity, getUsers } from "@/lib/actions/control"
import { PageHeader } from "@/components/ui/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Panel } from "@/components/control/ui"
import { num } from "@/lib/format"
import { ActivityRows } from "@/components/control/ActivityRows"
import { ActivityFilters } from "@/components/control/ActivityFilters"
import { RetentionControl } from "@/components/control/RetentionControl"

export const metadata = { title: "Not found" }

const PAGE = 100

/**
 * Filters live in the URL rather than in component state.
 *
 * This is the screen someone lands on to answer a specific question -- "what
 * did this person do on Tuesday" -- and the answer needs to survive a refresh
 * and be shareable with nobody, but returnable to by the reader themselves.
 * It also keeps the page a Server Component, so the log never reaches the
 * browser except as the rows actually displayed.
 */
export default async function ActivityPage({
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
  const since = (() => {
    const w = one("window")
    if (!w || w === "all") return null
    const hours = { hour: 1, day: 24, week: 168, month: 720 }[w]
    return hours ? new Date(Date.now() - hours * 3_600_000).toISOString() : null
  })()

  const filters = {
    limit: PAGE,
    offset: (page - 1) * PAGE,
    actor: one("actor"),
    category: one("category"),
    event: one("event"),
    search: one("q"),
    since,
  }

  const [data, users] = await Promise.all([getActivity(filters), getUsers()])
  const pages = Math.max(Math.ceil(data.total / PAGE), 1)

  const linkTo = (nextPage: number) => {
    const params = new URLSearchParams()
    for (const k of ["actor", "category", "event", "q", "window"]) {
      const v = one(k)
      if (v) params.set(k, v)
    }
    if (nextPage > 1) params.set("page", String(nextPage))
    const qs = params.toString()
    return `/control/activity${qs ? `?${qs}` : ""}`
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={`${num(data.total)} recorded events. Sign-ins, page views, writes and privileged actions, for every account.`}
      />

      <ActivityFilters
        users={users.map((u) => ({ id: u.id, name: u.full_name, role: u.role }))}
      />

      <div className="mt-4">
        <Panel
          icon={ActivityIcon}
          title="Events"
          description={`Showing ${data.rows.length} of ${num(data.total)}, newest first.`}
        >
          <ActivityRows rows={data.rows} />
        </Panel>
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

      <div className="mt-8 max-w-2xl">
        <RetentionControl />
      </div>
    </div>
  )
}
