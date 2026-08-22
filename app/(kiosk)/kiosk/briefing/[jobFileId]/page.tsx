import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { acknowledgeAndStartRun } from "@/lib/actions/runs"
import { BriefingSheet, type Briefing } from "@/components/briefing/BriefingSheet"
import { Alert } from "@/components/ui/alert"
import { friendlyError } from "@/lib/errors"

export const metadata = { title: "Pre run briefing" }

/**
 * The briefing, full screen, before a run can start -- plan Section 10.2.
 *
 * Acknowledging writes briefing_ack_by and briefing_ack_at on the run, then
 * seeds the 8 stations from the previous run. That acknowledgement record is
 * what makes the system defensible when an old mistake repeats.
 */
export default async function KioskBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobFileId: string }>
  searchParams: Promise<{ runId?: string }>
}) {
  const { jobFileId } = await params
  const { runId } = await searchParams

  const profile = await requireRole("operator")
  const operator = await getActiveOperator()
  if (!operator) redirect("/kiosk/login")

  if (!profile.default_machine_id) {
    return (
      <Alert tone="critical" title="This tablet is not bound to a machine">
        An admin sets the machine on this account in Settings, Users.
      </Alert>
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_pre_run_briefing", {
    p_job_file_id: jobFileId,
    p_machine_id: profile.default_machine_id,
  })

  if (error) {
    return (
      <Alert tone="critical" title="The briefing could not be built">
        {friendlyError(error, "The recall data could not be assembled.")} Tell
        your supervisor, and do not start the run until it loads.
      </Alert>
    )
  }

  const b = data as Briefing | null
  if (!b?.job?.job_file_no) notFound()

  const nextRunNo = await nextRunNumber(supabase, jobFileId, runId)

  return (
    <div className="mx-auto max-w-5xl pb-[calc(var(--tap)*2)]">
      <BriefingSheet b={b} />

      {/* Sticky acknowledgement bar. One primary action per screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-steel-200 bg-paper-000 p-[var(--gap)] sticky-bar-top">
        <div className="mx-auto flex max-w-5xl items-center gap-[var(--gap)]">
          <Link
            href="/kiosk/start"
            className="flex h-[calc(var(--tap)*1.25)] shrink-0 items-center rounded-[var(--radius)] border border-steel-200 px-5 font-semibold text-ink-900 hover:bg-paper-100"
          >
            Back
          </Link>
          <form action={acknowledgeAndStartRun} className="flex-1">
            <input type="hidden" name="jobFileId" value={jobFileId} />
            <input type="hidden" name="machineId" value={profile.default_machine_id} />
            {runId && <input type="hidden" name="runId" value={runId} />}
            <button
              type="submit"
              className="flex h-[calc(var(--tap)*1.25)] w-full items-center justify-center rounded-[var(--radius)] bg-ink-900 text-[length:calc(var(--base)*1.15)] font-semibold text-paper-000 transition-colors hover:bg-ink-600"
            >
              Acknowledge and start Run {nextRunNo}
            </button>
          </form>
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-center text-[length:calc(var(--base)*0.78)] text-steel-400">
          Acknowledging records that {operator.name} read this briefing before
          the run started.
        </p>
      </div>
    </div>
  )
}

async function nextRunNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobFileId: string,
  runId?: string
): Promise<number> {
  if (runId) {
    const { data } = await supabase.from("runs").select("run_no").eq("id", runId).maybeSingle()
    if (data?.run_no) return data.run_no
  }
  const { data } = await supabase
    .from("runs")
    .select("run_no")
    .eq("job_file_id", jobFileId)
    .order("run_no", { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.run_no ?? 0) + 1
}
