import Link from "next/link"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { Alert } from "@/components/ui/alert"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { shortDate } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Start next run" }

/**
 * Pick what to run.
 *
 * Runs a planner already scheduled for this machine come first, because that
 * is the normal case and it saves the operator choosing a job at all. An
 * unplanned start is still allowed underneath -- a press does not stop because
 * the planner went home.
 */
export default async function StartRunPage() {
  const profile = await requireRole("operator")
  if (!(await getActiveOperator())) redirect("/kiosk/login")

  if (!profile.default_machine_id) {
    return (
      <Alert tone="critical" title="This tablet is not bound to a machine">
        An admin sets the machine on this account in Settings, Users.
      </Alert>
    )
  }

  const supabase = await createClient()

  const { data: planned } = await supabase
    .from("runs")
    .select(
      "id, run_no, run_date, shift, job_file_id, job_files(job_file_no, job_no, product_name, structure, customers(name))"
    )
    .eq("machine_id", profile.default_machine_id)
    .eq("status", "planned")
    .is("deleted_at", null)
    .order("run_date")

  const { data: jobs } = await supabase
    .from("job_files")
    .select("id, job_file_no, job_no, product_name, structure, customers(name)")
    .eq("status", "active")
    .order("job_file_no")

  const plannedRuns = planned ?? []
  const activeJobs = jobs ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-[var(--gap)]">
      {plannedRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
            Scheduled for {profile.machine_code}
          </h2>
          <ul className="space-y-2">
            {plannedRuns.map((r) => {
              const job = one<{
                job_file_no: string
                job_no: string
                product_name: string
                customers: { name: string } | null
              }>(r.job_files)
              return (
                <li key={r.id}>
                  <JobRow
                    href={`/kiosk/briefing/${r.job_file_id}?runId=${r.id}`}
                    primary={`${job?.job_file_no} · ${job?.job_no}`}
                    secondary={`${job?.product_name}${job?.customers?.name ? ` · ${job.customers.name}` : ""}`}
                    tertiary={`Run ${r.run_no} · ${shortDate(r.run_date)}${r.shift ? ` · ${r.shift} shift` : ""}`}
                    badge={<Badge tone="info">Scheduled</Badge>}
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
          {plannedRuns.length > 0 ? "Or start another job" : "Pick a job"}
        </h2>
        {activeJobs.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
            <EmptyState title="No active job files. A planner creates them before a run can start." />
          </div>
        ) : (
          <ul className="space-y-2">
            {activeJobs.map((j) => {
              const customer = one<{ name: string }>(j.customers)
              return (
                <li key={j.id}>
                  <JobRow
                    href={`/kiosk/briefing/${j.id}`}
                    primary={`${j.job_file_no} · ${j.job_no}`}
                    secondary={`${j.product_name}${customer?.name ? ` · ${customer.name}` : ""}`}
                    tertiary={j.structure}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Link
        href="/kiosk"
        className="inline-flex h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 font-semibold text-ink-900 hover:bg-paper-100"
      >
        Back to machine home
      </Link>
    </div>
  )
}

function JobRow({
  href,
  primary,
  secondary,
  tertiary,
  badge,
}: {
  href: string
  primary: string
  secondary: string
  tertiary?: string | null
  badge?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[var(--tap)] items-center gap-[var(--gap)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)] transition-colors hover:bg-paper-100"
    >
      <span className="min-w-0 flex-1">
        <span data-numeric="" className="block truncate font-semibold text-ink-900">
          {primary}
        </span>
        <span className="block truncate text-[length:calc(var(--base)*0.86)] text-ink-600">
          {secondary}
        </span>
        {tertiary && (
          <span className="block truncate text-[length:calc(var(--base)*0.8)] text-steel-400">
            {tertiary}
          </span>
        )}
      </span>
      {badge}
      <span aria-hidden="true" className="shrink-0 text-steel-400">
        ›
      </span>
    </Link>
  )
}
