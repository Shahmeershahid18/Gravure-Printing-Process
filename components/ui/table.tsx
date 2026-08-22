import * as React from "react"
import { cn } from "@/lib/utils"

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius)] border border-steel-200 bg-paper-000">
      <table
        className={cn("w-full border-collapse text-[length:var(--base)]", className)}
        {...props}
      />
    </div>
  )
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-paper-100", className)} {...props} />
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-steel-200 last:border-0", className)}
      {...props}
    />
  )
}

export function TH({
  className,
  numeric,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-[var(--row-h)] whitespace-nowrap px-3 text-left align-middle",
        "text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  )
}

export function TD({
  className,
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      data-numeric={numeric ? "" : undefined}
      className={cn(
        "h-[var(--row-h)] px-3 align-middle text-ink-900",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  )
}
