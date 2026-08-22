import * as React from "react"
import { cn } from "@/lib/utils"
import { meters, pct } from "@/lib/format"
import type { Tone } from "@/components/ui/badge"

/**
 * Wear reads surface meters, never lifetime meters -- plan Section 7.2.
 * A cylinder re-engraved at 900,000 m is a fresh printing surface on an old
 * base, and alerting on its lifetime figure would pull a perfectly good
 * cylinder off the press.
 */
export function wearTone(pctUsed: number | null | undefined): Tone {
  const n = Number(pctUsed ?? 0)
  if (n >= 95) return "critical"
  if (n >= 80) return "warn"
  return "ok"
}

export function wearWord(pctUsed: number | null | undefined): string {
  const n = Number(pctUsed ?? 0)
  if (n >= 95) return "Replace now"
  if (n >= 80) return "Plan replacement"
  return "Within limit"
}

const fill: Record<Tone, string> = {
  ok: "bg-signal-ok",
  warn: "bg-signal-warn",
  critical: "bg-signal-critical",
  info: "bg-signal-info",
  neutral: "bg-steel-400",
}

export function WearBar({
  used,
  limit,
  pctUsed,
  showFigures = true,
  className,
}: {
  used?: number | null
  limit?: number | null
  pctUsed?: number | null
  showFigures?: boolean
  className?: string
}) {
  const percent =
    pctUsed ?? (limit && Number(limit) > 0 ? (Number(used ?? 0) / Number(limit)) * 100 : 0)
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  const tone = wearTone(percent)

  return (
    <div className={cn("min-w-0", className)}>
      <div
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Cylinder surface life used: ${Math.round(clamped)} percent, ${wearWord(
          percent
        )}`}
        className="h-2 w-full overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-100"
      >
        <div className={cn("h-full", fill[tone])} style={{ width: `${clamped}%` }} />
      </div>
      {showFigures && (
        <div className="mt-1 flex items-baseline justify-between gap-3 text-[length:calc(var(--base)*0.82)]">
          <span data-numeric="" className="text-ink-600">
            {meters(used)} / {meters(limit)} m
          </span>
          {/* Colour is never the only carrier -- the percentage is paired with
              a word (Section 4.4, rule 4). */}
          <span
            className={cn(
              "font-semibold",
              tone === "critical" && "text-signal-critical",
              tone === "warn" && "text-signal-warn",
              tone === "ok" && "text-signal-ok"
            )}
          >
            <span data-numeric="">{pct(percent, 0)}</span> · {wearWord(percent)}
          </span>
        </div>
      )}
    </div>
  )
}
