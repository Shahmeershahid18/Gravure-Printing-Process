"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useInbox } from "./useInbox"
import { NotificationItem } from "./NotificationItem"

/**
 * The bell.
 *
 * Sits beside the live indicator, which is the right neighbour for it: one
 * says the screen is current, the other says something happened elsewhere.
 *
 * The count is capped at "9+". A precise 47 is not more actionable than "more
 * than nine", and a three-digit number changes the width of the header chrome
 * every time it ticks over.
 */
export function NotificationBell({
  userId,
  className,
}: {
  userId: string
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const { rows, unread, loading, live, markRead, markAllRead, seen } = useInbox(userId)

  React.useEffect(() => {
    if (!open) return
    seen()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, seen])

  /**
   * Opening a notification marks it read and refreshes the page underneath.
   *
   * The refresh matters: every screen in this app is server-rendered, so a
   * notification about a run that changed is usually pointing at a page whose
   * current render predates the change.
   */
  const open_ = (id: string, hasLink: boolean) => {
    void markRead([id])
    setOpen(false)
    if (hasLink) router.refresh()
  }

  const label =
    unread === 0
      ? "Notifications"
      : `Notifications, ${unread} unread`

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          "relative flex h-[var(--tap-sm)] items-center gap-1.5 rounded-[var(--radius)] px-2",
          "text-ink-600 transition-colors hover:bg-paper-100 hover:text-ink-900"
        )}
      >
        <BellGlyph ringing={live && unread > 0} />
        {unread > 0 && (
          <span
            className={cn(
              "min-w-[1.25rem] rounded-full border border-accent bg-accent-bg px-1",
              "text-center text-[length:calc(var(--base)*0.72)] font-semibold text-ink-900"
            )}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {/* The count is a glyph and a number; screen readers get the sentence. */}
        <span className="sr-only" aria-live="polite">
          {label}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute right-0 z-50 mt-1 w-[min(24rem,calc(100vw-1.5rem))]",
            "rounded-[var(--radius)] border border-steel-200 bg-paper-000 sticky-bar"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-steel-200 px-3 py-2">
            <h2 className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
              Notifications
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[length:calc(var(--base)*0.8)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(28rem,60vh)] overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-[length:calc(var(--base)*0.86)] text-ink-600">
                Loading…
              </p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-[length:calc(var(--base)*0.86)] text-ink-600">
                Nothing new. Runs, issues and cylinder alerts will appear here as
                the floor works.
              </p>
            ) : (
              rows.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  compact
                  onOpen={() => open_(n.id, Boolean(n.link_path))}
                />
              ))
            )}
          </div>

          <div className="border-t border-steel-200 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "outline", size: "full" })}
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Drawn rather than imported. lucide-react is in the bundle already, but this
 * icon needs a second state -- a struck clapper when something arrived while
 * the panel was shut -- and animating a library glyph's internals means
 * reaching into markup that is not ours to depend on.
 */
function BellGlyph({ ringing }: { ringing: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(ringing && "origin-top -rotate-6")}
    >
      <path d="M4 6.5a4 4 0 1 1 8 0c0 2.2.5 3.4 1.2 4.2.3.3.1.8-.3.8H3.1c-.4 0-.6-.5-.3-.8C3.5 9.9 4 8.7 4 6.5Z" />
      <path d="M6.4 13.5a1.7 1.7 0 0 0 3.2 0" />
    </svg>
  )
}
