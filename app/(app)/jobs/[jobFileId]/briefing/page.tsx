import Link from "next/link"
import { notFound } from "next/navigation"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { Alert } from "@/components/ui/alert"
import { BriefingSheet, type Briefing } from "@/components/briefing/BriefingSheet"
import { PrintButton } from "@/components/briefing/PrintButton"
import { MachinePicker } from "@/components/briefing/MachinePicker"
import { scheduleRun } from "@/lib/actions/runs"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Pre run briefing" }

/**
 * The briefing on the desktop: printable A4 for the floor.
 *
 * It takes the machine the next run will go on, because a briefing for the
 * wrong machine shows tension and dryer settings that do not transfer -- which
 * is worse than showing nothing.
 */
export default async function BriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobFileId: string }>
  searchParams: Promise<{ machine?: string }>
}) {
  const { jobFileId } = await params
  const { machine } = await searchParams
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: job } = await supabase
    .from("job_files")
    .select("id, job_file_no, job_no, default_machine_id")
    .eq("id", jobFileId)
    .maybeSingle()

  if (!job) notFound()

  const { data: machines } = await supabase
    .from("machines")
    .select("id, code")
    .eq("is_active", true)
    .order("code")

  const machineId = machine || job.default_machine_id || machines?.[0]?.id

  if (!machineId) {
    return (
      <>
        <PageHeader title="Pre run briefing" />
        <Alert tone="critical" title="No machine to brief against">
          Add a machine in Settings, Machines before generating a briefing.
        </Alert>
      </>
    )
  }

  const { data, error } = await supabase.rpc("fn_pre_run_briefing", {
    p_job_file_id: jobFileId,
    p_machine_id: machineId,
  })

  if (error) {
    return (
      <>
        <PageHeader title="Pre run briefing" />
        <Alert tone="critical" title="The briefing could not be built">
          {error.message}
        </Alert>
      </>
    )
  }

  const b = data as Briefing

  return (
    <>
      <div className="no-print">
        <PageHeader
          breadcrumbs={[
            { label: "Job files", href: "/jobs" },
            { label: job.job_file_no, href: `/jobs/${jobFileId}` },
            { label: "Briefing" },
          ]}
          title="Pre run briefing"
          subtitle="Print this for the machine, or open it on the tablet before the run starts."
          action={
            <>
              <MachinePicker
                jobFileId={jobFileId}
                machines={machines ?? []}
                selected={machineId}
              />
              <PrintButton />
              {can.enterRuns(profile.role) && (
                <form action={scheduleRun}>
                  <input type="hidden" name="jobFileId" value={jobFileId} />
                  <input type="hidden" name="machineId" value={machineId} />
                  <Button type="submit" variant="primary">Schedule run</Button>
                </form>
              )}
            </>
          }
        />
      </div>

      <BriefingSheet b={b} />

      <p className="no-print mt-6 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Operators acknowledge this briefing on the machine tablet, which stamps
        who read it and when.{" "}
        <Link href={`/jobs/${jobFileId}`} className="underline hover:text-ink-900">
          Back to the job
        </Link>
        .
      </p>
    </>
  )
}
