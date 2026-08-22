"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Numeric cells open a large on screen number pad, not the OS keyboard --
 * plan Section 10.3.
 *
 * The OS keyboard on a 10 inch tablet eats half the grid, puts the digits
 * where the letters are, and takes two taps to reach the numeric layer. This
 * pad is one tap per digit, 64px targets, and it never covers the row being
 * edited because it anchors to the bottom of the screen.
 */
export function NumberPad({
  open,
  label,
  unit,
  initial,
  allowNegative = false,
  onCommit,
  onClose,
}: {
  open: boolean
  label: string
  unit?: string
  initial: string
  allowNegative?: boolean
  onCommit: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = React.useState(initial)

  React.useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "Enter") {
        onCommit(value)
        onClose()
      } else if (/^[0-9]$/.test(e.key)) setValue((v) => v + e.key)
      else if (e.key === ".") setValue((v) => (v.includes(".") ? v : v + "."))
      else if (e.key === "Backspace") setValue((v) => v.slice(0, -1))
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, value, onCommit, onClose])

  if (!open) return null

  const press = (k: string) => {
    if (k === ".") {
      setValue((v) => (v.includes(".") ? v : (v === "" ? "0." : v + ".")))
    } else if (k === "-") {
      setValue((v) => (v.startsWith("-") ? v.slice(1) : "-" + v))
    } else {
      setValue((v) => v + k)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-md rounded-t-[var(--radius)] border-t border-steel-200 bg-paper-000 p-[var(--gap)]"
      >
        <div className="mb-[var(--gap)]">
          <p className="text-[length:calc(var(--base)*0.82)] font-semibold uppercase tracking-wide text-ink-600">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2 rounded-[var(--radius)] border border-steel-200 bg-paper-100 px-3 py-2">
            <span
              data-numeric=""
              aria-live="polite"
              className="flex-1 text-right text-[length:calc(var(--base)*1.6)] font-semibold text-ink-900"
            >
              {value || "0"}
            </span>
            {unit && (
              <span className="text-[length:calc(var(--base)*0.9)] text-ink-600">{unit}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[var(--gap)]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onPress={() => press(d)}>
              {d}
            </Key>
          ))}
          <Key onPress={() => press(".")}>.</Key>
          <Key onPress={() => press("0")}>0</Key>
          {allowNegative ? (
            <Key onPress={() => press("-")}>±</Key>
          ) : (
            <Key muted onPress={() => setValue((v) => v.slice(0, -1))}>
              Delete
            </Key>
          )}
        </div>

        <div className="mt-[var(--gap)] grid grid-cols-3 gap-[var(--gap)]">
          <Key muted onPress={onClose}>
            Cancel
          </Key>
          <Key muted onPress={() => setValue("")}>
            Clear
          </Key>
          <button
            type="button"
            onClick={() => {
              onCommit(value)
              onClose()
            }}
            className="h-[var(--tap)] rounded-[var(--radius)] bg-ink-900 font-semibold text-paper-000 hover:bg-ink-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Key({
  children,
  onPress,
  muted,
}: {
  children: React.ReactNode
  onPress: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "h-[var(--tap)] rounded-[var(--radius)] border border-steel-200 font-semibold transition-colors",
        muted
          ? "bg-paper-000 text-[length:calc(var(--base)*0.86)] text-ink-600 hover:bg-paper-100"
          : "bg-paper-100 text-[length:calc(var(--base)*1.25)] text-ink-900 hover:bg-steel-200"
      )}
    >
      <span data-numeric={muted ? undefined : ""}>{children}</span>
    </button>
  )
}
