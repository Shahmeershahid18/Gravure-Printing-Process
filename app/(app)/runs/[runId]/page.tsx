import Link from "next/link"
import { notFound } from "next/navigation"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getRun, getRunStations } from "@/lib/queries/run"
import { reopenRun, deleteRun } from "@/lib/actions/runs"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody } from "@/components/ui/card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge, runStatusTone, runResultTone, severityTone, humanise } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Alert } from "@/components/ui/alert"
import { DataPoint } from "@/components/ui/field"
import { StationRail } from "@/components/run/StationRail"
import { meters, kg, pct, decimal, shortDate, dateTime } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Run" }

/**
 * One run, everything about it.
 *
 * This is the "after a complaint" screen from plan Section 2.4: which
 * revision, which batch, which operator, which settings, on which date.
 */
export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const profile = await requireProfile()

  const [run, stations] = await Promise.all([getRun(runId), getRunStations(runId)])
  if (!run) notFound()

  const supabase = await createClient()
  const [{ data: process }, { data: subs }, { data: obs }, { data: people }] = await Promise.all([
    supabase.from("run_process").select("*").eq("run_id", runId).maybeSingle(),
    supabase
      .from("run_substrates")
      .select("*, substrate_batches(id, batch_no, material_type, thickness_micron, suppliers(name))")
      .eq("run_id", runId),
    supabase
      .from("observations")
      .select("id, title, area, severity, description, action_taken, next_run_note, next_run_note_cleared_at, observed_at, run_station_id")
      .eq("run_id", runId)
      .order("observed_at", { ascending: false }),
    supabase
      .from("runs")
      .select("operator:profiles!runs_operator_id_fkey(full_name), supervisor:profiles!runs_supervisor_id_fkey(full_name), ack:profiles!runs_briefing_ack_by_fkey(full_name)")
      .eq("id", runId)
      .maybeSingle(),
  ])

  const locked = Boolean(run.locked_at)
  const observations = obs ?? []
  const operator = one<{ full_name: string }>(people?.operator)?.full_name
  const supervisor = one<{ full_name: string }>(people?.supervisor)?.full_name
  const ackBy = one<{ full_name: string }>(people?.ack)?.full_name

  const cylIds = stations.map((s) => s.cylinder_id).filter(Boolean) as string[]
  const inkIds = stations.map((s) => s.ink_product_id).filter(Boolean) as string[]
  const batchIds = stations.map((s) => s.ink_batch_id).filter(Boolean) as string[]

  const [{ data: cyls }, { data: inks }, { data: batches }] = await Promise.all([
    cylIds.length ? supabase.from("cylinders").select("id, cylinder_no").in("id", cylIds) : { data: [] },
    inkIds.length ? supabase.from("ink_products").select("id, ink_code").in("id", inkIds) : { data: [] },
    batchIds.length ? supabase.from("ink_batches").select("id, batch_no").in("id", batchIds) : { data: [] },
  ])

  const cylMap = new Map((cyls ?? []).map((c) => [c.id, c.cylinder_no]))
  const inkMap = new Map((inks ?? []).map((c) => [c.id, c.ink_code]))
  const batchMap = new Map((batches ?? []).map((c) => [c.id, c.batch_no]))

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Runs", href: "/runs" },
          { label: run.job?.job_file_no ?? "Job", href: `/jobs/${run.job_file_id}` },
          { label: `Run ${run.run_no}` },
        ]}
        title={`Run ${run.run_no}`}
        subtitle={
          <>
            {run.job?.job_file_no} · {run.job?.job_no} · {run.job?.product_name}
            {run.job?.customer ? ` · ${run.job.customer}` : ""}
          </>
        }
        action={
          <>
            <Link
              href={`/jobs/${run.job_file_id}/briefing?machine=${run.machine_id}`}
              className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 font-semibold text-ink-900 hover:bg-paper-100"
            >
              Briefing
            </Link>
            {locked && can.editLockedRuns(profile.role) && (
              <form action={reopenRun}>
                <input type="hidden" name="runId" value={runId} />
                <Button type="submit" variant="outline">Reopen run</Button>
              </form>
            )}
            {can.deleteRuns(profile.role) && (
              <form action={deleteRun}>
                <input type="hidden" name="runId" value={runId} />
                <Button type="submit" variant="danger">Delete run</Button>
              </form>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={runStatusTone(run.status)}>{humanise(run.status)}</Badge>
        {run.result && <Badge tone={runResultTone(run.result)}>{humanise(run.result)}</Badge>}
        {locked && <Badge tone="neutral">Locked {shortDate(run.locked_at)}</Badge>}
        {run.revision_label && <Badge tone="info" glyph={false}>{run.revision_label}</Badge>}
      </div>

      {locked && (
        <Alert tone="info" title="This run is locked" className="mb-6">
          {can.editLockedRuns(profile.role)
            ? "Reopen it above to correct anything. Every change lands in the audit log."
            : "Only a supervisor or admin can reopen it. Ask one if something needs correcting."}
        </Alert>
      )}

      {/* Headline figures */}
      <div className="mb-6 grid gap-px overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-steel-200 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Machine", value: run.machine?.code, numeric: true },
          { label: "Date", value: shortDate(run.run_date) },
          { label: "Shift", value: run.shift ?? "—", numeric: false },
          { label: "Operator", value: operator ?? "—", numeric: false },
          { label: "Produced", value: `${meters(run.produced_qty_m)} m` },
          { label: "Produced", value: `${kg(run.produced_qty_kg)} kg` },
          { label: "Waste by meters", value: pct(run.waste_pct_m) },
          { label: "Waste by weight", value: pct(run.waste_pct_kg) },
        ].map((d, i) => (
          <div key={i} className="bg-paper-000 p-4">
            <DataPoint label={d.label} value={d.value} numeric={d.numeric !== false} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SectionHeading>Stations</SectionHeading>
          <StationRail stations={stations} />
          <div className="mt-4 space-y-2 rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-4">
            <DataPoint label="Average speed" value={`${decimal(run.avg_speed_mpm, 0)} m/min`} />
            <DataPoint label="Top speed" value={`${decimal(run.max_speed_mpm, 0)} m/min`} />
            <DataPoint label="Waste" value={`${meters(run.waste_m)} m · ${kg(run.waste_kg)} kg`} />
            <DataPoint label="Briefing acknowledged" value={ackBy ? `${ackBy}, ${dateTime(run.briefing_ack_at)}` : "Not acknowledged"} numeric={false} />
            {supervisor && <DataPoint label="Supervisor" value={supervisor} numeric={false} />}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <section>
            <SectionHeading>The 8 stations</SectionHeading>
            <Table>
              <THead>
                <TR>
                  <TH numeric>Stn</TH>
                  <TH>Colour</TH>
                  <TH>Cylinder</TH>
                  <TH>Ink</TH>
                  <TH>Batch</TH>
                  <TH numeric>Visc start</TH>
                  <TH numeric>Visc run</TH>
                  <TH numeric>Dryer °C</TH>
                  <TH numeric>Impression</TH>
                  <TH numeric>Meters</TH>
                  <TH>Observation</TH>
                </TR>
              </THead>
              <TBody>
                {stations.map((s) => (
                  <TR key={s.id} className={s.is_idle ? "text-steel-400" : undefined}>
                    <TD numeric>{s.station_no}</TD>
                    <TD>{s.is_idle ? "Idle" : s.colour_name ?? "—"}</TD>
                    <TD numeric={false}>
                      <span data-numeric="">{s.cylinder_id ? cylMap.get(s.cylinder_id) ?? "—" : "—"}</span>
                    </TD>
                    <TD><span data-numeric="">{s.ink_product_id ? inkMap.get(s.ink_product_id) ?? "—" : "—"}</span></TD>
                    <TD><span data-numeric="">{s.ink_batch_id ? batchMap.get(s.ink_batch_id) ?? "—" : "—"}</span></TD>
                    <TD numeric>{decimal(s.initial_viscosity_sec)}</TD>
                    <TD numeric>{decimal(s.running_viscosity_sec)}</TD>
                    <TD numeric>{decimal(s.dryer_temp_c)}</TD>
                    <TD numeric>{decimal(s.impression_pressure)}</TD>
                    <TD numeric>{meters(s.meters_run)}</TD>
                    <TD className="max-w-64 text-[length:calc(var(--base)*0.86)]">
                      {s.observation ?? "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </section>

          <section>
            <SectionHeading>Machine settings</SectionHeading>
            <Card>
              <CardBody>
                {process ? (
                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <DataPoint label="Unwind" value={unit(process.unwind_tension_kg, "kg")} />
                    <DataPoint label="Infeed" value={unit(process.infeed_tension_kg, "kg")} />
                    <DataPoint label="Outfeed" value={unit(process.outfeed_tension_kg, "kg")} />
                    <DataPoint label="Rewind" value={unit(process.rewind_tension_kg, "kg")} />
                    <DataPoint label="Chill roll" value={unit(process.chill_roll_temp_c, "°C")} />
                    <DataPoint label="Main exhaust" value={unit(process.main_exhaust_pct, "%")} />
                    <DataPoint label="Supply air" value={unit(process.supply_air_pct, "%")} />
                    <DataPoint label="Static eliminator" value={process.static_eliminator_on ? "On" : "Off"} numeric={false} />
                    <DataPoint label="Registration" value={humanise(process.registration_mode)} numeric={false} />
                    <DataPoint label="Tolerance" value={unit(process.registration_tolerance_micron, "µm")} />
                    <DataPoint label="Ambient" value={unit(process.ambient_temp_c, "°C")} />
                    <DataPoint label="Humidity" value={unit(process.ambient_rh_pct, "%")} />
                    <DataPoint label="Adhesion tape" value={unit(process.adhesion_tape_test_pct, "%")} />
                    <DataPoint label="Solvent retention" value={unit(process.solvent_retention_mg_m2, "mg/m²")} />
                  </div>
                ) : (
                  <p className="text-ink-600">No machine settings recorded for this run.</p>
                )}
                {process?.remarks && (
                  <p className="mt-4 border-t border-steel-200 pt-3 text-[length:calc(var(--base)*0.92)] text-ink-900">
                    {process.remarks}
                  </p>
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <SectionHeading>Substrate</SectionHeading>
            <Card>
              {(subs ?? []).length === 0 ? (
                <EmptyState title="No reel recorded on this run." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {(subs ?? []).map((s) => {
                    const b = one<{
                      id: string
                      batch_no: string
                      material_type: string
                      thickness_micron: number
                      suppliers: { name: string } | null
                    }>(s.substrate_batches)
                    return (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <Link
                            href={`/substrates?batch=${b?.id}`}
                            data-numeric=""
                            className="font-semibold text-ink-900 hover:underline"
                          >
                            {b?.batch_no}
                          </Link>
                          <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                            {b?.suppliers?.name} · {b?.material_type} {b?.thickness_micron}µ
                            {s.roll_no ? ` · Roll ${s.roll_no}` : ""}
                          </p>
                          {s.observation && (
                            <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-900">
                              {s.observation}
                            </p>
                          )}
                        </div>
                        <p data-numeric="" className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                          {meters(s.meters_used)} m · {kg(s.kg_used)} kg
                          {s.dyne_at_machine ? ` · ${decimal(s.dyne_at_machine)} dyne` : ""}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading>Issues logged on this run</SectionHeading>
            <Card>
              {observations.length === 0 ? (
                <EmptyState title="Nothing was logged against this run." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {observations.map((o) => {
                    const station = stations.find((s) => s.id === o.run_station_id)
                    return (
                      <li key={o.id} className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink-900">{o.title}</span>
                          <Badge tone={severityTone(o.severity)}>{humanise(o.severity)}</Badge>
                          <span className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                            {humanise(o.area)}
                            {station ? ` · Station ${station.station_no}` : ""} · {dateTime(o.observed_at)}
                          </span>
                        </div>
                        {o.description && (
                          <p className="mt-1 text-[length:calc(var(--base)*0.92)] text-ink-900">
                            {o.description}
                          </p>
                        )}
                        {o.action_taken && (
                          <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-600">
                            Action: {o.action_taken}
                          </p>
                        )}
                        {o.next_run_note && (
                          <p className="mt-2 rounded-[var(--radius)] border border-signal-warn bg-signal-warn-bg px-3 py-2 text-[length:calc(var(--base)*0.86)]">
                            <span className="font-semibold text-signal-warn">
                              {o.next_run_note_cleared_at ? "Was flagged for next run: " : "Check next run: "}
                            </span>
                            {o.next_run_note}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>

          {run.remarks && (
            <section>
              <SectionHeading>Remarks</SectionHeading>
              <Card>
                <CardBody>
                  <p className="text-ink-900">{run.remarks}</p>
                </CardBody>
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

function unit(v: unknown, u: string): string {
  if (v === null || v === undefined || v === "") return "—"
  return `${decimal(v as number)} ${u}`
}
