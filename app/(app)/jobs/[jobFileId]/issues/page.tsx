import { notFound } from "next/navigation"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { IssueList, type IssueRow } from "@/components/issues/IssueList"
import { Stat } from "@/components/ui/stat"
import { humanise } from "@/components/ui/badge"
import { one } from "@/lib/rel"

export const metadata = { title: "Issues" }

export default async function JobIssuesPage({
  params,
}: {
  params: Promise<{ jobFileId: string }>
}) {
  const { jobFileId } = await params
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: job } = await supabase
    .from("job_files")
    .select("id, job_file_no, job_no, product_name")
    .eq("id", jobFileId)
    .maybeSingle()

  if (!job) notFound()

  const { data } = await supabase
    .from("observations")
    .select(
      `id, title, area, severity, description, action_taken, next_run_note,
       next_run_note_cleared_at, observed_at, is_resolved, photo_urls, job_file_id, run_id,
       runs(run_no), run_stations(station_no), machines(code),
       profiles!observations_reported_by_fkey(full_name)`
    )
    .eq("job_file_id", jobFileId)
    .order("observed_at", { ascending: false })

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
    run_no: one<{ run_no: number }>(o.runs)?.run_no ?? null,
    station_no: one<{ station_no: number }>(o.run_stations)?.station_no ?? null,
    machine_code: one<{ code: string }>(o.machines)?.code ?? null,
    reporter: one<{ full_name: string }>(o.profiles)?.full_name ?? null,
  }))

  const open = issues.filter((o) => o.next_run_note && !o.next_run_note_cleared_at)
  const major = issues.filter((o) => o.severity !== "minor")

  const byArea = new Map<string, number>()
  for (const o of issues) byArea.set(o.area, (byArea.get(o.area) ?? 0) + 1)
  const topArea = [...byArea.entries()].sort((a, b) => b[1] - a[1])[0]

  // Open notes first: they are the only rows that block anything.
  const sorted = [
    ...open,
    ...issues.filter((o) => !open.includes(o)),
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Job files", href: "/jobs" },
          { label: job.job_file_no, href: `/jobs/${jobFileId}` },
          { label: "Issues" },
        ]}
        title="Problem history"
        subtitle={`Everything ever logged against ${job.job_file_no} · ${job.product_name}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total logged" value={issues.length} />
        <Stat label="Open next-run notes" value={open.length} tone={open.length > 0 ? "warn" : "ok"} />
        <Stat label="Major or critical" value={major.length} tone={major.length > 0 ? "warn" : "ok"} />
        <Stat
          label="Most common area"
          value={topArea ? humanise(topArea[0]) : "—"}
          hint={topArea ? `${topArea[1]} times` : "Nothing logged"}
        />
      </div>

      <SectionHeading>All issues</SectionHeading>
      <IssueList
        issues={sorted}
        canClear={can.clearNextRunNote(profile.role)}
        emptyMessage="Nothing has been logged against this job. That is either very good news or nobody is filling it in."
      />
    </>
  )
}
