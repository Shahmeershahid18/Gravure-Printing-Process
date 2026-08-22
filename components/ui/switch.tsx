"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Achromatic by rule: the "on" state is ink, not a brand colour.
 * The track carries a text state alongside it wherever it is used, so the
 * switch is never the only carrier of meaning.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  "aria-label"?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
        "disabled:opacity-50",
        checked ? "border-ink-900 bg-ink-900" : "border-steel-400 bg-paper-000",
        className
      )}
    >
      <span
        className={cn(
          "block h-5 w-5 rounded-full transition-transform",
          checked ? "translate-x-6 bg-paper-000" : "translate-x-0.5 bg-steel-400"
        )}
      />
    </button>
  )
}
