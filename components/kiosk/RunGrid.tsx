"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { enqueue, pending, onQueueChange } from "@/lib/offline/queue"
import { applyRunMeters } from "@/lib/actions/runs"
import { swatchFor, stationState, STATE_GLYPH, STATE_WORD } from "@/lib/stations"
import { meters, decimal } from "@/lib/format"
import { Segmented } from "@/components/ui/segmented"
import { NumberPad } from "./NumberPad"
import { Typeahead, type Option } from "./Typeahead"
import { QuickObservationDialog } from "./QuickObservationDialog"

export type Station = {
  id: string
  station_no: number
  colour_name: string | null
  is_idle: boolean
  cylinder_id: string | null
  ink_product_id: string | null
  ink_batch_id: string | null
  initial_viscosity_sec: number | null
  running_viscosity_sec: number | null
  ink_temp_c: number | null
  doctor_blade_type: string | null
  doctor_blade_angle: number | null
  impression_pressure: number | null
  dryer_temp_c: number | null
  dryer_air_flow: number | null
  meters_run: number | null
  previous_issue_note: string | null
  observation: string | null
}

export type Masters = {
  cylinders: { id: string; cylinder_no: string; colour_name: string | null; surface_meters: number | null; life_limit: number | null; condition: string | null }[]
  inkProducts: { id: string; ink_code: string; colour_name: string }[]
  inkBatches: { id: string; batch_no: string; ink_product_id: string }[]
  colourNames: { name: string }[]
  issueTemplates: { id: string; area: string; title: string; hint: string | null }[]
}

type Group = "setup" | "running" | "close"
type SaveState = "saved" | "pending" | "failed"

const AUTOSAVE_MS = 800

/**
 * The 8 station grid -- plan Section 10.3.
 *
 * Three passes of 8 rows beats one pass of 24 columns, so the field groups
 * switch with a segmented control rather than scrolling sideways forever.
 * Station, colour and cylinder stay pinned left through all three.
 *
 * Every cell that can be pre filled is pre filled from the previous run: the
 * operator confirms rather than types, which is the whole reason a run can be
 * entered inside the six minute target.
 */
export function RunGrid({
  runId,

  locked,
  initialStations,
  masters,
  jobFileId,
}: {
  runId: string

  locked: boolean
  initialStations: Station[]
  masters: Masters
  jobFileId: string
}) {
  const router = useRouter()
  const [group, setGroup] = React.useState<Group>("setup")
  const [stations, setStations] = React.useState<Station[]>(initialStations)
  const [activeStation, setActiveStation] = React.useState<number | null>(null)
  const [saveState, setSaveState] = React.useState<Record<string, SaveState>>({})
  const [applying, setApplying] = React.useState(false)
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  React.useEffect(() => setStations(initialStations), [initialStations])

  // Row status follows the real queue rather than an optimistic guess, so a
  // dot that says "saved" means the write actually left the tablet.
  React.useEffect(() => {
    const sync = async () => {
      const rows = await pending()
      setSaveState((prev) => {
        const next = { ...prev }
        const byScope = new Map<string, number>()
        for (const r of rows) {
          byScope.set(r.scope, Math.max(byScope.get(r.scope) ?? 0, r.attempts))
        }
        for (const key of Object.keys(next)) {
          const scope = `station:${key}`
          if (byScope.has(scope)) {
            next[key] = (byScope.get(scope) ?? 0) >= 5 ? "failed" : "pending"
          } else if (next[key] !== "saved") {
            next[key] = "saved"
          }
        }
        return next
      })
    }
    void sync()
    return onQueueChange(() => void sync())
  }, [])

  /** Autosave per field with an 800ms debounce -- Section 10.3. */
  const patch = React.useCallback(
    (station: Station, field: keyof Station, value: unknown) => {
      if (locked) return
      setStations((rows) =>
        rows.map((r) => (r.id === station.id ? { ...r, [field]: value } : r))
      )
      setSaveState((s) => ({ ...s, [station.id]: "pending" }))

      const key = `${station.id}:${String(field)}`
      clearTimeout(timers.current[key])
      timers.current[key] = setTimeout(() => {
        void enqueue({
          table: "run_stations",
          op: "update",
          match: { id: station.id },
          payload: { [field]: value },
          scope: `station:${station.id}`,
        })
      }, AUTOSAVE_MS)
    },
    [locked]
  )

  const cylinderOptions: Option[] = React.useMemo(
    () =>
      masters.cylinders.map((c) => ({
        id: c.id,
        label: c.cylinder_no,
        sublabel: [
          c.colour_name,
          c.surface_meters !== null && c.life_limit
            ? `${meters(c.surface_meters)} / ${meters(c.life_limit)} m`
            : null,
          c.condition,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [masters.cylinders]
  )

  const inkOptions: Option[] = React.useMemo(
    () =>
      masters.inkProducts.map((p) => ({
        id: p.id,
        label: p.ink_code,
        sublabel: p.colour_name,
      })),
    [masters.inkProducts]
  )

  const cylinderById = React.useMemo(
    () => new Map(masters.cylinders.map((c) => [c.id, c])),
    [masters.cylinders]
  )
  const inkById = React.useMemo(
    () => new Map(masters.inkProducts.map((p) => [p.id, p])),
    [masters.inkProducts]
  )
  const batchById = React.useMemo(
    () => new Map(masters.inkBatches.map((b) => [b.id, b])),
    [masters.inkBatches]
  )

  /**
   * Live warning if any cylinder will cross its life limit during this run --
   * Section 10.3. Uses the meters already entered on the row, because that is
   * the best estimate available before the run closes.
   */
  const crossings = React.useMemo(() => {
    const out: { station_no: number; cylinder_no: string; projected: number; limit: number }[] = []
    for (const s of stations) {
      if (s.is_idle || !s.cylinder_id) continue
      const c = cylinderById.get(s.cylinder_id)
      if (!c?.life_limit) continue
      const projected = Number(c.surface_meters ?? 0) + Number(s.meters_run ?? 0)
      if (projected > Number(c.life_limit)) {
        out.push({
          station_no: s.station_no,
          cylinder_no: c.cylinder_no,
          projected,
          limit: Number(c.life_limit),
        })
      }
    }
    return out
  }, [stations, cylinderById])

  const doApplyMeters = async () => {
    setApplying(true)
    const res = await applyRunMeters(runId)
    setApplying(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--gap)]">
      {/* Progressive disclosure over tabs-within-tabs -- Section 4.4, rule 5. */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--gap)]">
        <Segmented<Group>
          label="Station field group"
          value={group}
          onChange={setGroup}
          options={[
            { value: "setup", label: "Setup" },
            { value: "running", label: "Running" },
            { value: "close", label: "Close" },
          ]}
        />
        <p className="text-[length:calc(var(--base)*0.82)] text-ink-600">
          {group === "setup" && "Confirm the cylinder, ink and blade at each station."}
          {group === "running" && "Record viscosity, dryer and impression while the run is up."}
          {group === "close" && "Enter meters and anything worth telling the next shift."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        <table className="w-full border-collapse text-[length:var(--base)]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-paper-100 text-left text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-ink-600">
              <th className="sticky left-0 z-30 bg-paper-100 px-2 py-2 text-center">Stn</th>
              <th className="sticky left-[3.25rem] z-30 min-w-36 bg-paper-100 px-2 py-2">
                Colour
              </th>
              {group === "setup" && (
                <>
                  <th className="min-w-36 px-2 py-2">Cylinder</th>
                  <th className="min-w-32 px-2 py-2">Ink</th>
                  <th className="min-w-32 px-2 py-2">Ink batch</th>
                  <th className="min-w-28 px-2 py-2">Blade</th>
                  <th className="min-w-24 px-2 py-2 text-right">Blade angle</th>
                </>
              )}
              {group === "running" && (
                <>
                  <th className="min-w-24 px-2 py-2 text-right">Visc start</th>
                  <th className="min-w-24 px-2 py-2 text-right">Visc run</th>
                  <th className="min-w-24 px-2 py-2 text-right">Ink temp</th>
                  <th className="min-w-24 px-2 py-2 text-right">Dryer °C</th>
                  <th className="min-w-24 px-2 py-2 text-right">Air flow</th>
                  <th className="min-w-24 px-2 py-2 text-right">Impression</th>
                </>
              )}
              {group === "close" && (
                <>
                  <th className="min-w-32 px-2 py-2 text-right">Meters</th>
                  <th className="min-w-64 px-2 py-2">Observation</th>
                </>
              )}
              <th className="min-w-52 px-2 py-2">Previous issue</th>
              <th className="min-w-28 px-2 py-2">Status</th>
              <th className="min-w-24 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <Row
                key={s.id}
                station={s}
                group={group}
                locked={locked}
                active={activeStation === s.station_no}
                saveState={saveState[s.id]}
                colourNames={masters.colourNames}
                cylinderOptions={cylinderOptions}
                inkOptions={inkOptions}
                inkBatches={masters.inkBatches}
                cylinderById={cylinderById}
                inkById={inkById}
                batchById={batchById}
                issueTemplates={masters.issueTemplates}
                jobFileId={jobFileId}
                runId={runId}
                onFocusRow={() => setActiveStation(s.station_no)}
                onPatch={patch}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom bar: the meters button and the life-limit warning. */}
      <div className="flex flex-wrap items-center gap-[var(--gap)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)]">
        <button
          type="button"
          disabled={locked || applying}
          onClick={doApplyMeters}
          className="h-[var(--tap)] shrink-0 rounded-[var(--radius)] border border-steel-200 px-4 font-semibold text-ink-900 hover:bg-paper-100 disabled:opacity-50"
        >
          {applying ? "Applying…" : "Apply run meters to all stations"}
        </button>

        {crossings.length > 0 ? (
          <p className="flex-1 text-[length:calc(var(--base)*0.86)] text-signal-critical">
            <span aria-hidden="true">■ </span>
            <span className="font-semibold">
              {crossings.length} cylinder{crossings.length === 1 ? "" : "s"} will pass the life
              limit on this run:
            </span>{" "}
            {crossings
              .map(
                (c) =>
                  `Stn ${c.station_no} ${c.cylinder_no} (${meters(c.projected)} of ${meters(
                    c.limit
                  )} m)`
              )
              .join(", ")}
            . Tell your supervisor before the reel change.
          </p>
        ) : (
          <p className="flex-1 text-[length:calc(var(--base)*0.82)] text-ink-600">
            Idle stations are skipped. Every other station takes the run total.
          </p>
        )}
      </div>
    </div>
  )
}

// -- one station row ---------------------------------------------------------

function Row({
  station,
  group,
  locked,
  active,
  saveState,
  colourNames,
  cylinderOptions,
  inkOptions,
  inkBatches,
  cylinderById,
  inkById,
  batchById,
  issueTemplates,
  jobFileId,
  runId,
  onFocusRow,
  onPatch,
}: {
  station: Station
  group: Group
  locked: boolean
  active: boolean
  saveState?: SaveState
  colourNames: { name: string }[]
  cylinderOptions: Option[]
  inkOptions: Option[]
  inkBatches: { id: string; batch_no: string; ink_product_id: string }[]
  cylinderById: Map<string, { cylinder_no: string }>
  inkById: Map<string, { ink_code: string }>
  batchById: Map<string, { batch_no: string }>
  issueTemplates: { id: string; area: string; title: string; hint: string | null }[]
  jobFileId: string
  runId: string
  onFocusRow: () => void
  onPatch: (s: Station, f: keyof Station, v: unknown) => void
}) {
  const [pad, setPad] = React.useState<{
    field: keyof Station
    label: string
    unit?: string
  } | null>(null)
  const [picker, setPicker] = React.useState<"cylinder" | "ink" | "batch" | null>(null)
  const [obsOpen, setObsOpen] = React.useState(false)

  const state = stationState(station)
  const swatch = swatchFor(station.colour_name)
  const idle = station.is_idle

  const batchOptions: Option[] = inkBatches
    .filter((b) => !station.ink_product_id || b.ink_product_id === station.ink_product_id)
    .map((b) => ({ id: b.id, label: b.batch_no }))

  return (
    <>
      <tr
        onFocus={onFocusRow}
        className={cn(
          "border-b border-steel-200 last:border-0",
          idle && "bg-paper-100 text-steel-400",
          !idle && state === "issue" && "bg-signal-warn-bg",
          active && "ring-2 ring-inset ring-ink-900"
        )}
      >
        {/* Pinned left: station, colour, and the ink swatch that names it. */}
        <td className="sticky left-0 z-10 h-[var(--row-h)] bg-inherit px-2 text-center">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("block h-8 w-2.5 shrink-0 rounded-sm", idle && "opacity-25")}
              style={{ backgroundColor: `var(${swatch.varName})` }}
            />
            <span data-numeric="" className="font-semibold">
              {station.station_no}
            </span>
          </span>
        </td>

        <td className="sticky left-[3.25rem] z-10 h-[var(--row-h)] bg-inherit px-2">
          <div className="flex items-center gap-2">
            <select
              value={station.colour_name ?? ""}
              disabled={locked || idle}
              onChange={(e) => onPatch(station, "colour_name", e.target.value || null)}
              aria-label={`Station ${station.station_no} colour`}
              className="h-[calc(var(--tap)*0.8)] w-full min-w-0 rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:calc(var(--base)*0.92)] disabled:bg-transparent disabled:text-steel-400"
            >
              <option value="">Not set</option>
              {colourNames.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={locked}
              onClick={() => onPatch(station, "is_idle", !idle)}
              aria-pressed={idle}
              title={idle ? "Bring this station into the run" : "Mark this station idle"}
              className={cn(
                "h-[calc(var(--tap)*0.8)] shrink-0 rounded-[var(--radius)] border px-2 text-[length:calc(var(--base)*0.76)] font-semibold",
                idle
                  ? "border-steel-400 bg-paper-000 text-ink-600"
                  : "border-steel-200 text-steel-400 hover:text-ink-900"
              )}
            >
              {idle ? "Idle" : "Used"}
            </button>
          </div>
        </td>

        {group === "setup" && (
          <>
            <PickCell
              value={station.cylinder_id ? cylinderById.get(station.cylinder_id)?.cylinder_no : null}
              disabled={locked || idle}
              onOpen={() => setPicker("cylinder")}
              label={`Station ${station.station_no} cylinder`}
            />
            <PickCell
              value={station.ink_product_id ? inkById.get(station.ink_product_id)?.ink_code : null}
              disabled={locked || idle}
              onOpen={() => setPicker("ink")}
              label={`Station ${station.station_no} ink`}
            />
            <PickCell
              value={station.ink_batch_id ? batchById.get(station.ink_batch_id)?.batch_no : null}
              disabled={locked || idle || !station.ink_product_id}
              onOpen={() => setPicker("batch")}
              label={`Station ${station.station_no} ink batch`}
            />
            <td className="px-2">
              <input
                type="text"
                value={station.doctor_blade_type ?? ""}
                disabled={locked || idle}
                onChange={(e) => onPatch(station, "doctor_blade_type", e.target.value || null)}
                aria-label={`Station ${station.station_no} doctor blade type`}
                className="h-[calc(var(--tap)*0.8)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:calc(var(--base)*0.92)] disabled:bg-transparent"
              />
            </td>
            <NumCell
              value={station.doctor_blade_angle}
              disabled={locked || idle}
              onOpen={() =>
                setPad({ field: "doctor_blade_angle", label: `Station ${station.station_no} blade angle`, unit: "°" })
              }
            />
          </>
        )}

        {group === "running" && (
          <>
            <NumCell value={station.initial_viscosity_sec} disabled={locked || idle}
              onOpen={() => setPad({ field: "initial_viscosity_sec", label: `Station ${station.station_no} viscosity at start`, unit: "s" })} />
            <NumCell value={station.running_viscosity_sec} disabled={locked || idle}
              onOpen={() => setPad({ field: "running_viscosity_sec", label: `Station ${station.station_no} viscosity running`, unit: "s" })} />
            <NumCell value={station.ink_temp_c} disabled={locked || idle}
              onOpen={() => setPad({ field: "ink_temp_c", label: `Station ${station.station_no} ink temperature`, unit: "°C" })} />
            <NumCell value={station.dryer_temp_c} disabled={locked || idle}
              onOpen={() => setPad({ field: "dryer_temp_c", label: `Station ${station.station_no} dryer temperature`, unit: "°C" })} />
            <NumCell value={station.dryer_air_flow} disabled={locked || idle}
              onOpen={() => setPad({ field: "dryer_air_flow", label: `Station ${station.station_no} dryer air flow` })} />
            <NumCell value={station.impression_pressure} disabled={locked || idle}
              onOpen={() => setPad({ field: "impression_pressure", label: `Station ${station.station_no} impression pressure` })} />
          </>
        )}

        {group === "close" && (
          <>
            <NumCell
              value={station.meters_run}
              digits={0}
              disabled={locked || idle}
              onOpen={() =>
                setPad({ field: "meters_run", label: `Station ${station.station_no} meters run`, unit: "m" })
              }
            />
            <td className="px-2">
              <input
                type="text"
                value={station.observation ?? ""}
                disabled={locked || idle}
                onChange={(e) => onPatch(station, "observation", e.target.value || null)}
                placeholder="What the next shift should know"
                aria-label={`Station ${station.station_no} observation`}
                className="h-[calc(var(--tap)*0.8)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:calc(var(--base)*0.92)] disabled:bg-transparent"
              />
            </td>
          </>
        )}

        {/* Read only, amber. It cannot be dismissed from the grid, only from
            the briefing -- Section 10.3. */}
        <td className="px-2">
          {station.previous_issue_note ? (
            <span className="block rounded-[var(--radius)] border border-signal-warn bg-signal-warn-bg px-2 py-1 text-[length:calc(var(--base)*0.82)] text-ink-900">
              {station.previous_issue_note}
            </span>
          ) : (
            <span className="text-steel-400">—</span>
          )}
        </td>

        <td className="px-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[length:calc(var(--base)*0.8)]",
              state === "complete" && "text-signal-ok",
              state === "issue" && "text-signal-warn",
              state === "pending" && "text-ink-600",
              state === "idle" && "text-steel-400"
            )}
          >
            <span aria-hidden="true">{STATE_GLYPH[state]}</span>
            {STATE_WORD[state]}
          </span>
          {saveState && (
            <span
              className={cn(
                "text-[length:calc(var(--base)*0.72)]",
                saveState === "saved" && "text-signal-ok",
                saveState === "pending" && "text-signal-info",
                saveState === "failed" && "text-signal-critical"
              )}
            >
              {saveState === "saved" ? "Saved" : saveState === "pending" ? "Saving…" : "Not saved"}
            </span>
          )}
        </td>

        <td className="px-2">
          <button
            type="button"
            disabled={locked || idle}
            onClick={() => setObsOpen(true)}
            className="h-[calc(var(--tap)*0.8)] rounded-[var(--radius)] border border-steel-200 px-2 text-[length:calc(var(--base)*0.8)] font-semibold text-ink-900 hover:bg-paper-100 disabled:opacity-40"
          >
            Log issue
          </button>
        </td>
      </tr>

      {pad && (
        <NumberPad
          open
          label={pad.label}
          unit={pad.unit}
          initial={String(station[pad.field] ?? "")}
          onClose={() => setPad(null)}
          onCommit={(v) =>
            onPatch(station, pad.field, v.trim() === "" ? null : Number(v))
          }
        />
      )}

      <Typeahead
        open={picker === "cylinder"}
        title={`Station ${station.station_no} cylinder`}
        options={cylinderOptions}
        value={station.cylinder_id}
        onClose={() => setPicker(null)}
        onSelect={(id) => onPatch(station, "cylinder_id", id)}
      />
      <Typeahead
        open={picker === "ink"}
        title={`Station ${station.station_no} ink`}
        options={inkOptions}
        value={station.ink_product_id}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          onPatch(station, "ink_product_id", id)
          // Changing the ink invalidates whichever batch was on the row.
          if (station.ink_batch_id) onPatch(station, "ink_batch_id", null)
        }}
      />
      <Typeahead
        open={picker === "batch"}
        title={`Station ${station.station_no} ink batch`}
        options={batchOptions}
        value={station.ink_batch_id}
        onClose={() => setPicker(null)}
        onSelect={(id) => onPatch(station, "ink_batch_id", id)}
      />

      <QuickObservationDialog
        open={obsOpen}
        onClose={() => setObsOpen(false)}
        templates={issueTemplates}
        jobFileId={jobFileId}
        runId={runId}
        runStationId={station.id}
        stationNo={station.station_no}
        cylinderId={station.cylinder_id}
        inkBatchId={station.ink_batch_id}
      />
    </>
  )
}

function NumCell({
  value,
  onOpen,
  disabled,
  digits = 1,
}: {
  value: number | null
  onOpen: () => void
  disabled?: boolean
  digits?: number
}) {
  return (
    <td className="px-2 text-right">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        data-numeric=""
        className={cn(
          "h-[calc(var(--tap)*0.8)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-right",
          "text-[length:var(--base)] hover:border-steel-400 disabled:border-transparent disabled:bg-transparent disabled:text-steel-400"
        )}
      >
        {value === null || value === undefined ? (
          <span className="text-steel-400">—</span>
        ) : digits === 0 ? (
          meters(value)
        ) : (
          decimal(value, digits)
        )}
      </button>
    </td>
  )
}

function PickCell({
  value,
  onOpen,
  disabled,
  label,
}: {
  value?: string | null
  onOpen: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <td className="px-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        aria-label={label}
        data-numeric=""
        className={cn(
          "h-[calc(var(--tap)*0.8)] w-full truncate rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-left",
          "text-[length:var(--base)] hover:border-steel-400 disabled:border-transparent disabled:bg-transparent disabled:text-steel-400"
        )}
      >
        {value ?? <span className="text-steel-400">Tap to pick</span>}
      </button>
    </td>
  )
}
