import { notFound } from "next/navigation"
import { getRun, getRunStations } from "@/lib/queries/run"
import { closeRun } from "@/lib/actions/runs"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { meters, pct } from "@/lib/format"

export const metadata = { title: "Close run" }

/**
 * Closing the run -- plan Section 2.1, step 8.
 *
 * Waste percentages compute themselves, because they are generated columns and
 * therefore cannot be entered wrong. The one thing the operator must supply is
 * meters: without it every cylinder ledger downstream is silently wrong.
 */
export default async function FinishPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const [run, stations] = await Promise.all([getRun(runId), getRunStations(runId)])
  if (!run) notFound()

  const locked = Boolean(run.locked_at)
  const active = stations.filter((s) => !s.is_idle)
  const withoutMeters = active.filter((s) => !Number(s.meters_run))

  return (
    <div className="mx-auto w-full max-w-3xl space-y-[var(--gap)]">
      {run.status === "completed" && (
        <Alert tone="ok" title="Run closed">
          Produced {meters(run.produced_qty_m)} m with {pct(run.waste_pct_m)} waste
          by meters and {pct(run.waste_pct_kg)} by weight. Saving again updates
          the figures while the run is unlocked.
        </Alert>
      )}

      {withoutMeters.length > 0 && (
        <Alert tone="warn" title="Some stations have no meters yet">
          Station{withoutMeters.length === 1 ? " " : "s "}
          {withoutMeters.map((s) => s.station_no).join(", ")} still read zero.
          Tick “Apply the run total to every station” below, or set them on the
          station grid first.
        </Alert>
      )}

      <form
        action={closeRun}
        className="rounded-[var(--radius)] border border-steel-200 bg-paper-000"
      >
        <input type="hidden" name="runId" value={runId} />

        <div className="grid gap-[var(--gap)] p-[var(--gap)] sm:grid-cols-2">
          <Num
            name="produced_qty_m"
            label="Produced"
            unit="m"
            required
            defaultValue={run.produced_qty_m}
          />
          <Num
            name="produced_qty_kg"
            label="Produced"
            unit="kg"
            defaultValue={run.produced_qty_kg}
          />
          <Num name="waste_m" label="Waste" unit="m" defaultValue={run.waste_m} />
          <Num name="waste_kg" label="Waste" unit="kg" defaultValue={run.waste_kg} />
          <Num
            name="avg_speed_mpm"
            label="Average speed"
            unit="m/min"
            defaultValue={run.avg_speed_mpm}
          />
          <Num
            name="max_speed_mpm"
            label="Top speed"
            unit="m/min"
            defaultValue={run.max_speed_mpm}
          />

          <label className="sm:col-span-2">
            <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
              Result
            </span>
            <select
              name="result"
              required
              defaultValue={run.result ?? ""}
              className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)]"
            >
              <option value="">Pick how the run went</option>
              <option value="ok">OK</option>
              <option value="ok_with_issues">OK with issues</option>
              <option value="rejected">Rejected</option>
              <option value="rerun_required">Rerun required</option>
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
              Remarks
            </span>
            <textarea
              name="remarks"
              rows={3}
              defaultValue={run.remarks ?? ""}
              placeholder="Anything the next shift should know"
              className="w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-3 text-[length:var(--base)]"
            />
          </label>

          <label className="flex items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              name="apply_meters"
              defaultChecked
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--ink-900)]"
            />
            <span>
              <span className="block font-semibold text-ink-900">
                Apply the run total to every station
              </span>
              <span className="block text-[length:calc(var(--base)*0.82)] text-ink-600">
                Idle stations are skipped. This is what puts meters on the
                cylinder ledger.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-steel-200 p-[var(--gap)]">
          <p className="text-[length:calc(var(--base)*0.82)] text-ink-600">
            Waste percentages are worked out for you and cannot be typed.
          </p>
          <Button type="submit" variant="primary" size="lg" disabled={locked}>
            {run.status === "completed" ? "Save changes" : "Close run"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Num({
  name,
  label,
  unit,
  required,
  defaultValue,
}: {
  name: string
  label: string
  unit?: string
  required?: boolean
  defaultValue?: number | null
}) {
  return (
    <label>
      <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
        {label}
        {unit ? ` (${unit})` : ""}
        {required && (
          <span aria-hidden="true" className="ml-1 text-signal-critical">
            *
          </span>
        )}
      </span>
      <input
        name={name}
        type="number"
        step="any"
        inputMode="decimal"
        required={required}
        defaultValue={defaultValue ?? ""}
        data-numeric=""
        className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-right text-[length:var(--base)]"
      />
    </label>
  )
}
