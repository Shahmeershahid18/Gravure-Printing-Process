"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  pending,
  remove,
  markFailed,
  onQueueChange,
  type QueuedWrite,
} from "@/lib/offline/queue"
import { cn } from "@/lib/utils"

/** Writes that have failed this many times need a supervisor, not a retry. */
const MAX_ATTEMPTS = 5
const RETRY_MS = 15_000

/**
 * The sync loop and its banner.
 *
 * Flushes in queue order so a station's later edit never overtakes its earlier
 * one. Conflicts surface to the supervisor, never to the operator, who has a
 * press to run (plan Section 10.3).
 */
export function SyncManager() {
  const router = useRouter()
  const [count, setCount] = React.useState(0)
  const [stuck, setStuck] = React.useState(0)
  const [online, setOnline] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const running = React.useRef(false)

  const refresh = React.useCallback(async () => {
    const rows = await pending()
    setCount(rows.length)
    setStuck(rows.filter((r) => r.attempts >= MAX_ATTEMPTS).length)
  }, [])

  const flush = React.useCallback(async () => {
    if (running.current || !navigator.onLine) return
    running.current = true
    setSyncing(true)
    try {
      const supabase = createClient()
      const rows = await pending()
      let flushed = 0

      for (const row of rows) {
        if (row.attempts >= MAX_ATTEMPTS) continue
        const error = await apply(supabase, row)
        if (error) {
          await markFailed(row, error)
          // Stop on the first failure: the queue is ordered, and pushing past
          // a failed write would apply edits out of sequence.
          break
        }
        if (row.id !== undefined) await remove(row.id)
        flushed++
      }

      if (flushed > 0) router.refresh()
    } finally {
      running.current = false
      setSyncing(false)
      await refresh()
    }
  }, [refresh, router])

  React.useEffect(() => {
    setOnline(navigator.onLine)
    void refresh()
    void flush()

    const onOnline = () => {
      setOnline(true)
      void flush()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    const unsub = onQueueChange(() => {
      void refresh()
      void flush()
    })
    const timer = setInterval(() => void flush(), RETRY_MS)

    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      unsub()
      clearInterval(timer)
    }
  }, [flush, refresh])

  // Nothing pending and connected: the banner earns no space on the screen.
  if (online && count === 0) return null

  const tone = stuck > 0 ? "critical" : online ? "info" : "warn"

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 border-b px-[var(--gap)] py-2",
        "text-[length:calc(var(--base)*0.86)]",
        tone === "critical" && "border-signal-critical bg-signal-critical-bg text-signal-critical",
        tone === "warn" && "border-signal-warn bg-signal-warn-bg text-signal-warn",
        tone === "info" && "border-signal-info bg-signal-info-bg text-signal-info"
      )}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden="true">{tone === "critical" ? "■" : tone === "warn" ? "▲" : "◆"}</span>
        <span className="font-semibold">
          {stuck > 0 ? (
            <>
              <span data-numeric="">{stuck}</span> change{stuck === 1 ? "" : "s"} could not be
              saved. Tell your supervisor — your other entries are safe.
            </>
          ) : !online ? (
            <>
              Working offline. <span data-numeric="">{count}</span> change
              {count === 1 ? "" : "s"} waiting to sync. Keep entering.
            </>
          ) : (
            <>
              <span data-numeric="">{count}</span> change{count === 1 ? "" : "s"} syncing…
            </>
          )}
        </span>
      </span>
      {syncing && <span className="text-[length:calc(var(--base)*0.8)]">Sending</span>}
    </div>
  )
}

/** Applies one queued write. Returns an error message, or null on success. */
async function apply(
  supabase: ReturnType<typeof createClient>,
  row: QueuedWrite
): Promise<string | null> {
  try {
    if (row.op === "insert") {
      const { error } = await supabase.from(row.table).insert(row.payload)
      return error?.message ?? null
    }
    let q = supabase.from(row.table).update(row.payload)
    for (const [k, v] of Object.entries(row.match ?? {})) q = q.eq(k, v)
    const { error } = await q
    return error?.message ?? null
  } catch (e) {
    return e instanceof Error ? e.message : "Unknown error"
  }
}
