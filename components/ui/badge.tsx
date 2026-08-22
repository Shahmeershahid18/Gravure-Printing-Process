import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Colour is never the only carrier of meaning -- plan Section 4.4, rule 4.
 * Every signal tone therefore renders a shape glyph alongside its word. The
 * tablet sits under variable factory lighting, and roughly 1 in 12 men has
 * some colour vision deficiency; on a colour-critical floor that is not
 * hypothetical.
 */
export type Tone = "ok" | "warn" | "critical" | "info" | "neutral"

const tones: Record<Tone, { cls: string; glyph: string }> = {
  ok:       { cls: "border-signal-ok bg-signal-ok-bg text-signal-ok", glyph: "●" },
  warn:     { cls: "border-signal-warn bg-signal-warn-bg text-signal-warn", glyph: "▲" },
  critical: { cls: "border-signal-critical bg-signal-critical-bg text-signal-critical", glyph: "■" },
  info:     { cls: "border-signal-info bg-signal-info-bg text-signal-info", glyph: "◆" },
  neutral:  { cls: "border-steel-200 bg-paper-100 text-ink-600", glyph: "—" },
}

export function Badge({
  tone = "neutral",
  glyph = true,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; glyph?: boolean }) {
  const t = tones[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-2 py-0.5",
        "text-[length:calc(var(--base)*0.82)] font-semibold whitespace-nowrap",
        t.cls,
        className
      )}
      {...props}
    >
      {glyph && (
        <span aria-hidden="true" className="text-[0.7em] leading-none">
          {t.glyph}
        </span>
      )}
      {children}
    </span>
  )
}

/** Run status -> tone. An action keeps its name through the whole flow. */
export function runStatusTone(status?: string | null): Tone {
  switch (status) {
    case "completed": return "ok"
    case "running":   return "info"
    case "setup":     return "warn"
    case "aborted":   return "critical"
    default:          return "neutral"
  }
}

export function runResultTone(result?: string | null): Tone {
  switch (result) {
    case "ok":              return "ok"
    case "ok_with_issues":  return "warn"
    case "rejected":        return "critical"
    case "rerun_required":  return "critical"
    default:                return "neutral"
  }
}

export function severityTone(severity?: string | null): Tone {
  switch (severity) {
    case "critical": return "critical"
    case "major":    return "warn"
    default:         return "neutral"
  }
}

export function conditionTone(condition?: string | null): Tone {
  switch (condition) {
    case "new":
    case "good":    return "ok"
    case "fair":    return "warn"
    case "worn":    return "warn"
    case "damaged": return "critical"
    default:        return "neutral"
  }
}

/** Turns run_result / cyl_event_type style enums into floor language. */
export function humanise(value?: string | null): string {
  if (!value) return "—"
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
