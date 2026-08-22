import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { Badge, runStatusTone, humanise } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Alert } from "@/components/ui/alert"
import { meters, shortDate } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Machine home" }

/**
 * Machine home -- plan Section 3.2.
 *
 * Today's runs on this machine, one large Start next run button, and nothing
 * else. No navigation to speak of.
 */
export default async function KioskHome() {
  const profile = await requireRole("operator")
  const operator = await getActiveOperator()
  if (!operator) redirect("/kiosk/login")

  if (!profile.default_machine_id) {
    return (
      <Alert tone="critical" title="This tablet is not bound to a machine">
        An admin sets the machine on this account in Settings, Users. Until then
        no run can be started here.
      </Alert>
    )
  }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: runs } = await supabase
    .from("runs")
    .select(
      "id, run_no, run_date, status, result, produced_qty_m, locked_at, job_files(job_file_no, job_no, product_name, customers(name))"
    )
    .eq("machine_id", profile.default_machine_id)
    .is("deleted_at", null)
    .gte("run_date", today)
    .order("run_no", { ascending: false })

  const todaysRuns = runs ?? []

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-[var(--gap)]">
      <section className="flex-1">
        <h2 className="mb-3 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
          Today on {profile.machine_code ?? "this machine"}
        </h2>

        {todaysRuns.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
            {/* Empty states are instructions -- Section 4.4, rule 6. */}
            <EmptyState title="No runs today. Tap Start next run to begin." />
          </div>
        ) : (
          <ul className="space-y-[var(--gap)]">
            {todaysRuns.map((r) => {
              const job = one<{
                job_file_no: string
                job_no: string
                product_name: string
                customers: { name: string } | null
              }>(r.job_files)
              return (
                <li key={r.id}>
                  <Link
                    href={`/kiosk/runs/${r.id}`}
                    className="flex min-h-[var(--tap)] items-center gap-[var(--gap)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)] transition-colors hover:bg-paper-100"
                  >
                    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius)] bg-paper-100">
                      <span className="text-[length:calc(var(--base)*0.66)] uppercase text-ink-600">
                        Run
                      </span>
                      <span
                        data-numeric=""
                        className="text-[length:calc(var(--base)*1.2)] font-semibold text-ink-900"
                      >
                        {r.run_no}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        data-numeric=""
                        className="block truncate font-semibold text-ink-900"
                      >
                        {job?.job_file_no} · {job?.job_no}
                      </span>
                      <span className="block truncate text-[length:calc(var(--base)*0.86)] text-ink-600">
                        {job?.product_name}
                        {job?.customers?.name ? ` · ${job.customers.name}` : ""}
                      </span>
                      <span className="block truncate text-[length:calc(var(--base)*0.8)] text-steel-400">
                        {shortDate(r.run_date)} · {meters(r.produced_qty_m)} m produced
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={runStatusTone(r.status)}>{humanise(r.status)}</Badge>
                      {r.locked_at && (
                        <span className="text-[length:calc(var(--base)*0.76)] text-steel-400">
                          Locked
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* One primary action per screen -- Section 4.4, rule 1. */}
      <div className="sticky bottom-0 -mx-[var(--gap)] border-t border-steel-200 bg-paper-000 p-[var(--gap)] sticky-bar-top">
        <Link
          href="/kiosk/start"
          className="flex h-[calc(var(--tap)*1.25)] w-full items-center justify-center rounded-[var(--radius)] bg-ink-900 text-[length:calc(var(--base)*1.15)] font-semibold text-paper-000 transition-colors hover:bg-ink-600"
        >
          Start next run
        </Link>
      </div>
    </div>
  )
}
