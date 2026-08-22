import { requireProfile } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { RunsTable, type RunRow } from "./runs-table"
import { one } from "@/lib/rel"

export const metadata = { title: "Runs" }

export default async function RunsPage() {
  await requireProfile()
  const supabase = await createClient()

  const { data } = await supabase
    .from("runs")
    .select(
      `id, run_no, run_date, shift, status, result, produced_qty_m, waste_pct_m, waste_pct_kg,
       avg_speed_mpm, locked_at, job_file_id,
       machines(code), job_files(job_file_no, job_no, product_name, customers(name))`
    )
    .is("deleted_at", null)
    .order("run_date", { ascending: false })
    .order("run_no", { ascending: false })
    .limit(400)

  const rows: RunRow[] = (data ?? []).map((r) => {
    const job = one<{
      job_file_no: string
      job_no: string
      product_name: string
      customers: { name: string } | null
    }>(r.job_files)
    const m = one<{ code: string }>(r.machines)
    return {
      id: r.id,
      run_no: r.run_no,
      run_date: r.run_date,
      shift: r.shift,
      status: r.status,
      result: r.result,
      machine: m?.code ?? "—",
      job_file_id: r.job_file_id,
      job_file_no: job?.job_file_no ?? "—",
      job_no: job?.job_no ?? "—",
      product_name: job?.product_name ?? "—",
      customer: job?.customers?.name ?? "—",
      produced_qty_m: r.produced_qty_m,
      waste_pct_m: r.waste_pct_m,
      avg_speed_mpm: r.avg_speed_mpm,
      locked: Boolean(r.locked_at),
    }
  })

  return (
    <>
      <PageHeader
        title="Runs"
        subtitle="Every run across every machine. The machine code on each row is not decoration: it is usually what explains an outlier."
      />
      <RunsTable rows={rows} />
    </>
  )
}
