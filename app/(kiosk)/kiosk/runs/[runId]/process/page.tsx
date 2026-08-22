import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getRun } from "@/lib/queries/run"
import { ProcessForm } from "@/components/kiosk/ProcessForm"

export const metadata = { title: "Machine settings" }

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const run = await getRun(runId)
  if (!run) notFound()

  const supabase = await createClient()
  const { data: process } = await supabase
    .from("run_process")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle()

  return (
    <ProcessForm
      runId={runId}
      locked={Boolean(run.locked_at)}
      initial={(process ?? { run_id: runId }) as Record<string, unknown>}
    />
  )
}
