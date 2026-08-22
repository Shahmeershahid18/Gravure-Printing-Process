import * as React from "react"
import { cn } from "@/lib/utils"

const base = [
  "w-full min-w-0 rounded-[var(--radius)] border border-steel-200 bg-paper-000",
  "h-[var(--tap)] px-3 text-[length:var(--base)] text-ink-900",
  "transition-colors outline-none",
  "hover:border-steel-400",
  "disabled:cursor-not-allowed disabled:bg-paper-100 disabled:text-steel-400",
  "aria-[invalid=true]:border-signal-critical",
].join(" ")

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Numeric fields render in mono so a column of figures aligns under a scan. */
  numeric?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, numeric, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      inputMode={numeric ? "decimal" : props.inputMode}
      data-numeric={numeric ? "" : undefined}
      className={cn(base, numeric && "text-right", className)}
      {...props}
    />
  )
)
Input.displayName = "Input"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(base, "h-auto min-h-[calc(var(--tap)*1.6)] py-2 leading-relaxed", className)}
    {...props}
  />
))
Textarea.displayName = "Textarea"

/**
 * Native select. Keyboard-operable for free, and on a tablet it opens the OS
 * picker, which is the one OS control that beats anything we would build.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      base,
      "appearance-none bg-no-repeat pr-9",
      "[background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%234A5058' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")]",
      "[background-position:right_0.6rem_center] [background-size:1rem]",
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = "Select"

export { Input, Textarea, Select }
