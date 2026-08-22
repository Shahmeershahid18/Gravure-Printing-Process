import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * One job per element -- plan Section 4.5. A label labels. A hint demonstrates.
 * Nothing does double duty, so hint and error are separate slots and a hint is
 * never repurposed to carry an error.
 */
export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-600",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-signal-critical" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[length:calc(var(--base)*0.82)] text-steel-400">{hint}</p>
      )}
      {/* Errors say what to fix, and never apologise -- Section 4.4, rule 7. */}
      {error && (
        <p
          role="alert"
          className="text-[length:calc(var(--base)*0.82)] font-semibold text-signal-critical"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/** A read-only label/value pair for detail panes. */
export function DataPoint({
  label,
  value,
  numeric = true,
  className,
}: {
  label: string
  value: React.ReactNode
  numeric?: boolean
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="truncate text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-steel-400">
        {label}
      </div>
      <div
        data-numeric={numeric ? "" : undefined}
        className="truncate text-[length:var(--base)] text-ink-900"
      >
        {value ?? <span className="text-steel-400">—</span>}
      </div>
    </div>
  )
}
