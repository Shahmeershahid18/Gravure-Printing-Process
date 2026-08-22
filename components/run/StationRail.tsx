"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  STATE_GLYPH,
  STATE_WORD,
  stationState,
  swatchFor,
  type StationState,
} from "@/lib/stations"

export type RailStation = {
  station_no: number
  colour_name?: string | null
  is_idle?: boolean | null
  previous_issue_note?: string | null
  running_viscosity_sec?: number | null
  cylinder_id?: string | null
  meters_run?: number | null
}

/**
 * The station rail -- plan Section 4.3.
 *
 * A vertical rail of 8 segments down the left edge, one per print unit, in the
 * same order as the physical machine. It is the one memorable element in the
 * product, it comes from the machine rather than from a design system, and on
 * the kiosk it doubles as navigation: tap a segment to jump to that station.
 *
 * It is a real list, not a decorative div -- Section 4.6.
 */
export function StationRail({
  stations,
  activeStation,
  onSelect,
  className,
  compact = false,
}: {
  stations: RailStation[]
  activeStation?: number | null
  onSelect?: (stationNo: number) => void
  className?: string
  compact?: boolean
}) {
  // Always exactly 8 rows. No dynamic station count anywhere -- locked
  // decision 7.
  const rows = React.useMemo(() => {
    const byNo = new Map(stations.map((s) => [s.station_no, s]))
    return Array.from({ length: 8 }, (_, i) => {
      const no = i + 1
      return byNo.get(no) ?? { station_no: no, is_idle: true }
    })
  }, [stations])

  return (
    <nav aria-label="Print stations" className={className}>
      <ol className="overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        {rows.map((s) => {
          const state: StationState = stationState(s)
          const swatch = swatchFor(s.colour_name)
          const active = activeStation === s.station_no
          const interactive = Boolean(onSelect)

          const content = (
            <>
              {/* The swatch is the ink itself. It never carries text -- the
                  yellow swatch would fail contrast (Section 4.6). */}
              <span
                aria-hidden="true"
                className={cn(
                  "block w-2.5 shrink-0 self-stretch",
                  s.is_idle && "opacity-25"
                )}
                style={{ backgroundColor: `var(${swatch.varName})` }}
              />
              <span
                data-numeric=""
                className="w-6 shrink-0 text-center text-ink-600"
              >
                {s.station_no}
              </span>
              {!compact && (
                <span className="min-w-0 flex-1 truncate text-left text-ink-900">
                  {s.colour_name ?? (
                    <span className="text-steel-400">Not assigned</span>
                  )}
                </span>
              )}
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1.5 pr-3",
                  "text-[length:calc(var(--base)*0.82)]",
                  state === "issue" && "text-signal-warn",
                  state === "complete" && "text-signal-ok",
                  state === "pending" && "text-ink-600",
                  state === "idle" && "text-steel-400"
                )}
              >
                <span aria-hidden="true">{STATE_GLYPH[state]}</span>
                {!compact && <span>{STATE_WORD[state]}</span>}
              </span>
            </>
          )

          return (
            <li key={s.station_no}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onSelect?.(s.station_no)}
                  aria-current={active ? "true" : undefined}
                  aria-label={`Station ${s.station_no}, ${
                    s.colour_name ?? "not assigned"
                  }, ${STATE_WORD[state]}`}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-steel-200 text-left",
                    "min-h-[var(--row-h)] transition-colors last:border-0",
                    // The amber ring marks a station carrying a note from a
                    // previous run.
                    state === "issue" && "bg-signal-warn-bg",
                    active
                      ? "bg-paper-100 ring-2 ring-inset ring-ink-900"
                      : "hover:bg-paper-100"
                  )}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-steel-200",
                    "min-h-[var(--row-h)] last:border-0",
                    state === "issue" && "bg-signal-warn-bg"
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
