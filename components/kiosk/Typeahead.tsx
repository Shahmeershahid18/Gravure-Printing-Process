"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type Option = { id: string; label: string; sublabel?: string | null }

/**
 * Cylinder and ink cells are typeahead against masters. No free text --
 * plan Section 10.3.
 *
 * Free text here is what produces six spellings of one cylinder number and
 * zero analytics, so the control cannot commit a value that is not on the
 * master list.
 */
export function Typeahead({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
  allowClear = true,
}: {
  open: boolean
  title: string
  options: Option[]
  value?: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
  allowClear?: boolean
}) {
  const [q, setQ] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setQ("")
      // Focus after paint so the tablet keyboard opens against a live field.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return options.slice(0, 60)
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(term) ||
          (o.sublabel ?? "").toLowerCase().includes(term)
      )
      .slice(0, 60)
  }, [options, q])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-[var(--gap)]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-[var(--radius)] border border-steel-200 bg-paper-000"
      >
        <div className="border-b border-steel-200 p-[var(--gap)]">
          <p className="mb-2 text-[length:calc(var(--base)*0.82)] font-semibold uppercase tracking-wide text-ink-600">
            {title}
          </p>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to filter…"
            aria-label={`Filter ${title}`}
            className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)] outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-[var(--gap)] text-[length:calc(var(--base)*0.92)] text-ink-600">
              Nothing on the master list matches that. Ask a planner to add it
              before using it on a run.
            </p>
          ) : (
            <ul>
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(o.id)
                      onClose()
                    }}
                    className={cn(
                      "flex min-h-[var(--tap)] w-full items-center justify-between gap-3 border-b border-steel-200 px-[var(--gap)] text-left",
                      o.id === value ? "bg-paper-100" : "hover:bg-paper-100"
                    )}
                  >
                    <span className="min-w-0">
                      <span data-numeric="" className="block truncate font-semibold text-ink-900">
                        {o.label}
                      </span>
                      {o.sublabel && (
                        <span className="block truncate text-[length:calc(var(--base)*0.82)] text-ink-600">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                    {o.id === value && (
                      <span aria-hidden="true" className="shrink-0 text-signal-ok">
                        ●
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-[var(--gap)] border-t border-steel-200 p-[var(--gap)]">
          <button
            type="button"
            onClick={onClose}
            className="h-[var(--tap)] flex-1 rounded-[var(--radius)] border border-steel-200 font-semibold text-ink-900 hover:bg-paper-100"
          >
            Cancel
          </button>
          {allowClear && (
            <button
              type="button"
              onClick={() => {
                onSelect(null)
                onClose()
              }}
              className="h-[var(--tap)] flex-1 rounded-[var(--radius)] border border-steel-200 font-semibold text-ink-600 hover:bg-paper-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
