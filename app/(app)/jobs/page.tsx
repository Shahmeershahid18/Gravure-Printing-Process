import Link from "next/link"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { JobsTable, type JobRow } from "./jobs-table"
import { one } from "@/lib/rel"

export const metadata = { title: "Job files" }

export default async function JobsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from("job_files")
    .select(
      `id, job_file_no, job_no, product_name, structure, no_of_colours, status, created_at,
       customers(name), machines(code),
       artwork_revisions(revision_label, is_current, shade_card_no)`
    )
    .order("job_file_no", { ascending: false })

  // Run counts in one round trip rather than one per job.
  const { data: runs } = await supabase
    .from("runs")
    .select("job_file_id, waste_pct_m, run_date")
    .is("deleted_at", null)

  const stats = new Map<string, { count: number; waste: number[]; last: string | null }>()
  for (const r of runs ?? []) {
    const s = stats.get(r.job_file_id) ?? { count: 0, waste: [], last: null }
    s.count++
    if (r.waste_pct_m !== null) s.waste.push(Number(r.waste_pct_m))
    if (!s.last || r.run_date > s.last) s.last = r.run_date
    stats.set(r.job_file_id, s)
  }

  const rows: JobRow[] = (jobs ?? []).map((j) => {
    const revs = (j.artwork_revisions ?? []) as {
      revision_label: string
      is_current: boolean
      shade_card_no: string | null
    }[]
    const current = revs.find((r) => r.is_current)
    const s = stats.get(j.id)
    return {
      id: j.id,
      job_file_no: j.job_file_no,
      job_no: j.job_no,
      customer: one<{ name: string }>(j.customers)?.name ?? "—",
      product_name: j.product_name,
      structure: j.structure,
      no_of_colours: j.no_of_colours,
      machine: one<{ code: string }>(j.machines)?.code ?? "—",
      revision: current?.revision_label ?? "No revision",
      shade_card: current?.shade_card_no ?? "—",
      status: j.status,
      run_count: s?.count ?? 0,
      avg_waste: s && s.waste.length > 0 ? s.waste.reduce((a, b) => a + b, 0) / s.waste.length : null,
      last_run: s?.last ?? null,
    }
  })

  return (
    <>
      <PageHeader
        title="Job files"
        subtitle="One job file, one job number, one product. Everything a run knows hangs off this."
        action={
          can.editJobs(profile.role) ? (
            <Link
              href="/jobs/new"
              className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] bg-ink-900 px-4 font-semibold text-paper-000 hover:bg-ink-600"
            >
              Create job file
            </Link>
          ) : undefined
        }
      />
      <JobsTable rows={rows} canCreate={can.editJobs(profile.role)} />
    </>
  )
}
