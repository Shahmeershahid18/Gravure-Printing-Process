import { notFound } from "next/navigation"
import { getRun, getRunStations, getGridMasters } from "@/lib/queries/run"
import { RunGrid, type Station } from "@/components/kiosk/RunGrid"

export const metadata = { title: "Station grid" }

export default async function StationGridPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const [run, stations, masters] = await Promise.all([
    getRun(runId),
    getRunStations(runId),
    getGridMasters(),
  ])

  if (!run) notFound()

  return (
    <RunGrid
      runId={runId}
      locked={Boolean(run.locked_at)}
      initialStations={stations as Station[]}
      masters={masters}
      jobFileId={run.job_file_id}
    />
  )
}
