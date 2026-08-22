import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Empty states are instructions -- plan Section 4.4, rule 6.
 * "No runs today. Tap Start next run to begin." Not an illustration, and never
 * "Nothing here yet".
 */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-10 text-center",
        className
      )}
    >
      <p className="max-w-md text-[length:var(--base)] text-ink-600">{title}</p>
      {action}
    </div>
  )
}
