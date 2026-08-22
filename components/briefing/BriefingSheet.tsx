import * as React from "react"
import { Alert } from "@/components/ui/alert"
import { Badge, severityTone, humanise } from "@/components/ui/badge"
import { meters, pct, decimal, shortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type Briefing = {
  job?: {
    id?: string
    job_file_no?: string
    job_no?: string
    customer?: string
    product_name?: string
    structure?: string
    no_of_colours?: number
    revision_label?: string
    shade_card_no?: string
    customer_approval?: string
  } | null
  machine?: { id?: string; code?: string; name?: string } | null
  machine_change?: {
    previous_machine?: string
    new_machine?: string
    warning?: string
  } | null
  last_run?: Record<string, unknown> | null
  last_run_machine?: string | null
  best_run?: Record<string, unknown> | null
  open_next_run_notes?: {
    id: string
    area: string
    severity: string
    title: string
    note: string
    from_run?: number | null
    station?: number | null
  }[]
  recurring_issues?: { area: string; title: string; occurrences: number; last_seen: string }[]
  cylinder_alerts?: {
    cylinder_no: string
    colour_name?: string | null
    station_no?: number | null
    total_meters?: number | null
    life_limit_meters?: number | null
    life_used_pct?: number | null
    condition?: string | null
    ownership?: string | null
    last_cleaning?: string | null
  }[]
  last_run_stations?: {
    station_no: number
    colour_name?: string | null
    is_idle?: boolean | null
    cylinder_no?: string | null
    ink_code?: string | null
    ink_batch?: string | null
    initial_viscosity_sec?: number | null
    running_viscosity_sec?: number | null
    dryer_temp_c?: number | null
    impression_pressure?: number | null
    observation?: string | null
  }[]
  last_run_process?: Record<string, number | string | null> | null
  substrate_watchlist?: {
    batch_no: string
    supplier: string
    material_type: string
    thickness_micron: number
    issue_count: number
  }[]
}

/**
 * The Pre Run Briefing -- plan Section 10.2.
 *
 * The single most valuable object in the system. Everything else in the
 * product is plumbing that feeds this sheet. It renders identically as an
 * A4 print for the floor and full screen on the kiosk before a run can start.
 *
 * Order is deliberate and is not the order the data arrives in: what changed,
 * what you must check, what is about to wear out, what keeps going wrong, then
 * the reference settings. A briefing that opened with reference settings would
 * bury the three notes that are the reason to read it.
 */
export function BriefingSheet({ b, dense = false }: { b: Briefing; dense?: boolean }) {
  const job = b.job ?? {}
  const notes = b.open_next_run_notes ?? []
  const alerts = b.cylinder_alerts ?? []
  const recurring = b.recurring_issues ?? []
  const stations = b.last_run_stations ?? []
  const proc = b.last_run_process ?? null
  const watchlist = b.substrate_watchlist ?? []
  const lastRun = b.last_run as Record<string, unknown> | null
  const bestRun = b.best_run as Record<string, unknown> | null

  const hasHistory = Boolean(lastRun?.id)

  return (
    <article className="space-y-[var(--gap)]">
      {/* Masthead */}
      <header className="print-break rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[length:calc(var(--base)*0.78)] font-semibold uppercase tracking-wide text-ink-600">
              Pre run briefing
            </p>
            <h2
              data-numeric=""
              className="text-[length:calc(var(--base)*1.5)] font-semibold text-ink-900"
            >
              {job.job_file_no} · {job.job_no}
            </h2>
            <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
              {job.customer} · {job.product_name} · {job.structure}
            </p>
            <p className="text-[length:calc(var(--base)*0.86)] text-steel-400">
              {job.revision_label ?? "No revision"}
              {job.shade_card_no ? ` · Shade card ${job.shade_card_no}` : ""}
              {job.no_of_colours ? ` · ${job.no_of_colours} colours` : ""}
              {job.customer_approval ? ` · Approval ${humanise(job.customer_approval)}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-ink-600">
              Machine
            </p>
            <p
              data-numeric=""
              className="text-[length:calc(var(--base)*1.5)] font-semibold text-ink-900"
            >
              {b.machine?.code ?? "—"}
            </p>
            <p className="text-[length:calc(var(--base)*0.8)] text-steel-400">
              {shortDate(new Date())}
            </p>
          </div>
        </div>
      </header>

      {/* On a first run the briefing is mostly empty, which is itself
          information: there is no history yet (plan Section 2.1, step 5). */}
      {!hasHistory && (
        <Alert tone="info" title="No history for this job yet">
          This job has no completed run to learn from. Record what you change
          and why, and the next run opens with it.
        </Alert>
      )}

      {b.machine_change && (
        <Alert tone="warn" title="Machine change">
          Last run was on {b.machine_change.previous_machine}, this run is on{" "}
          {b.machine_change.new_machine}. {b.machine_change.warning} The settings
          below are from the last time this job ran on{" "}
          {b.machine_change.new_machine}.
        </Alert>
      )}

      {/* Must check before start */}
      <Section
        title="Must check before start"
        count={notes.length}
        empty="No open notes from previous runs."
      >
        {notes.length > 0 && (
          <ol className="divide-y divide-steel-200">
            {notes.map((n, i) => (
              <li key={n.id} className="flex gap-3 p-[var(--gap)]">
                <span
                  data-numeric=""
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-signal-warn text-[length:calc(var(--base)*0.8)] font-semibold text-signal-warn"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{n.title}</span>
                    <Badge tone={severityTone(n.severity)}>{humanise(n.severity)}</Badge>
                    <span className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                      {humanise(n.area)}
                      {n.station ? ` · Station ${n.station}` : ""}
                      {n.from_run ? ` · from Run ${n.from_run}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-[length:calc(var(--base)*0.92)] text-ink-900">
                    {n.note}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Cylinder alerts */}
      <Section
        title="Cylinder alerts"
        count={alerts.length}
        empty="Every cylinder on the last run was inside its life limit and in good condition."
      >
        {alerts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[length:calc(var(--base)*0.92)]">
              <thead className="bg-paper-100">
                <tr className="text-left text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-ink-600">
                  <th className="px-3 py-2">Stn</th>
                  <th className="px-3 py-2">Cylinder</th>
                  <th className="px-3 py-2">Colour</th>
                  <th className="px-3 py-2 text-right">Surface / limit</th>
                  <th className="px-3 py-2 text-right">Used</th>
                  <th className="px-3 py-2">Condition</th>
                  <th className="px-3 py-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((c, i) => {
                  const critical = Number(c.life_used_pct ?? 0) >= 95
                  return (
                    <tr
                      key={`${c.cylinder_no}-${i}`}
                      className={cn(
                        "border-t border-steel-200",
                        critical ? "bg-signal-critical-bg" : "bg-signal-warn-bg"
                      )}
                    >
                      <td data-numeric="" className="px-3 py-2">
                        {c.station_no ?? "—"}
                      </td>
                      <td data-numeric="" className="px-3 py-2 font-semibold">
                        {c.cylinder_no}
                      </td>
                      <td className="px-3 py-2">{c.colour_name ?? "—"}</td>
                      <td data-numeric="" className="px-3 py-2 text-right">
                        {meters(c.total_meters)} / {meters(c.life_limit_meters)} m
                      </td>
                      <td
                        data-numeric=""
                        className={cn(
                          "px-3 py-2 text-right font-semibold",
                          critical ? "text-signal-critical" : "text-signal-warn"
                        )}
                      >
                        {pct(c.life_used_pct, 0)}
                      </td>
                      <td className="px-3 py-2">{humanise(c.condition)}</td>
                      <td className="px-3 py-2 text-[length:calc(var(--base)*0.86)] text-ink-600">
                        {c.ownership === "customer" ? "Customer owned" : "Company"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Recurring issues */}
      <Section
        title="Recurring issues"
        subtitle="Logged twice or more on this job"
        count={recurring.length}
        empty="Nothing has gone wrong twice on this job."
      >
        {recurring.length > 0 && (
          <ul className="divide-y divide-steel-200">
            {recurring.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-[var(--gap)] py-2">
                <span className="min-w-0">
                  <span className="block truncate text-ink-900">{r.title}</span>
                  <span className="block text-[length:calc(var(--base)*0.8)] text-steel-400">
                    {humanise(r.area)} · last seen {shortDate(r.last_seen)}
                  </span>
                </span>
                <span
                  data-numeric=""
                  className="shrink-0 font-semibold text-signal-warn"
                >
                  {r.occurrences}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {!dense && (
        <>
          {/* Reference settings */}
          <div className="grid gap-[var(--gap)] lg:grid-cols-2">
            <Section
              title={
                lastRun
                  ? `Last run on this machine · Run ${lastRun.run_no} · ${shortDate(
                      String(lastRun.run_date ?? "")
                    )}`
                  : "Last run"
              }
              empty="No completed run to reference yet."
              count={lastRun ? 1 : 0}
            >
              {lastRun && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-[var(--gap)] sm:grid-cols-3">
                  <Metric label="Avg speed" value={`${decimal(lastRun.avg_speed_mpm as number, 0)} m/min`} />
                  <Metric label="Waste (m)" value={pct(lastRun.waste_pct_m as number)} />
                  <Metric label="Waste (kg)" value={pct(lastRun.waste_pct_kg as number)} />
                  <Metric label="Produced" value={`${meters(lastRun.produced_qty_m as number)} m`} />
                  <Metric label="Result" value={humanise(lastRun.result as string)} />
                  <Metric label="Machine" value={b.last_run_machine ?? "—"} />
                </dl>
              )}
            </Section>

            <Section
              title={
                bestRun
                  ? `Best run · Run ${bestRun.run_no} · ${shortDate(String(bestRun.run_date ?? ""))}`
                  : "Best run"
              }
              subtitle={
                bestRun && bestRun.same_machine === false
                  ? `Lowest waste this job has achieved, but on ${bestRun.machine_code ?? "another machine"}. Treat the settings as a hint, not a target.`
                  : "Lowest waste this job has achieved on this machine"
              }
              empty="No completed, accepted run to benchmark against yet."
              count={bestRun ? 1 : 0}
            >
              {bestRun && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-[var(--gap)] sm:grid-cols-3">
                  <Metric
                    label="Waste (m)"
                    value={pct(bestRun.waste_pct_m as number)}
                    tone="ok"
                  />
                  <Metric label="Waste (kg)" value={pct(bestRun.waste_pct_kg as number)} />
                  <Metric
                    label="Avg speed"
                    value={`${decimal(bestRun.avg_speed_mpm as number, 0)} m/min`}
                  />
                </dl>
              )}
            </Section>
          </div>

          {proc && (
            <Section title="Machine settings from that run" count={1} empty="">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-[var(--gap)] sm:grid-cols-4">
                <Metric label="Unwind" value={unit(proc.unwind_tension_kg, "kg")} />
                <Metric label="Infeed" value={unit(proc.infeed_tension_kg, "kg")} />
                <Metric label="Outfeed" value={unit(proc.outfeed_tension_kg, "kg")} />
                <Metric label="Rewind" value={unit(proc.rewind_tension_kg, "kg")} />
                <Metric label="Chill roll" value={unit(proc.chill_roll_temp_c, "°C")} />
                <Metric label="Main exhaust" value={unit(proc.main_exhaust_pct, "%")} />
                <Metric label="Supply air" value={unit(proc.supply_air_pct, "%")} />
                <Metric label="Registration" value={humanise(proc.registration_mode as string)} />
                <Metric label="Ambient" value={unit(proc.ambient_temp_c, "°C")} />
                <Metric label="Humidity" value={unit(proc.ambient_rh_pct, "%")} />
                <Metric label="Adhesion tape" value={unit(proc.adhesion_tape_test_pct, "%")} />
                <Metric
                  label="Solvent retention"
                  value={unit(proc.solvent_retention_mg_m2, "mg/m²")}
                />
              </dl>
            </Section>
          )}

          {stations.length > 0 && (
            <Section title="Stations on that run" count={stations.length} empty="">
              <div className="overflow-x-auto">
                <table className="w-full text-[length:calc(var(--base)*0.92)]">
                  <thead className="bg-paper-100">
                    <tr className="text-left text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-ink-600">
                      <th className="px-3 py-2">Stn</th>
                      <th className="px-3 py-2">Colour</th>
                      <th className="px-3 py-2">Cylinder</th>
                      <th className="px-3 py-2">Ink</th>
                      <th className="px-3 py-2">Batch</th>
                      <th className="px-3 py-2 text-right">Visc start</th>
                      <th className="px-3 py-2 text-right">Visc run</th>
                      <th className="px-3 py-2 text-right">Dryer</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((s) => (
                      <tr
                        key={s.station_no}
                        className={cn(
                          "border-t border-steel-200",
                          s.is_idle && "text-steel-400",
                          s.observation && "bg-signal-warn-bg"
                        )}
                      >
                        <td data-numeric="" className="px-3 py-2">{s.station_no}</td>
                        <td className="px-3 py-2">{s.is_idle ? "Idle" : s.colour_name ?? "—"}</td>
                        <td data-numeric="" className="px-3 py-2">{s.cylinder_no ?? "—"}</td>
                        <td data-numeric="" className="px-3 py-2">{s.ink_code ?? "—"}</td>
                        <td data-numeric="" className="px-3 py-2">{s.ink_batch ?? "—"}</td>
                        <td data-numeric="" className="px-3 py-2 text-right">
                          {decimal(s.initial_viscosity_sec)}
                        </td>
                        <td data-numeric="" className="px-3 py-2 text-right">
                          {decimal(s.running_viscosity_sec)}
                        </td>
                        <td data-numeric="" className="px-3 py-2 text-right">
                          {decimal(s.dryer_temp_c)}
                        </td>
                        <td className="px-3 py-2 text-[length:calc(var(--base)*0.86)]">
                          {s.observation ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {watchlist.length > 0 && (
            <Section title="Substrate watchlist" count={watchlist.length} empty="">
              <ul className="divide-y divide-steel-200">
                {watchlist.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-[var(--gap)] py-2">
                    <span className="min-w-0">
                      <span data-numeric="" className="block truncate font-semibold text-ink-900">
                        {s.batch_no}
                      </span>
                      <span className="block truncate text-[length:calc(var(--base)*0.82)] text-ink-600">
                        {s.supplier} · {s.material_type} {s.thickness_micron}µ
                      </span>
                    </span>
                    <span data-numeric="" className="shrink-0 font-semibold text-signal-warn">
                      {s.issue_count} issue{s.issue_count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}
    </article>
  )
}

function Section({
  title,
  subtitle,
  count,
  empty,
  children,
}: {
  title: string
  subtitle?: string
  count?: number
  empty: string
  children?: React.ReactNode
}) {
  const isEmpty = !count || count === 0
  return (
    <section className="print-break overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-000">
      <div className="flex items-baseline justify-between gap-3 border-b border-steel-200 px-[var(--gap)] py-2.5">
        <div>
          <h3 className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[length:calc(var(--base)*0.8)] text-steel-400">{subtitle}</p>
          )}
        </div>
        {typeof count === "number" && count > 0 && (
          <span data-numeric="" className="text-[length:calc(var(--base)*0.86)] text-ink-600">
            {count}
          </span>
        )}
      </div>
      {isEmpty ? (
        <p className="px-[var(--gap)] py-3 text-[length:calc(var(--base)*0.92)] text-ink-600">
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: "ok"
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-steel-400">
        {label}
      </dt>
      <dd
        data-numeric=""
        className={cn(
          "truncate text-[length:var(--base)] font-semibold",
          tone === "ok" ? "text-signal-ok" : "text-ink-900"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function unit(v: unknown, u: string): string {
  if (v === null || v === undefined || v === "") return "—"
  return `${decimal(v as number)} ${u}`
}
