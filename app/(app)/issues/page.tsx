import Link from "next/link"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { IssueList, type IssueRow } from "@/components/issues/IssueList"
import { Card, CardBody } from "@/components/ui/card"
import { humanise } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { one } from "@/lib/rel"

export const metadata = { title: "Issues" }

const AREAS = [
  "cylinder", "ink", "substrate", "machine", "registration", "drying",
  "tension", "static", "adhesion", "doctor_blade", "other",
]

/**
 * The cross-job issue explorer -- plan Section 11, Phase 7.
 *
 * The Pareto is the point: it answers "what is costing us most often" without
 * anyone opening a run record.
 */
export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; open?: string; severity?: string }>
}) {
  const { area, open, severity } = await searchParams
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from("observations")
    .select(
      `id, title, area, severity, description, action_taken, next_run_note,
       next_run_note_cleared_at, observed_at, is_resolved, photo_urls, job_file_id, run_id,
       job_files(job_file_no), runs(run_no), run_stations(station_no), machines(code),
       profiles!observations_reported_by_fkey(full_name)`
    )
    .order("observed_at", { ascending: false })
    .limit(300)

  if (area) query = query.eq("area", area)
  if (severity) query = query.eq("severity", severity)
  if (open === "1") {
    query = query.not("next_run_note", "is", null).is("next_run_note_cleared_at", null)
  }

  const { data } = await query

  const issues: IssueRow[] = (data ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    area: o.area,
    severity: o.severity,
    description: o.description,
    action_taken: o.action_taken,
    next_run_note: o.next_run_note,
    next_run_note_cleared_at: o.next_run_note_cleared_at,
    observed_at: o.observed_at,
    is_resolved: o.is_resolved,
    photo_urls: o.photo_urls,
    job_file_id: o.job_file_id,
    run_id: o.run_id,
    job_file_no: one<{ job_file_no: string }>(o.job_files)?.job_file_no ?? null,
    run_no: one<{ run_no: number }>(o.runs)?.run_no ?? null,
    station_no: one<{ station_no: number }>(o.run_stations)?.station_no ?? null,
    machine_code: one<{ code: string }>(o.machines)?.code ?? null,
    reporter: one<{ full_name: string }>(o.profiles)?.full_name ?? null,
  }))

  // Pareto across everything, not just the filtered view, so the chart does
  // not change shape as you click through it.
  const { data: all } = await supabase.from("observations").select("area, title")
  const byArea = new Map<string, number>()
  const byTitle = new Map<string, { title: string; area: string; count: number }>()
  for (const o of all ?? []) {
    byArea.set(o.area, (byArea.get(o.area) ?? 0) + 1)
    const key = `${o.area}|${o.title}`
    const e = byTitle.get(key) ?? { title: o.title, area: o.area, count: 0 }
    e.count++
    byTitle.set(key, e)
  }
  const pareto = [...byArea.entries()].map(([a, c]) => ({ area: a, count: c })).sort((x, y) => y.count - x.count)
  const topTitles = [...byTitle.values()].sort((x, y) => y.count - x.count).slice(0, 10)
  const max = pareto[0]?.count ?? 1

  const filterHref = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { area, open, severity, ...next }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const q = p.toString()
    return q ? `/issues?${q}` : "/issues"
  }

  return (
    <>
      <PageHeader
        title="Issues"
        subtitle="Every problem ever logged, across every job. This is what turns eight stations of data entry into an answer."
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterChip href={filterHref({ area: undefined })} active={!area}>
          All areas
        </FilterChip>
        {AREAS.map((a) => (
          <FilterChip key={a} href={filterHref({ area: a })} active={area === a}>
            {humanise(a)}
          </FilterChip>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-steel-200" />
        <FilterChip href={filterHref({ open: open === "1" ? undefined : "1" })} active={open === "1"}>
          Open notes only
        </FilterChip>
        <FilterChip
          href={filterHref({ severity: severity === "critical" ? undefined : "critical" })}
          active={severity === "critical"}
        >
          Critical only
        </FilterChip>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <SectionHeading>
            {issues.length} issue{issues.length === 1 ? "" : "s"}
            {area ? ` in ${humanise(area)}` : ""}
          </SectionHeading>
          <IssueList
            issues={issues}
            showJob
            canClear={can.clearNextRunNote(profile.role)}
            emptyMessage="Nothing matches these filters. Clear them to see everything logged."
          />
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeading>By area</SectionHeading>
            <Card>
              <CardBody>
                {pareto.length === 0 ? (
                  <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
                    Nothing logged yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {pareto.map((p) => (
                      <li key={p.area}>
                        <Link href={filterHref({ area: p.area })} className="block">
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-[length:calc(var(--base)*0.86)]">
                            <span className="truncate text-ink-900 hover:underline">
                              {humanise(p.area)}
                            </span>
                            <span data-numeric="" className="font-semibold text-ink-600">
                              {p.count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-100">
                            <div className="h-full bg-ink-600" style={{ width: `${(p.count / max) * 100}%` }} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <SectionHeading>Most repeated</SectionHeading>
            <Card>
              {topTitles.length === 0 ? (
                <CardBody>
                  <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
                    Nothing logged yet.
                  </p>
                </CardBody>
              ) : (
                <ul className="divide-y divide-steel-200">
                  {topTitles.map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[length:calc(var(--base)*0.92)] text-ink-900">
                          {t.title}
                        </span>
                        <span className="block text-[length:calc(var(--base)*0.78)] text-steel-400">
                          {humanise(t.area)}
                        </span>
                      </span>
                      <span data-numeric="" className="shrink-0 font-semibold text-ink-600">
                        {t.count}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </>
  )
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center rounded-[var(--radius)] border px-3 text-[length:calc(var(--base)*0.86)] font-semibold transition-colors",
        active
          ? "border-ink-900 bg-ink-900 text-paper-000"
          : "border-steel-200 bg-paper-000 text-ink-600 hover:text-ink-900"
      )}
    >
      {children}
    </Link>
  )
}
