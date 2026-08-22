/**
 * Number and date formatting.
 *
 * Every figure the floor compares -- meters, viscosity, tension, waste -- goes
 * through here so the same value never appears with two different precisions
 * on two different screens.
 */

export function num(value: number | string | null | undefined, digits = 0): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Meters are whole numbers on the floor. Nobody quotes half a meter. */
export function meters(value: number | string | null | undefined): string {
  return num(value, 0)
}

export function kg(value: number | string | null | undefined): string {
  return num(value, 1)
}

export function pct(value: number | string | null | undefined, digits = 1): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(n)) return "—"
  return `${num(n, digits)}%`
}

export function decimal(value: number | string | null | undefined, digits = 1): string {
  return num(value, digits)
}

/** 22 Aug 2026 -- unambiguous across the shift handover book. */
export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return `${shortDate(d)} ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

/** "3 days ago" for recency cues where the exact date is not the point. */
export function relativeDays(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
