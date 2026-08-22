"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Progressive disclosure over tabs-within-tabs -- Section 4.4, rule 5.
 * The station grid reaches its three field groups through this control.
 * Never a tab inside a tab.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { value: T; label: string; badge?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
  className?: string
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex rounded-[var(--radius)] border border-steel-200 bg-paper-100 p-0.5",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-[calc(var(--tap)-6px)] items-center gap-2 rounded-[var(--radius)] px-4",
              "text-[length:var(--base)] font-semibold transition-colors",
              active
                ? "bg-paper-000 text-ink-900 shadow-[0_1px_2px_rgb(20_22_26/0.06)]"
                : "text-ink-600 hover:text-ink-900"
            )}
          >
            {o.label}
            {o.badge}
          </button>
        )
      })}
    </div>
  )
}
