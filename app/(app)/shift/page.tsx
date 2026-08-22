import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Badge, runStatusTone, severityTone, humanise } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { clearNextRunNote } from "@/lib/actions/observations"
import { meters, pct, shortDate, relativeDays } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Shift board" }

/**
 * Where the supervisor lands -- plan Section 3.2.
 *
 * Runs in progress across machines, runs awaiting close, and the open
 * next-run notes only this role can clear. This is the role that keeps the
 * data honest, so the screen is a work queue rather than a report.
 */
export default async function ShiftPage() {
  const profile = await requireRole("admin", "supervisor", "planner", "qc")
  const supabase = await createClient()

  const [inProgress, awaitingClose, openNotes, partials] = await Promise.all([
    supabase
      .from("runs")
      .select("id, run_no, run_date, shift, status, machine_id, job_file_id, machines(code), job_files(job_file_no, job_no, product_name), profiles!runs_operator_id_fkey(full_name)")
      .in("status", ["setup", "running"])
      .is("deleted_at", null)
      .order("run_date", { ascending: false }),
    supabase
      .from("runs")
      .select("id, run_no, run_date, status, result, produced_qty_m, waste_pct_m, locked_at, machines(code), job_files(job_file_no, job_no)")
      .eq("status", "completed")
      .is("locked_at", null)
      .is("deleted_at", null)
      .order("run_date", { ascending: false })
      .limit(15),
    supabase
      .from("observations")
      .select("id, title, area, severity, next_run_note, observed_at, job_file_id, run_id, job_files(job_file_no), machines(code)")
      .not("next_run_note", "is", null)
      .is("next_run_note_cleared_at", null)
      .order("severity", { ascending: false })
      .order("observed_at", { ascending: false }),
    supabase
      .from("runs")
      .select("id, run_no, run_date, machines(code), job_files(job_file_no)")
      .eq("status", "setup")
      .is("deleted_at", null)
      .lt("run_date", new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)),
  ])

  const running = inProgress.data ?? []
  const toClose = awaitingClose.data ?? []
  const notes = openNotes.data ?? []
  const stale = partials.data ?? []
  const canClear = ["admin", "supervisor", "qc"].includes(profile.role)

  return (
    <>
      <PageHeader
        title="Shift board"
        subtitle="What is on the presses now, what is waiting to be closed, and what needs clearing before the next run."
      />

      {stale.length > 0 && (
        <div className="mb-6 rounded-[var(--radius)] border border-signal-warn bg-signal-warn-bg p-4">
          <p className="font-semibold text-signal-warn">
            <span aria-hidden="true">▲ </span>
            {stale.length} run{stale.length === 1 ? "" : "s"} left partial from a
            previous day
          </p>
          <p className="mt-1 text-[length:calc(var(--base)*0.9)] text-ink-900">
            {stale.map((r) => {
              const job = one<{ job_file_no: string }>(r.job_files)
              const m = one<{ code: string }>(r.machines)
              return (
                <Link key={r.id} href={`/runs/${r.id}`} className="mr-3 underline">
                  Run {r.run_no} · {job?.job_file_no} · {m?.code}
                </Link>
              )
            })}
          </p>
          <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-600">
            A supervisor can complete a run the operator left partial.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading>On the presses now</SectionHeading>
          <Card>
            {running.length === 0 ? (
              <EmptyState title="Nothing is running. Runs appear here the moment an operator acknowledges a briefing." />
            ) : (
              <ul className="divide-y divide-steel-200">
                {running.map((r) => {
                  const job = one<{
                    job_file_no: string
                    job_no: string
                    product_name: string
                  }>(r.job_files)
                  const m = one<{ code: string }>(r.machines)
                  const op = one<{ full_name: string }>(r.profiles)
                  return (
                    <li key={r.id} className="flex items-center gap-4 p-4">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius)] bg-paper-100">
                        <span className="text-[length:calc(var(--base)*0.66)] uppercase text-ink-600">
                          Mc
                        </span>
                        <span data-numeric="" className="font-semibold text-ink-900">
                          {m?.code}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/runs/${r.id}`}
                          data-numeric=""
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          Run {r.run_no} · {job?.job_file_no}
                        </Link>
                        <p className="truncate text-[length:calc(var(--base)*0.86)] text-ink-600">
                          {job?.product_name}
                        </p>
                        <p className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                          {op?.full_name ?? "No operator recorded"}
                          {r.shift ? ` · ${r.shift} shift` : ""} · {shortDate(r.run_date)}
                        </p>
                      </div>
                      <Badge tone={runStatusTone(r.status)}>{humanise(r.status)}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <SectionHeading>Closed, not yet locked</SectionHeading>
          <Card>
            {toClose.length === 0 ? (
              <EmptyState title="Nothing waiting. Completed runs lock themselves 24 hours after they end." />
            ) : (
              <ul className="divide-y divide-steel-200">
                {toClose.map((r) => {
                  const job = one<{ job_file_no: string; job_no: string }>(r.job_files)
                  const m = one<{ code: string }>(r.machines)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <Link
                          href={`/runs/${r.id}`}
                          data-numeric=""
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          Run {r.run_no} · {job?.job_file_no}
                        </Link>
                        <p data-numeric="" className="text-[length:calc(var(--base)*0.82)] text-ink-600">
                          {m?.code} · {shortDate(r.run_date)} · {meters(r.produced_qty_m)} m
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone={runStatusTone(r.status)}>{humanise(r.result)}</Badge>
                        <p data-numeric="" className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                          {pct(r.waste_pct_m)} waste
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeading>Open next-run notes</SectionHeading>
        <Card>
          {notes.length === 0 ? (
            <EmptyState title="Nothing flagged. Every note an operator raised has been cleared." />
          ) : (
            <ul className="divide-y divide-steel-200">
              {notes.map((n) => {
                const job = one<{ job_file_no: string }>(n.job_files)
                const m = one<{ code: string }>(n.machines)
                return (
                  <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${n.job_file_id}/issues`}
                          data-numeric=""
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          {job?.job_file_no}
                        </Link>
                        <Badge tone={severityTone(n.severity)}>{humanise(n.severity)}</Badge>
                        <span className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                          {humanise(n.area)}
                          {m?.code ? ` · ${m.code}` : ""} · {relativeDays(n.observed_at)}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-ink-900">{n.title}</p>
                      <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
                        {n.next_run_note}
                      </p>
                    </div>
                    {canClear && (
                      <form action={clearNextRunNote} className="shrink-0">
                        <input type="hidden" name="observationId" value={n.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Clear note
                        </Button>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>
    </>
  )
}
