import type { CSSProperties } from "react"

/**
 * Station ink swatches -- the only saturated colour the product is allowed to
 * put on screen besides the four status signals (plan Section 4.1).
 *
 * A swatch is matched by colour name from the `colour_names` master. Anything
 * unrecognised falls back to a self-colour swatch rather than to grey, because
 * a printed station is never colourless.
 */

export type StationSwatch = {
  /** CSS custom property holding the ink colour. */
  varName: string
  /** True where the swatch is too light to carry text (Section 4.6). */
  lightGround: boolean
}

const SWATCHES: Record<string, StationSwatch> = {
  cyan:      { varName: "--stn-cyan", lightGround: false },
  magenta:   { varName: "--stn-magenta", lightGround: false },
  yellow:    { varName: "--stn-yellow", lightGround: true },
  black:     { varName: "--stn-black", lightGround: false },
  ground:    { varName: "--stn-ground", lightGround: false },
  white:     { varName: "--stn-white", lightGround: true },
  "self colour 1": { varName: "--stn-self1", lightGround: false },
  "self colour 2": { varName: "--stn-self2", lightGround: false },
  "self 1":  { varName: "--stn-self1", lightGround: false },
  "self 2":  { varName: "--stn-self2", lightGround: false },
}

export function swatchFor(colourName?: string | null): StationSwatch {
  if (!colourName) return { varName: "--steel-200", lightGround: true }
  const key = colourName.trim().toLowerCase()
  if (SWATCHES[key]) return SWATCHES[key]
  // Unknown named colours alternate between the two self-colour swatches so
  // two adjacent specials never read as the same ink.
  const hash = [...key].reduce((a, c) => a + c.charCodeAt(0), 0)
  return hash % 2 === 0
    ? { varName: "--stn-self1", lightGround: false }
    : { varName: "--stn-self2", lightGround: false }
}

export function swatchStyle(colourName?: string | null): CSSProperties {
  const s = swatchFor(colourName)
  return { backgroundColor: `var(${s.varName})` }
}

export type StationState = "complete" | "pending" | "issue" | "idle"

/** State glyphs, so the rail never relies on colour alone. */
export const STATE_GLYPH: Record<StationState, string> = {
  complete: "●",
  pending: "○",
  issue: "▲",
  idle: "—",
}

export const STATE_WORD: Record<StationState, string> = {
  complete: "complete",
  pending: "pending",
  issue: "previous issue",
  idle: "idle",
}

/**
 * A station counts as complete once the operator has confirmed the three
 * things the grid asks for in the Running pass. Meters alone is not enough --
 * a station with meters but no viscosity was never actually checked.
 */
export function stationState(station: {
  is_idle?: boolean | null
  previous_issue_note?: string | null
  running_viscosity_sec?: number | null
  cylinder_id?: string | null
  meters_run?: number | null
}): StationState {
  if (station.is_idle) return "idle"
  if (station.previous_issue_note) return "issue"
  const confirmed =
    station.cylinder_id &&
    station.running_viscosity_sec !== null &&
    station.running_viscosity_sec !== undefined &&
    Number(station.meters_run ?? 0) > 0
  return confirmed ? "complete" : "pending"
}
