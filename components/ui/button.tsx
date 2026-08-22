import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * One primary action per screen -- plan Section 4.4, rule 1.
 * Exactly one `primary` button per screen. Everything else is `outline`,
 * `ghost` or `link`. `danger` is reserved for destructive confirmation.
 *
 * Heights key off --tap, so the same component renders at 40px on desktop and
 * 64px on the kiosk from a single source.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius)] border text-[length:var(--base)] font-semibold",
    "transition-colors duration-100 select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-ink-900 bg-ink-900 text-paper-000 hover:bg-ink-600 hover:border-ink-600",
        outline:
          "border-steel-200 bg-paper-000 text-ink-900 hover:bg-paper-100",
        ghost:
          "border-transparent bg-transparent text-ink-600 hover:bg-paper-100 hover:text-ink-900",
        link:
          "border-transparent bg-transparent text-ink-900 underline underline-offset-4 hover:text-ink-600 px-0",
        danger:
          "border-signal-critical bg-signal-critical text-paper-000 hover:opacity-90",
      },
      size: {
        // Minimum touch target: 40px desktop, 64px kiosk -- Section 4.6.
        default: "h-[var(--tap)] px-4",
        sm: "h-[var(--tap-sm)] px-3 text-[length:calc(var(--base)*0.92)]",
        lg: "h-[calc(var(--tap)*1.25)] px-8 text-[length:calc(var(--base)*1.15)]",
        icon: "h-[var(--tap)] w-[var(--tap)] px-0",
        full: "h-[var(--tap)] w-full px-4",
      },
    },
    defaultVariants: { variant: "outline", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
