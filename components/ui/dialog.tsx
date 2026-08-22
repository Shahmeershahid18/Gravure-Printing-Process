"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

/**
 * A modal with no library behind it, so its API cannot drift under us.
 * Escape closes, focus moves in on open and returns to the opener on close,
 * and the backdrop is a flat scrim -- no blur, no motion beyond a fade.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const openerRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Move focus into the panel so the modal is operable from the keyboard.
    const first = panelRef.current?.querySelector<HTMLElement>(
      'input,select,textarea,button,[tabindex]:not([tabindex="-1"])'
    )
    first?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      ;(openerRef.current as HTMLElement | null)?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-steel-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[length:calc(var(--base)*0.86)] text-ink-600">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-steel-200 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
