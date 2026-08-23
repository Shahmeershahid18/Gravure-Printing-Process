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

  /**
   * Held in a ref so the effect below does not depend on it.
   *
   * Every caller passes an inline arrow -- `onClose={() => setOpen(false)}` --
   * which is a new function on every render. With onClose in the dependency
   * array the whole effect tore down and re-ran on each keystroke: the cleanup
   * threw focus back to the opener, the re-run then focused the first element
   * in the panel, and the character after that went to a button instead of the
   * field. A space on a focused button is a click, so typing a two-word value
   * closed the dialog. Every dialog in the product was affected.
   */
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => {
    onCloseRef.current = onClose
  })

  React.useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // The first *field*, not merely the first focusable thing. Close sits
    // first in the DOM, and opening a form with the cancel button focused
    // invites exactly the wrong keystroke.
    const panel = panelRef.current
    const field = panel?.querySelector<HTMLElement>(
      "input:not([disabled]),select:not([disabled]),textarea:not([disabled])"
    )
    ;(field ?? panel)?.focus()

    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      ;(openerRef.current as HTMLElement | null)?.focus?.()
    }
    // Deliberately keyed on `open` alone: see onCloseRef above.
  }, [open])

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
        tabIndex={-1}
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
