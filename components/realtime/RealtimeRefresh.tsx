"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

/**
 * Live data for a Server Component app.
 *
 * Every screen here is rendered on the server from a Postgres query. Rather
 * than rewrite each one as a client-side store, one socket listens for changes
 * to the tables those screens are built from and calls router.refresh(), which
 * re-runs the server render and streams the new tree into the existing page.
 * React reconciles it, so scroll position, focus and client state survive.
 *
 * Postgres Changes enforces RLS per subscriber, so a viewer is told about
 * exactly the rows a viewer could already read.
 *
 * Three things make this safe on a shop floor rather than merely live:
 *
 *   1. Refreshes are debounced. Applying run meters writes eight station rows
 *      in one statement and that must cost one re-render, not eight.
 *   2. A refresh is deferred while someone is typing. The station grid seeds
 *      its inputs from server props; swapping those under a half-entered
 *      viscosity reading would eat the operator's keystrokes.
 *   3. Nothing is refreshed while the tab is hidden. The work is pointless and
 *      on a tablet it is battery. Pending changes are applied on wake.
 */

const DEBOUNCE_MS = 400
const RETRY_MS = 1200

/** Tables whose changes should re-render the page. Mirrors the publication. */
const LIVE_TABLES = [
  "runs",
  "run_stations",
  "observations",
  "run_substrates",
  "job_files",
  "cylinders",
  "cylinder_events",
  "machines",
  "artwork_revisions",
] as const

type Status = "connecting" | "live" | "offline"

export function RealtimeRefresh({ showIndicator = false }: { showIndicator?: boolean }) {
  const router = useRouter()
  const [status, setStatus] = React.useState<Status>("connecting")

  React.useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending = false
    let disposed = false

    const isTyping = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).isContentEditable
      )
    }

    const flush = () => {
      if (disposed) return
      if (document.hidden || isTyping()) {
        // Try again shortly rather than dropping the change on the floor.
        timer = setTimeout(flush, RETRY_MS)
        return
      }
      pending = false
      router.refresh()
    }

    const schedule = () => {
      pending = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, DEBOUNCE_MS)
    }

    const channel = supabase.channel("intaglio-live")
    for (const table of LIVE_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        schedule
      )
    }

    channel.subscribe((s) => {
      if (disposed) return
      if (s === "SUBSCRIBED") setStatus("live")
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
        setStatus("offline")
      }
    })

    // Coming back to the tab: pick up anything that happened while it slept.
    const onVisible = () => {
      if (document.hidden) return
      if (pending) flush()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      supabase.removeChannel(channel)
    }
  }, [router])

  if (!showIndicator) return null

  const label =
    status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Offline"

  return (
    <span
      title={
        status === "live"
          ? "This screen updates itself as the floor works."
          : status === "connecting"
            ? "Connecting to live updates."
            : "Live updates are not connected. The page still loads current data when you navigate."
      }
      className="flex shrink-0 items-center gap-1.5 text-[length:calc(var(--base)*0.78)] text-steel-400"
    >
      {/* A dot alone would be colour carrying meaning on its own -- rule 4 --
          so the word is always present. */}
      <span
        aria-hidden="true"
        className={cn(
          "block h-1.5 w-1.5 rounded-full",
          status === "live" && "bg-signal-ok",
          status === "connecting" && "bg-steel-400",
          status === "offline" && "bg-signal-warn"
        )}
      />
      <span aria-live="polite">{label}</span>
    </span>
  )
}
