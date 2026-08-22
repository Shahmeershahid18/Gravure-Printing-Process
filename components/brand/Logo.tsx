import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The Intaglio mark.
 *
 * Gravure prints from cells engraved into a copper cylinder: deeper cells hold
 * more ink and lay down a heavier tone. The mark is that -- a 3x3 field of
 * cells growing along the diagonal, so the shape carries the one idea the
 * whole product rests on. It comes from the process rather than from a logo
 * generator, which is the same argument the station rail is built on
 * (plan Section 4.3).
 *
 * Copper is the only place the brand hue appears at full strength. It stays
 * fixed across both themes: a mark that changes colour is not a mark.
 */
export function Mark({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}) {
  const cells = [
    { x: 6.0, y: 6.0, s: 4.0, o: 0.55 },
    { x: 13.63, y: 5.63, s: 4.75, o: 0.68 },
    { x: 21.25, y: 5.25, s: 5.5, o: 0.8 },
    { x: 5.63, y: 13.63, s: 4.75, o: 0.68 },
    { x: 13.25, y: 13.25, s: 5.5, o: 0.8 },
    { x: 20.88, y: 12.88, s: 6.25, o: 0.92 },
    { x: 5.25, y: 21.25, s: 5.5, o: 0.8 },
    { x: 12.88, y: 20.88, s: 6.25, o: 0.92 },
    { x: 20.5, y: 20.5, s: 7.0, o: 1 },
  ]

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="7" fill="#A8632B" />
      <g fill="#FFFFFF">
        {cells.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={c.s}
            height={c.s}
            rx={c.s > 6.5 ? 1.2 : 1}
            opacity={c.o}
          />
        ))}
      </g>
    </svg>
  )
}

/** Mark plus name. `subtle` drops the name on narrow chrome. */
export function Wordmark({
  size = 28,
  className,
  nameClassName,
}: {
  size?: number
  className?: string
  nameClassName?: string
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark size={size} />
      <span
        className={cn(
          "font-semibold tracking-tight text-ink-900",
          nameClassName
        )}
      >
        Intaglio
      </span>
    </span>
  )
}
