import * as React from "react"
import { cn } from "@/lib/utils"
import type { Tone } from "./badge"

const tones: Record<Tone, { cls: string; glyph: string; word: string }> = {
  ok:       { cls: "border-signal-ok bg-signal-ok-bg", glyph: "●", word: "OK" },
  warn:     { cls: "border-signal-warn bg-signal-warn-bg", glyph: "▲", word: "Check" },
  critical: { cls: "border-signal-critical bg-signal-critical-bg", glyph: "■", word: "Stop" },
  info:     { cls: "border-signal-info bg-signal-info-bg", glyph: "◆", word: "Note" },
  neutral:  { cls: "border-steel-200 bg-paper-100", glyph: "—", word: "" },
}

const textTone: Record<Tone, string> = {
  ok: "text-signal-ok",
  warn: "text-signal-warn",
  critical: "text-signal-critical",
  info: "text-signal-info",
  neutral: "text-ink-600",
}

/**
 * Errors say what to fix -- Section 4.4, rule 7. "Meters must be entered
 * before closing the run", not "Validation failed".
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone; title?: React.ReactNode }) {
  const t = tones[tone]
  return (
    <div
      role={tone === "critical" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[var(--radius)] border px-4 py-3",
        t.cls,
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("mt-0.5 leading-none", textTone[tone])}>
        {t.glyph}
      </span>
      <div className="min-w-0 flex-1">
        {title && (
          <div className={cn("font-semibold", textTone[tone])}>{title}</div>
        )}
        {children && (
          <div className="mt-0.5 text-[length:calc(var(--base)*0.92)] text-ink-900">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
