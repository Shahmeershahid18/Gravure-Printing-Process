"use client"

import * as React from "react"
import { enqueue } from "@/lib/offline/queue"
import { NumberPad } from "./NumberPad"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { decimal } from "@/lib/format"

type FieldSpec = { key: string; label: string; unit?: string }

/**
 * Machine and process parameters -- plan Section 6.11.
 *
 * Grouped the way the operator walks the machine: web path first, then air,
 * then the room, then the tests QC will ask about. Every value autosaves
 * through the same offline queue the station grid uses.
 */
const GROUPS: { heading: string; fields: FieldSpec[] }[] = [
  {
    heading: "Web tension",
    fields: [
      { key: "unwind_tension_kg", label: "Unwind", unit: "kg" },
      { key: "infeed_tension_kg", label: "Infeed", unit: "kg" },
      { key: "outfeed_tension_kg", label: "Outfeed", unit: "kg" },
      { key: "rewind_tension_kg", label: "Rewind", unit: "kg" },
      { key: "chill_roll_temp_c", label: "Chill roll", unit: "°C" },
    ],
  },
  {
    heading: "Air",
    fields: [
      { key: "main_exhaust_pct", label: "Main exhaust", unit: "%" },
      { key: "supply_air_pct", label: "Supply air", unit: "%" },
    ],
  },
  {
    heading: "Room",
    fields: [
      { key: "ambient_temp_c", label: "Ambient temp", unit: "°C" },
      { key: "ambient_rh_pct", label: "Humidity", unit: "%" },
    ],
  },
  {
    heading: "Registration",
    fields: [
      { key: "registration_tolerance_micron", label: "Tolerance", unit: "µm" },
    ],
  },
  {
    heading: "Tests",
    fields: [
      { key: "adhesion_tape_test_pct", label: "Adhesion tape test", unit: "%" },
      { key: "solvent_retention_mg_m2", label: "Solvent retention", unit: "mg/m²" },
    ],
  },
]

export function ProcessForm({
  runId,
  locked,
  initial,
}: {
  runId: string
  locked: boolean
  initial: Record<string, unknown>
}) {
  const [values, setValues] = React.useState<Record<string, unknown>>(initial)
  const [pad, setPad] = React.useState<FieldSpec | null>(null)
  const [saved, setSaved] = React.useState<string | null>(null)
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const patch = (key: string, value: unknown) => {
    if (locked) return
    setValues((v) => ({ ...v, [key]: value }))
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      void enqueue({
        table: "run_process",
        op: "update",
        match: { run_id: runId },
        payload: { [key]: value },
        scope: `process:${runId}`,
      })
      setSaved(key)
      setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500)
    }, 800)
  }

  return (
    <div className="space-y-[var(--gap)]">
      {GROUPS.map((g) => (
        <section
          key={g.heading}
          className="rounded-[var(--radius)] border border-steel-200 bg-paper-000"
        >
          <h3 className="border-b border-steel-200 px-[var(--gap)] py-2.5 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
            {g.heading}
          </h3>
          <div className="grid gap-[var(--gap)] p-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
            {g.fields.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ""}
                </label>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setPad(f)}
                  data-numeric=""
                  className={cn(
                    "h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-right",
                    "text-[length:var(--base)] hover:border-steel-400 disabled:bg-paper-100 disabled:text-steel-400"
                  )}
                >
                  {values[f.key] === null || values[f.key] === undefined ? (
                    <span className="text-steel-400">—</span>
                  ) : (
                    decimal(values[f.key] as number)
                  )}
                </button>
                {saved === f.key && (
                  <p className="mt-1 text-[length:calc(var(--base)*0.76)] text-signal-ok">
                    Saved
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        <h3 className="border-b border-steel-200 px-[var(--gap)] py-2.5 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
          Settings
        </h3>
        <div className="space-y-[var(--gap)] p-[var(--gap)]">
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(values.static_eliminator_on)}
              disabled={locked}
              onCheckedChange={(v) => patch("static_eliminator_on", v)}
              aria-label="Static eliminator"
            />
            <span className="font-semibold text-ink-900">
              Static eliminator {values.static_eliminator_on ? "on" : "off"}
            </span>
          </div>

          <div>
            <label
              htmlFor="registration_mode"
              className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600"
            >
              Registration mode
            </label>
            <select
              id="registration_mode"
              disabled={locked}
              value={(values.registration_mode as string) ?? ""}
              onChange={(e) => patch("registration_mode", e.target.value || null)}
              className="h-[var(--tap)] w-full max-w-xs rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)]"
            >
              <option value="">Not set</option>
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="process_remarks"
              className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600"
            >
              Remarks
            </label>
            <textarea
              id="process_remarks"
              rows={3}
              disabled={locked}
              value={(values.remarks as string) ?? ""}
              onChange={(e) => patch("remarks", e.target.value || null)}
              placeholder="Anything about the machine the next shift should know"
              className="w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-3 text-[length:var(--base)]"
            />
          </div>
        </div>
      </section>

      {pad && (
        <NumberPad
          open
          label={pad.label}
          unit={pad.unit}
          initial={String(values[pad.key] ?? "")}
          onClose={() => setPad(null)}
          onCommit={(v) => patch(pad.key, v.trim() === "" ? null : Number(v))}
        />
      )}
    </div>
  )
}
