"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { NOTIFICATION_COLUMNS, type Notification } from "@/lib/notifications"

/**
 * The inbox, live.
 *
 * Delivery reuses exactly the mechanism RealtimeRefresh established: one
 * Postgres Changes subscription, RLS applied per subscriber, and the same
 * order-of-operations trap avoided -- the access token goes on the socket
 * *before* the channel is opened, or the subscriber joins anonymously,
 * reports SUBSCRIBED, and is never told about a single row.
 *
 * Two differences from RealtimeRefresh, both deliberate:
 *
 *   1. The subscription is filtered to this recipient. RLS would do it anyway,
 *      but the filter means the server never sends rows the client would
 *      discard, which on a shift with six people working is most of them.
 *   2. The event is a signal, never a payload. An INSERT arriving triggers a
 *      refetch of the top of the inbox rather than being spliced in. That
 *      keeps one code path for "what is in my inbox" and means a reconnection
 *      after a dropped socket heals the list rather than leaving a hole.
 */

const REFETCH_DEBOUNCE_MS = 250
const HEAD_LIMIT = 12

export type InboxState = {
  rows: Notification[]
  unread: number
  loading: boolean
  /** True when a notification arrived while the panel was closed. */
  live: boolean
}

export function useInbox(userId: string, limit = HEAD_LIMIT) {
  const [rows, setRows] = React.useState<Notification[]>([])
  const [unread, setUnread] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [live, setLive] = React.useState(false)

  // Held in a ref so the subscription effect does not re-run when the caller
  // passes a new inline value, which would tear down and rebuild the socket.
  const limitRef = React.useRef(limit)
  limitRef.current = limit

  const supabaseRef = React.useRef<ReturnType<typeof createClient>>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const load = React.useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(limitRef.current),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .is("read_at", null),
    ])

    setRows((data ?? []) as unknown as Notification[])
    setUnread(count ?? 0)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let channel: ReturnType<typeof supabase.channel> | undefined

    const schedule = (isInsert: boolean) => {
      if (isInsert) setLive(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!disposed) void load()
      }, REFETCH_DEBOUNCE_MS)
    }

    const start = async () => {
      await load()
      if (disposed) return

      const { data } = await supabase.auth.getSession()
      if (disposed) return
      const token = data.session?.access_token
      if (token) await supabase.realtime.setAuth(token)
      if (disposed) return

      channel = supabase
        .channel(`inbox:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => schedule(payload.eventType === "INSERT")
        )
        .subscribe()
    }

    void start()

    // A shift outlasts an access token. Hand the socket the new one or the
    // bell goes quiet an hour in without saying so.
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) void supabase.realtime.setAuth(session.access_token)
    })

    // Coming back to the tab: the socket may have been asleep through several
    // events, and the count on the bell is the one thing that must not be
    // stale when someone glances at it.
    const onVisible = () => {
      if (!document.hidden && !disposed) void load()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      authSub.subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, userId, load])

  /**
   * Optimistic, then authoritative. The row is marked read locally so the
   * click feels instantaneous, and the server's answer arrives back through
   * the same subscription as an UPDATE, which reconciles anything that went
   * wrong.
   */
  const markRead = React.useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      const now = new Date().toISOString()
      setRows((prev) =>
        prev.map((r) => (ids.includes(r.id) && !r.read_at ? { ...r, read_at: now } : r))
      )
      setUnread((u) => Math.max(0, u - ids.length))
      await supabase.from("notifications").update({ read_at: now }).in("id", ids).is("read_at", null)
      void load()
    },
    [supabase, load]
  )

  const markAllRead = React.useCallback(async () => {
    const now = new Date().toISOString()
    setRows((prev) => prev.map((r) => (r.read_at ? r : { ...r, read_at: now })))
    setUnread(0)
    await supabase.rpc("fn_mark_all_notifications_read")
    void load()
  }, [supabase, load])

  const clearRead = React.useCallback(async () => {
    await supabase.rpc("fn_archive_read_notifications")
    void load()
  }, [supabase, load])

  const seen = React.useCallback(() => setLive(false), [])

  return { rows, unread, loading, live, load, markRead, markAllRead, clearRead, seen }
}
