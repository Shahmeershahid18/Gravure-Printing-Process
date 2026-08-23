"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { logPageView } from "@/lib/actions/activity"

/**
 * Records which screens a person opens.
 *
 * This is the half of the activity log the database cannot produce. A trigger
 * sees writes; it does not see a viewer opening every customer's job files one
 * after another, which on a system holding artwork and cylinder costs is the
 * behaviour worth being able to reconstruct.
 *
 * Three properties, each there because the naive version fails without it:
 *
 *   1. It runs on pathname change, not on mount. Layouts are not re-rendered
 *      across a client-side navigation within the same segment, so a layout
 *      that logged on mount would record the first page of a session and
 *      nothing after it.
 *   2. It de-duplicates. React 18 mounts effects twice in development, and a
 *      refresh of the current route re-runs the effect with an unchanged
 *      pathname; neither is a page view.
 *   3. It never blocks or reports. The action is fire-and-forget and swallows
 *      its own failures, because a log write is not worth a broken navigation
 *      and a user has no action to take on "logging failed".
 *
 * Stated plainly: this is surveillance of legitimate users, and the only
 * account that can read it is the hidden one. That is what was asked for, and
 * the people using the system should be told it exists -- the privacy policy
 * is the right place, not a toast.
 */
export function ActivityTracker() {
  const pathname = usePathname()
  const last = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!pathname) return
    if (last.current === pathname) return
    last.current = pathname

    // Idle time rather than the navigation itself: the render that just
    // happened is what the person is waiting for.
    const send = () => {
      void logPageView(pathname, document.title || undefined)
    }

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(send, { timeout: 2000 })
      return () => w.cancelIdleCallback?.(handle)
    }

    const timer = setTimeout(send, 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
