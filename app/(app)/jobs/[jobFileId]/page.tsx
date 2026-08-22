import Link from "next/link"
import { notFound } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody } from "@/components/ui/card"
import { Badge, runResultTone, severityTone, humanise } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataPoint } from "@/components/ui/field"
import { Stat } from "@/components/ui/stat"
import { WearBar } from "@/components/cylinder/WearGauge"
import { StationRail } from "@/components/run/StationRail"
import { meters, pct, decimal, shortDate, relativeDays } from "@/lib/format"
import { cn } from "@/lib/utils"
import { one } from "@/lib/rel"

export const metadata = { title: "Job 360" }

/**
 * Job 360 -- plan Section 10.1.
 *
 * Everything about one job on one page, in the order the questions get asked:
 * what is it, how has it run, what is on the machine, what is wearing out,
 * what keeps going wrong, and what is still open.
 *
 * The run history strip is horizontal chips carrying the machine code, which
 * is not decoration: because jobs move between machines, the machine code is
 * usually the first thing that explains an outlier.
 */
export default async function Job360Page({
  params,
}: {
  params: Promise<{ jobFileId: string }>
}) {
  const { jobFileId } = await params
  await requireProfile()
  const supabase = await createClient()

  const { data: job } = await supabase
    .from("job_files")
    .select(
      `id, job_file_no, job_no, product_name, structure, no_of_colours, status, notes,
       reel_width_mm, repeat_length_mm, ups,
       customers(id, name), machines(code)`
    )
    .eq("id", jobFileId)
    .maybeSingle()

  if (!job) notFound()

  const [revs, runs, obs] = await Promise.all([
    supabase
      .from("artwork_revisions")
      .select("id, revision_label, revision_no, revision_date, shade_card_no, change_summary, customer_approval, is_current")
      .eq("job_file_id", jobFileId)
      .order("revision_no", { ascending: false }),
    supabase
      .from("runs")
      .select("id, run_no, run_date, status, result, produced_qty_m, waste_pct_m, waste_pct_kg, avg_speed_mpm, machine_id, machines(code)")
      .eq("job_file_id", jobFileId)
      .is("deleted_at", null)
      .order("run_no", { ascending: false }),
    supabase
      .from("observations")
      .select("id, title, area, severity, next_run_note, next_run_note_cleared_at, observed_at, run_id")
      .eq("job_file_id", jobFileId)
      .order("observed_at", { ascending: false }),
  ])

  const revisions = revs.data ?? []
  const runList = runs.data ?? []
  const observations = obs.data ?? []
  const currentRev = revisions.find((r) => r.is_current)

  const completed = runList.filter((r) => r.waste_pct_m !== null)
  const avgWaste =
    completed.length > 0
      ? completed.reduce((a, r) => a + Number(r.waste_pct_m ?? 0), 0) / completed.length
      : null
  const best = completed.length
    ? completed.reduce((a, b) => (Number(a.waste_pct_m) <= Number(b.waste_pct_m) ? a : b))
    : null

  // Machine spread. Because jobs move, this line is why an outlier makes sense.
  const byMachine = new Map<string, number>()
  for (const r of runList) {
    const code = one<{ code: string }>(r.machines)?.code ?? "—"
    byMachine.set(code, (byMachine.get(code) ?? 0) + 1)
  }

  const openNotes = observations.filter(
    (o) => o.next_run_note && !o.next_run_note_cleared_at
  )

  // Recurring: anything logged twice or more against this job.
  const recurring = new Map<string, { area: string; title: string; count: number }>()
  for (const o of observations) {
    const key = `${o.area}|${o.title}`
    const e = recurring.get(key) ?? { area: o.area, title: o.title, count: 0 }
    e.count++
    recurring.set(key, e)
  }
  const repeats = [...recurring.values()].filter((r) => r.count >= 2).sort((a, b) => b.count - a.count)

  // The current 8 stations, taken from the most recent run.
  const latestRun = runList[0]
  const { data: stations } = latestRun
    ? await supabase
        .from("run_stations")
        .select("station_no, colour_name, is_idle, cylinder_id, meters_run, running_viscosity_sec, previous_issue_note, ink_product_id, ink_batch_id")
        .eq("run_id", latestRun.id)
        .order("station_no")
    : { data: [] }

  const cylIds = (stations ?? []).map((s) => s.cylinder_id).filter(Boolean) as string[]
  const { data: cylinders } = cylIds.length
    ? await supabase
        .from("v_cylinder_summary")
        .select("id, cylinder_no, colour_name, surface_meters, life_limit_meters, life_used_pct, condition")
        .in("id", cylIds)
    : { data: [] }

  const cylMap = new Map((cylinders ?? []).map((c) => [c.id, c]))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Job files", href: "/jobs" }, { label: job.job_file_no }]}
        title={`${job.job_file_no} · ${job.job_no}`}
        subtitle={
          <>
            {one<{ name: string }>(job.customers)?.name} · {job.product_name} ·{" "}
            {job.structure} · {job.no_of_colours} colours
            {currentRev ? ` · ${currentRev.revision_label}` : ""}
            {currentRev?.shade_card_no ? ` · ${currentRev.shade_card_no}` : ""}
          </>
        }
        action={
          <>
            <Link
              href={`/jobs/${jobFileId}/artwork`}
              className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 font-semibold text-ink-900 hover:bg-paper-100"
            >
              Artwork
            </Link>
            <Link
              href={`/jobs/${jobFileId}/issues`}
              className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 font-semibold text-ink-900 hover:bg-paper-100"
            >
              Issues
            </Link>
            <Link
              href={`/jobs/${jobFileId}/briefing`}
              className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] bg-ink-900 px-4 font-semibold text-paper-000 hover:bg-ink-600"
            >
              Pre run briefing
            </Link>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={job.status === "active" ? "ok" : job.status === "on_hold" ? "warn" : "neutral"}>
          {humanise(job.status)}
        </Badge>
        {currentRev && (
          <Badge tone={currentRev.customer_approval === "approved" ? "ok" : currentRev.customer_approval === "rejected" ? "critical" : "warn"}>
            Approval {humanise(currentRev.customer_approval)}
          </Badge>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Runs" value={runList.length} hint={[...byMachine.entries()].map(([m, n]) => `${m} ×${n}`).join(", ") || "None yet"} />
        <Stat
          label="Average waste"
          value={avgWaste === null ? "—" : pct(avgWaste)}
          tone={avgWaste === null ? "neutral" : avgWaste > 5 ? "critical" : avgWaste > 4 ? "warn" : "ok"}
          hint="By meters"
        />
        <Stat
          label="Best run"
          value={best ? pct(best.waste_pct_m) : "—"}
          tone="ok"
          hint={best ? `Run ${best.run_no} on ${one<{ code: string }>(best.machines)?.code}` : "No completed run yet"}
        />
        <Stat
          label="Open notes"
          value={openNotes.length}
          tone={openNotes.length > 0 ? "warn" : "ok"}
          hint="Must be cleared before the next run"
          href={`/jobs/${jobFileId}/issues`}
        />
      </div>

      {/* Run history strip */}
      <section className="mb-6">
        <SectionHeading
          action={
            <Link href="/runs" className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">
              All runs
            </Link>
          }
        >
          Run history
        </SectionHeading>
        {runList.length === 0 ? (
          <Card>
            <EmptyState title="No runs yet. The first run starts from a machine tablet, or from the briefing above." />
          </Card>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...runList].reverse().map((r) => {
              const code = one<{ code: string }>(r.machines)?.code ?? "—"
              const tone = runResultTone(r.result)
              return (
                <Link
                  key={r.id}
                  href={`/runs/${r.id}`}
                  className={cn(
                    "flex min-w-32 shrink-0 flex-col gap-0.5 rounded-[var(--radius)] border p-3 transition-colors",
                    tone === "ok" && "border-signal-ok bg-signal-ok-bg",
                    tone === "warn" && "border-signal-warn bg-signal-warn-bg",
                    tone === "critical" && "border-signal-critical bg-signal-critical-bg",
                    tone === "neutral" && "border-steel-200 bg-paper-000",
                    "hover:border-ink-900"
                  )}
                >
                  <span data-numeric="" className="font-semibold text-ink-900">
                    Run {r.run_no}
                  </span>
                  <span data-numeric="" className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                    {code} · {shortDate(r.run_date)}
                  </span>
                  <span data-numeric="" className="text-[length:calc(var(--base)*0.86)] text-ink-900">
                    {pct(r.waste_pct_m)} waste
                  </span>
                  <span className="text-[length:calc(var(--base)*0.78)] text-ink-600">
                    {humanise(r.result ?? r.status)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeading>
              Stations {latestRun ? `on Run ${latestRun.run_no}` : ""}
            </SectionHeading>
            {(stations ?? []).length === 0 ? (
              <Card>
                <EmptyState title="No station data yet. It appears after the first run is entered." />
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-steel-200">
                  {(stations ?? []).map((s) => {
                    const c = s.cylinder_id ? cylMap.get(s.cylinder_id) : null
                    return (
                      <li key={s.station_no} className="flex items-center gap-4 p-3">
                        <span data-numeric="" className="w-6 shrink-0 text-center text-ink-600">
                          {s.station_no}
                        </span>
                        <span className="w-32 shrink-0 truncate">
                          {s.is_idle ? (
                            <span className="text-steel-400">Idle</span>
                          ) : (
                            s.colour_name ?? <span className="text-steel-400">Not set</span>
                          )}
                        </span>
                        {c ? (
                          <>
                            <Link
                              href={`/cylinders/${c.id}`}
                              data-numeric=""
                              className="w-24 shrink-0 truncate font-semibold text-ink-900 hover:underline"
                            >
                              {c.cylinder_no}
                            </Link>
                            <WearBar
                              className="flex-1"
                              used={Number(c.surface_meters ?? 0)}
                              limit={Number(c.life_limit_meters ?? 0)}
                              pctUsed={Number(c.life_used_pct ?? 0)}
                            />
                          </>
                        ) : (
                          <span className="flex-1 text-steel-400">No cylinder recorded</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <SectionHeading
              action={
                <Link href={`/jobs/${jobFileId}/artwork`} className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">
                  Manage
                </Link>
              }
            >
              Artwork history
            </SectionHeading>
            <Card>
              {revisions.length === 0 ? (
                <EmptyState title="No revisions. A job cannot run until one exists." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {revisions.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span data-numeric="" className="font-semibold text-ink-900">
                            {r.revision_label}
                          </span>
                          {r.is_current && <Badge tone="ok">Current</Badge>}
                          <span data-numeric="" className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                            {shortDate(r.revision_date)}
                            {r.shade_card_no ? ` · ${r.shade_card_no}` : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-[length:calc(var(--base)*0.92)] text-ink-900">
                          {r.change_summary}
                        </p>
                      </div>
                      <Badge
                        tone={r.customer_approval === "approved" ? "ok" : r.customer_approval === "rejected" ? "critical" : "warn"}
                      >
                        {humanise(r.customer_approval)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading>Recurring issues</SectionHeading>
            <Card>
              {repeats.length === 0 ? (
                <EmptyState title="Nothing has gone wrong twice on this job." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {repeats.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 p-3">
                      <span className="min-w-0">
                        <span className="block truncate text-ink-900">{r.title}</span>
                        <span className="block text-[length:calc(var(--base)*0.8)] text-steel-400">
                          {humanise(r.area)}
                        </span>
                      </span>
                      <span data-numeric="" className="shrink-0 font-semibold text-signal-warn">
                        {r.count}×
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeading>Job details</SectionHeading>
            <Card>
              <CardBody className="space-y-3">
                <DataPoint label="Customer" value={one<{ name: string }>(job.customers)?.name} numeric={false} />
                <DataPoint label="Default machine" value={one<{ code: string }>(job.machines)?.code} />
                <DataPoint label="Reel width" value={job.reel_width_mm ? `${decimal(job.reel_width_mm)} mm` : null} />
                <DataPoint label="Repeat length" value={job.repeat_length_mm ? `${decimal(job.repeat_length_mm)} mm` : null} />
                <DataPoint label="Ups" value={job.ups} />
                <DataPoint label="Total produced" value={`${meters(runList.reduce((a, r) => a + Number(r.produced_qty_m ?? 0), 0))} m`} />
                {job.notes && (
                  <div className="border-t border-steel-200 pt-3">
                    <p className="text-[length:calc(var(--base)*0.86)] text-ink-900">{job.notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <SectionHeading
              action={
                <Link href={`/jobs/${jobFileId}/issues`} className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">
                  See all
                </Link>
              }
            >
              Open next-run notes
            </SectionHeading>
            <Card>
              {openNotes.length === 0 ? (
                <EmptyState title="Nothing outstanding. The next run starts clean." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {openNotes.slice(0, 6).map((o) => (
                    <li key={o.id} className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{o.title}</span>
                        <Badge tone={severityTone(o.severity)}>{humanise(o.severity)}</Badge>
                      </div>
                      <p className="mt-0.5 text-[length:calc(var(--base)*0.86)] text-ink-600">
                        {o.next_run_note}
                      </p>
                      <p className="text-[length:calc(var(--base)*0.78)] text-steel-400">
                        {humanise(o.area)} · {relativeDays(o.observed_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {(stations ?? []).length > 0 && (
            <section>
              <SectionHeading>Station rail</SectionHeading>
              <StationRail stations={stations ?? []} />
            </section>
          )}
        </div>
      </div>
    </>
  )
}
