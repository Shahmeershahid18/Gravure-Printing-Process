import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardBody } from "@/components/ui/card"

/**
 * The console's own small vocabulary.
 *
 * Three shapes used across every page here, kept together so the five screens
 * cannot drift into five dialects of the same idea. Everything below sits
 * inside the product's design tokens -- hairlines rather than shadows,
 * achromatic by default, four type sizes -- because the console is read the
 * same way the rest of the product is, and a monitoring screen with its own
 * private styling is one more thing to relearn under pressure.
 */

/** A headline figure. The reason someone opens the overview. */
export function Stat({
  label,
  value,
  note,
  tone = "neutral",
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  tone?: "neutral" | "warn" | "critical"
  icon?: LucideIcon
}) {
  return (
    <Card
      className={cn(
        tone === "critical" && "border-signal-critical",
        tone === "warn" && "border-signal-warn"
      )}
    >
      <CardBody className="flex items-start gap-3">
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn(
              "mt-1 h-4 w-4 shrink-0",
              tone === "critical" ? "text-signal-critical"
                : tone === "warn" ? "text-signal-warn"
                : "text-steel-400"
            )}
          />
        )}
        <div className="min-w-0">
          <div className="text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-ink-600">
            {label}
          </div>
          <div
            data-numeric=""
            className="mt-0.5 text-[length:calc(var(--base)*1.6)] font-semibold leading-none tracking-tight text-ink-900"
          >
            {value}
          </div>
          {note && (
            <div
              className={cn(
                "mt-1.5 text-[length:calc(var(--base)*0.8)]",
                tone === "critical" ? "text-signal-critical"
                  : tone === "warn" ? "text-signal-warn"
                  : "text-steel-400"
              )}
            >
              {note}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * A titled panel with an optional action.
 *
 * Distinct from CardHeader only in that the title carries an icon and the
 * body is not padded -- most panels here hold a list whose rows draw their own
 * hairlines edge to edge, and padding the container puts a gutter outside
 * those lines that makes the panel look broken.
 */
export function Panel({
  title,
  description,
  action,
  icon: Icon,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-steel-200 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {Icon && <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-steel-400" />}
          <div className="min-w-0">
            <h2 className="truncate text-[length:calc(var(--base)*0.95)] font-semibold text-ink-900">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[length:calc(var(--base)*0.8)] text-ink-600">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

/** A row inside a Panel. Hairline between, none after the last. */
export function Row({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-steel-200 px-4 py-2.5 last:border-b-0",
        className
      )}
    >
      {children}
    </div>
  )
}

/** What a panel says when there is nothing to show. Reassurance, not absence. */
export function Quiet({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-center text-[length:calc(var(--base)*0.86)] text-ink-600">
      {children}
    </p>
  )
}
