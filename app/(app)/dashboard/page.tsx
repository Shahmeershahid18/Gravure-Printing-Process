import Link from "next/link"
import { requireProfile } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Stat } from "@/components/ui/stat"
import { Card, CardBody } from "@/components/ui/card"
import { Badge, severityTone, humanise, runResultTone } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { WearBar } from "@/components/cylinder/WearGauge"
import { meters, pct, shortDate, relativeDays } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Dashboard" }

/**
 * The intelligence dashboard -- plan Section 11, Phase 7.
 *
 * Done when you can answer a quality question without opening a single run
 * record. The tiles are therefore questions, not counts: how much are we
 * wasting, what is about to wear out, what has somebody flagged for the next
 * shift.
 */
export default async function DashboardPage() {
  await requireProfile()
  const supabase = await createClient()

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)

  const [runsWeek, wearing, notes, issues, recent] = await Promise.all([
    supabase
      .from("v_run_summary")
      .select("id, run_no, run_date, status, result, waste_pct_m, waste_pct_kg, machine_code, total_meters_run")
      .gte("run_date", weekAgo)
      .order("run_date", { ascending: false }),
    supabase
      .from("v_cylinder_summary")
      .select("id, cylinder_no, colour_name, surface_meters, life_limit_meters, life_used_pct, condition, status")
      .gte("life_used_pct", 80)
      .not("status", "in", "(with_customer,at_engraver,scrapped)")
      .order("life_used_pct", { ascending: false })
      .limit(8),
    supabase
      .from("observations")
      .select("id, title, area, severity, next_run_note, observed_at, job_file_id, job_files(job_file_no, job_no), machines(code)")
      .not("next_run_note", "is", null)
      .is("next_run_note_cleared_at", null)
      .order("severity", { ascending: false })
      .order("observed_at", { ascending: false })
      .limit(8),
    supabase.from("observations").select("area").gte("observed_at", weekAgo),
    supabase
      .from("v_run_summary")
      .select("id, run_no, run_date, result, waste_pct_m, machine_code, job_file_id")
      .order("run_date", { ascending: false })
      .limit(6),
  ])

  const weekRuns = runsWeek.data ?? []
  const completed = weekRuns.filter((r) => r.status === "completed" && r.waste_pct_m !== null)
  const avgWaste =
    completed.length > 0
      ? completed.reduce((a, r) => a + Number(r.waste_pct_m ?? 0), 0) / completed.length
      : null
  const totalMeters = weekRuns.reduce((a, r) => a + Number(r.total_meters_run ?? 0), 0)

  const cylinders = wearing.data ?? []
  const critical = cylinders.filter((c) => Number(c.life_used_pct ?? 0) >= 95)
  const openNotes = notes.data ?? []

  // Pareto by area. Counted here rather than in SQL because the set is small
  // and a view would need refreshing to stay honest.
  const counts = new Map<string, number>()
  for (const o of issues.data ?? []) {
    counts.set(o.area, (counts.get(o.area) ?? 0) + 1)
  }
  const pareto = [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="The last seven days across every machine."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Runs this week" value={weekRuns.length} hint={`${completed.length} completed`} />
        <Stat
          label="Average waste"
          value={avgWaste === null ? "—" : pct(avgWaste)}
          tone={avgWaste === null ? "neutral" : avgWaste > 5 ? "critical" : avgWaste > 4 ? "warn" : "ok"}
          hint="By meters, across completed runs"
        />
        <Stat
          label="Cylinders near life"
          value={cylinders.length}
          tone={critical.length > 0 ? "critical" : cylinders.length > 0 ? "warn" : "ok"}
          hint={critical.length > 0 ? `${critical.length} past 95%` : "Above 80% surface life"}
          href="/cylinders"
        />
        <Stat
          label="Open next-run notes"
          value={openNotes.length}
          tone={openNotes.length > 0 ? "warn" : "ok"}
          hint="Waiting for a supervisor to clear"
          href="/issues?open=1"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeading action={<Link href="/issues?open=1" className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">See all</Link>}>
              Must check before the next run
            </SectionHeading>
            <Card>
              {openNotes.length === 0 ? (
                <EmptyState title="No open notes. Every flagged issue has been cleared by a supervisor." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {openNotes.map((n) => {
                    const job = one<{ job_file_no: string; job_no: string }>(n.job_files)
                    const machine = one<{ code: string }>(n.machines)
                    return (
                      <li key={n.id} className="p-4">
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
                            {machine?.code ? ` · ${machine.code}` : ""} · {relativeDays(n.observed_at)}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-ink-900">{n.title}</p>
                        <p className="mt-0.5 text-[length:calc(var(--base)*0.92)] text-ink-600">
                          {n.next_run_note}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading action={<Link href="/cylinders" className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">Wear board</Link>}>
              Cylinders nearing life
            </SectionHeading>
            <Card>
              {cylinders.length === 0 ? (
                <EmptyState title="Every cylinder on the floor is inside its life limit." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {cylinders.map((c) => (
                    <li key={c.id} className="flex items-center gap-4 p-4">
                      <div className="w-40 shrink-0">
                        <Link
                          href={`/cylinders/${c.id}`}
                          data-numeric=""
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          {c.cylinder_no}
                        </Link>
                        <p className="text-[length:calc(var(--base)*0.82)] text-ink-600">
                          {c.colour_name ?? "—"} · {humanise(c.condition)}
                        </p>
                      </div>
                      <WearBar
                        className="flex-1"
                        used={Number(c.surface_meters ?? 0)}
                        limit={Number(c.life_limit_meters ?? 0)}
                        pctUsed={Number(c.life_used_pct ?? 0)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeading>Issues by area, last 7 days</SectionHeading>
            <Card>
              <CardBody>
                {pareto.length === 0 ? (
                  <p className="text-[length:calc(var(--base)*0.92)] text-ink-600">
                    Nothing logged this week.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {pareto.map((p) => (
                      <li key={p.area}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-[length:calc(var(--base)*0.86)]">
                          <span className="truncate text-ink-900">{humanise(p.area)}</span>
                          <span data-numeric="" className="font-semibold text-ink-600">
                            {p.count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-100">
                          <div
                            className="h-full bg-ink-600"
                            style={{ width: `${(p.count / pareto[0].count) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <SectionHeading action={<Link href="/runs" className="text-[length:calc(var(--base)*0.86)] text-ink-600 hover:text-ink-900 hover:underline">All runs</Link>}>
              Latest runs
            </SectionHeading>
            <Card>
              {(recent.data ?? []).length === 0 ? (
                <EmptyState title="No runs recorded yet. They appear here as operators close them." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {(recent.data ?? []).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <Link
                          href={`/runs/${r.id}`}
                          data-numeric=""
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          Run {r.run_no}
                        </Link>
                        <p
                          data-numeric=""
                          className="text-[length:calc(var(--base)*0.8)] text-ink-600"
                        >
                          {r.machine_code} · {shortDate(r.run_date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone={runResultTone(r.result)}>{humanise(r.result)}</Badge>
                        <p data-numeric="" className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                          {pct(r.waste_pct_m)} waste
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionHeading>Output this week</SectionHeading>
            <Card>
              <CardBody>
                <p data-numeric="" className="text-[length:calc(var(--base)*1.8)] font-semibold text-ink-900">
                  {meters(totalMeters)}
                </p>
                <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                  meters run across all stations
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </>
  )
}
