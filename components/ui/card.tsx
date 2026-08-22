import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Depth is communicated with a 1px hairline, not with shadows -- Section 4.2.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-steel-200 bg-paper-000",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  title,
  description,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-steel-200 px-4 py-3",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {title && (
          <h2 className="truncate text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-0.5 text-[length:calc(var(--base)*0.86)] text-ink-600">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-steel-200 px-4 py-3",
        className
      )}
      {...props}
    />
  )
}
