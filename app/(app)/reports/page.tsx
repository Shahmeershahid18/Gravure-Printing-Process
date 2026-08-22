import Link from "next/link"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody } from "@/components/ui/card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { Stat } from "@/components/ui/stat"
import { Badge, humanise } from "@/components/ui/badge"
import { meters, kg, pct, shortDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { one } from "@/lib/rel"

export const metadata = { title: "Reports" }

/**
 * Waste by machine, supplier scorecards, and the batches that keep failing.
 *
 * Every comparison of process parameters filters on machine, because jobs move
 * between machines and comparing a run on G-01 to one on G-02 produces
 * nonsense (plan Section 7.3).
 */
export default async function ReportsPage() {
  await requireProfile()
  const supabase = await createClient()

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  const [{ data: runs }, { data: subUsage }, { data: obs }, { data: cyls }] = await Promise.all([
    supabase
      .from("v_run_summary")
      .select("id, run_no, run_date, machine_code, status, result, waste_pct_m, waste_pct_kg, total_meters_run, job_file_id")
      .gte("run_date", since)
      .order("run_date", { ascending: false }),
    supabase
      .from("run_substrates")
      .select("meters_used, kg_used, substrate_batches(batch_no, material_type, suppliers(id, name))"),
    supabase
      .from("observations")
      .select("id, area, severity, substrate_batch_id, ink_batch_id, machine_id, machines(code)")
      .gte("observed_at", since),
    supabase
      .from("v_cylinder_summary")
      .select("id, cylinder_no, colour_name, surface_meters, life_limit_meters, life_used_pct, condition, status, run_count")
      .order("life_used_pct", { ascending: false })
      .limit(10),
  ])

  const runList = runs ?? []
  const completed = runList.filter((r) => r.waste_pct_m !== null)

  // Waste by machine.
  const byMachine = new Map<
    string,
    { runs: number; wasteM: number[]; wasteKg: number[]; meters: number }
  >()
  for (const r of runList) {
    const code = r.machine_code ?? "—"
    const e = byMachine.get(code) ?? { runs: 0, wasteM: [], wasteKg: [], meters: 0 }
    e.runs++
    e.meters += Number(r.total_meters_run ?? 0)
    if (r.waste_pct_m !== null) e.wasteM.push(Number(r.waste_pct_m))
    if (r.waste_pct_kg !== null) e.wasteKg.push(Number(r.waste_pct_kg))
    byMachine.set(code, e)
  }
  const machineRows = [...byMachine.entries()]
    .map(([code, e]) => ({
      code,
      runs: e.runs,
      meters: e.meters,
      avgM: avg(e.wasteM),
      avgKg: avg(e.wasteKg),
      best: e.wasteM.length ? Math.min(...e.wasteM) : null,
      worst: e.wasteM.length ? Math.max(...e.wasteM) : null,
    }))
    .sort((a, b) => (a.avgM ?? 99) - (b.avgM ?? 99))

  // Supplier scorecard: how much of their material we ran, and how often it
  // caused a problem.
  const bySupplier = new Map<
    string,
    { name: string; meters: number; kg: number; batches: Set<string>; issues: number }
  >()
  for (const s of subUsage ?? []) {
    const b = one<{
      batch_no: string
      material_type: string
      suppliers: { id: string; name: string } | null
    }>(s.substrate_batches)
    if (!b?.suppliers) continue
    const e = bySupplier.get(b.suppliers.id) ?? {
      name: b.suppliers.name,
      meters: 0,
      kg: 0,
      batches: new Set<string>(),
      issues: 0,
    }
    e.meters += Number(s.meters_used ?? 0)
    e.kg += Number(s.kg_used ?? 0)
    e.batches.add(b.batch_no)
    bySupplier.set(b.suppliers.id, e)
  }

  const supplierRows = [...bySupplier.values()].sort((a, b) => b.meters - a.meters)

  // Issues by machine, so a press with a problem shows up as a press.
  const issuesByMachine = new Map<string, number>()
  for (const o of obs ?? []) {
    const code = one<{ code: string }>(o.machines)?.code
    if (!code) continue
    issuesByMachine.set(code, (issuesByMachine.get(code) ?? 0) + 1)
  }

  const totalMeters = runList.reduce((a, r) => a + Number(r.total_meters_run ?? 0), 0)
  const overallWaste = avg(completed.map((r) => Number(r.waste_pct_m)))

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="The last 90 days. Waste is compared within a machine, never across machines, because the tensions do not transfer."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Runs" value={runList.length} hint={`${completed.length} with waste recorded`} />
        <Stat
          label="Average waste"
          value={overallWaste === null ? "—" : pct(overallWaste)}
          tone={overallWaste === null ? "neutral" : overallWaste > 5 ? "critical" : overallWaste > 4 ? "warn" : "ok"}
          hint="By meters"
        />
        <Stat label="Meters run" value={meters(totalMeters)} hint="Across all stations" />
        <Stat label="Issues logged" value={(obs ?? []).length} hint="All areas" />
      </div>

      <section className="mb-8">
        <SectionHeading>Waste by machine</SectionHeading>
        {machineRows.length === 0 ? (
          <Card>
            <EmptyState title="No completed runs in the last 90 days." />
          </Card>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Machine</TH>
                <TH numeric>Runs</TH>
                <TH numeric>Meters</TH>
                <TH numeric>Avg waste (m)</TH>
                <TH numeric>Avg waste (kg)</TH>
                <TH numeric>Best</TH>
                <TH numeric>Worst</TH>
                <TH numeric>Issues</TH>
              </TR>
            </THead>
            <TBody>
              {machineRows.map((m) => (
                <TR key={m.code}>
                  <TD><span data-numeric="" className="font-semibold">{m.code}</span></TD>
                  <TD numeric>{m.runs}</TD>
                  <TD numeric>{meters(m.meters)}</TD>
                  <TD numeric>
                    <span
                      className={cn(
                        "font-semibold",
                        (m.avgM ?? 0) > 5
                          ? "text-signal-critical"
                          : (m.avgM ?? 0) > 4
                            ? "text-signal-warn"
                            : "text-signal-ok"
                      )}
                    >
                      {pct(m.avgM)}
                    </span>
                  </TD>
                  <TD numeric>{pct(m.avgKg)}</TD>
                  <TD numeric>{pct(m.best)}</TD>
                  <TD numeric>{pct(m.worst)}</TD>
                  <TD numeric>{issuesByMachine.get(m.code) ?? 0}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <p className="mt-2 text-[length:calc(var(--base)*0.82)] text-steel-400">
          Waste by meters is the headline. Waste by weight is the one to trust
          when substrate thickness changed mid job.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading>Substrate suppliers</SectionHeading>
          {supplierRows.length === 0 ? (
            <Card>
              <EmptyState title="No substrate usage recorded yet." />
            </Card>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Supplier</TH>
                  <TH numeric>Batches</TH>
                  <TH numeric>Meters</TH>
                  <TH numeric>Kg</TH>
                </TR>
              </THead>
              <TBody>
                {supplierRows.map((s, i) => (
                  <TR key={i}>
                    <TD>{s.name}</TD>
                    <TD numeric>{s.batches.size}</TD>
                    <TD numeric>{meters(s.meters)}</TD>
                    <TD numeric>{kg(s.kg)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <section>
          <SectionHeading>Cylinders closest to replacement</SectionHeading>
          {(cyls ?? []).length === 0 ? (
            <Card>
              <EmptyState title="No cylinders registered yet." />
            </Card>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cylinder</TH>
                  <TH>Colour</TH>
                  <TH numeric>Surface</TH>
                  <TH numeric>Used</TH>
                  <TH>Condition</TH>
                </TR>
              </THead>
              <TBody>
                {(cyls ?? []).map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/cylinders/${c.id}`} data-numeric="" className="font-semibold text-ink-900 hover:underline">
                        {c.cylinder_no}
                      </Link>
                    </TD>
                    <TD>{c.colour_name ?? "—"}</TD>
                    <TD numeric>{meters(c.surface_meters)}</TD>
                    <TD numeric>
                      <span
                        className={cn(
                          "font-semibold",
                          Number(c.life_used_pct) >= 95
                            ? "text-signal-critical"
                            : Number(c.life_used_pct) >= 80
                              ? "text-signal-warn"
                              : "text-signal-ok"
                        )}
                      >
                        {pct(c.life_used_pct, 0)}
                      </span>
                    </TD>
                    <TD><Badge tone="neutral" glyph={false}>{humanise(c.condition)}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>

      <section className="mt-8">
        <SectionHeading>Runs in the period</SectionHeading>
        <Card>
          <CardBody>
            <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
              {runList.length} run{runList.length === 1 ? "" : "s"} since{" "}
              <span data-numeric="">{shortDate(since)}</span>, producing{" "}
              <span data-numeric="">{meters(totalMeters)}</span> meters.{" "}
              <Link href="/runs" className="underline hover:text-ink-900">
                Open the full run list
              </Link>{" "}
              to filter and sort them.
            </p>
          </CardBody>
        </Card>
      </section>
    </>
  )
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
