import * as React from "react"
import { cn } from "@/lib/utils"
import type { Tone } from "./badge"

const toneText: Record<Tone, string> = {
  ok: "text-signal-ok",
  warn: "text-signal-warn",
  critical: "text-signal-critical",
  info: "text-signal-info",
  neutral: "text-ink-900",
}

/**
 * A figure and its label. The figure is mono and tabular so a row of tiles
 * reads as a row of comparable numbers rather than a row of decorations.
 */
export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  hint?: React.ReactNode
  tone?: Tone
  href?: string
  className?: string
}) {
  const body = (
    <>
      <div className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          data-numeric=""
          className={cn(
            "text-[length:calc(var(--base)*2)] leading-none font-semibold",
            toneText[tone]
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[length:calc(var(--base)*0.86)] text-ink-600">{unit}</span>
        )}
      </div>
      {hint && (
        <div className="mt-1.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
          {hint}
        </div>
      )}
    </>
  )

  const cls = cn(
    "block rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-4",
    href && "transition-colors hover:border-steel-400",
    className
  )

  if (href) {
    // next/link is not imported here to keep this component usable in both
    // shells; an anchor is enough for a tile that only ever links within the app.
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    )
  }
  return <div className={cls}>{body}</div>
}
