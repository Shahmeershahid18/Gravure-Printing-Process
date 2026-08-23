"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { NOTIFICATION_COLUMNS, type Notification } from "@/lib/notifications"

/**
 * The inbox, live, shared by every component that asks for it.
 *
 * ---------------------------------------------------------------------------
 * Why this is a store and not just an effect
 *
 * The first version opened its own channel per hook, named `inbox:<uuid>`.
 * That works with one consumer and breaks with two, which is exactly what the
 * notifications page has: the bell lives in the app layout and the list lives
 * in the page, so both mount together.
 *
 * `createBrowserClient` hands back a cached client, and `supabase.channel()`
 * returns an *existing* channel when one already holds that topic rather than
 * making a second. So the second hook received the first hook's channel, which
 * had already been subscribed, and adding a listener to it threw:
 *
 *     cannot add `postgres_changes` callbacks for realtime:inbox:… after
 *     `subscribe()`
 *
 * Giving each hook a unique topic would have silenced it, at the cost of two
 * sockets, two queries per event, and a bell whose count could disagree with
 * the list directly beneath it. One store shared by reference count is both
 * the smaller runtime and the correct behaviour: everything reading the inbox
 * reads the same inbox.
 *
 * The channel topic still carries a sequence number. Teardown through
 * `removeChannel()` is asynchronous, so a store disposed and immediately
 * recreated -- React's development double-mount does exactly this -- could
 * otherwise collide with its own outgoing channel and reproduce the error it
 * is here to fix.
 *
 * ---------------------------------------------------------------------------
 * What has not changed
 *
 * Delivery is still one Postgres Changes subscription with RLS applied per
 * subscriber, and the token still goes on the socket *before* the channel is
 * opened -- otherwise the subscriber joins anonymously, reports SUBSCRIBED,
 * and is never told about a single row.
 *
 * The event remains a signal, never a payload. An arriving INSERT triggers a
 * refetch rather than being spliced in, so there is one code path for "what is
 * in my inbox" and a dropped socket heals the list instead of leaving a hole.
 */

const REFETCH_DEBOUNCE_MS = 250

export type InboxSnapshot = {
  rows: Notification[]
  unread: number
  loading: boolean
  /** True when something arrived while the panel was shut. */
  live: boolean
}

type Store = {
  subscribe: (onChange: () => void) => () => void
  getSnapshot: () => InboxSnapshot
  retain: () => void
  release: () => void
  want: (limit: number) => void
  load: () => Promise<void>
  markRead: (ids: string[]) => Promise<void>
  markUnread: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  archive: (id: string) => Promise<void>
  clearRead: () => Promise<void>
  seen: () => void
}

/**
 * Returned by getSnapshot before anything has loaded, and by getServerSnapshot
 * during the server render. It must be one stable object: useSyncExternalStore
 * compares by identity, and a fresh literal each call is an infinite render.
 */
const EMPTY: InboxSnapshot = { rows: [], unread: 0, loading: true, live: false }

const noop = async () => {}

/** Rendered on the server, where there is no socket and no browser client. */
const SERVER_STORE: Store = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY,
  retain: () => {},
  release: () => {},
  want: () => {},
  load: noop,
  markRead: noop,
  markUnread: noop,
  markAllRead: noop,
  archive: noop,
  clearRead: noop,
  seen: () => {},
}

const stores = new Map<string, Store>()
let channelSeq = 0

function createStore(userId: string): Store {
  const supabase = createClient()

  let snapshot: InboxSnapshot = EMPTY
  const listeners = new Set<() => void>()

  let refs = 0
  let limit = 12

  /**
   * The store is revivable, and it is never removed from the registry.
   *
   * React's development double-mount runs mount, unmount, mount against the
   * same component, so the reference count touches zero in between. An earlier
   * version treated that as death -- it deleted itself from the registry and
   * latched a `started` flag -- which meant the remounted component still held
   * the disposed object through its useMemo, called retain(), hit the latch,
   * and sat there for ever with a channel that had already been removed. The
   * bell simply never loaded, silently.
   *
   * `active` says whether the socket is up and can go back and forth freely.
   * `generation` fences in-flight fetches: a load that was already awaiting
   * when the store went quiet must not write its result into a later life.
   */
  let active = false
  let generation = 0

  let timer: ReturnType<typeof setTimeout> | undefined
  let channel: ReturnType<typeof supabase.channel> | undefined
  let authSub: { unsubscribe: () => void } | undefined

  const emit = () => {
    for (const l of listeners) l()
  }

  const set = (patch: Partial<InboxSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    emit()
  }

  const load = async () => {
    const g = generation

    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null)
        .is("read_at", null),
    ])

    if (g !== generation) return
    set({
      rows: (data ?? []) as unknown as Notification[],
      unread: count ?? 0,
      loading: false,
    })
  }

  const schedule = (isInsert: boolean) => {
    if (isInsert) set({ live: true })
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (active) void load()
    }, REFETCH_DEBOUNCE_MS)
  }

  const onVisible = () => {
    // The socket may have slept through several events, and the count on the
    // bell is the one thing that must not be stale when someone glances at it.
    if (!document.hidden && active) void load()
  }

  const start = async () => {
    if (active) return
    active = true
    const g = ++generation

    await load()
    if (g !== generation) return

    const { data } = await supabase.auth.getSession()
    if (g !== generation) return
    const token = data.session?.access_token
    if (token) await supabase.realtime.setAuth(token)
    if (g !== generation) return

    channel = supabase
      .channel(`inbox:${userId}:${++channelSeq}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          // RLS would filter these anyway; the filter means the server never
          // sends rows this client would discard, which on a busy shift is
          // most of them.
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => schedule(payload.eventType === "INSERT")
      )
      .subscribe()

    // A shift outlasts an access token. Hand the socket the new one, or the
    // bell goes quiet an hour in without saying so.
    authSub = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) void supabase.realtime.setAuth(session.access_token)
    }).data.subscription

    document.addEventListener("visibilitychange", onVisible)
  }

  const stop = () => {
    if (!active) return
    active = false
    // Fences any fetch still in flight, and any start() mid-await.
    generation += 1

    if (timer) clearTimeout(timer)
    document.removeEventListener("visibilitychange", onVisible)
    authSub?.unsubscribe()
    authSub = undefined

    // removeChannel resolves asynchronously, which is why the next channel
    // takes a fresh sequence number rather than reusing this topic.
    if (channel) void supabase.removeChannel(channel)
    channel = undefined
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },

    getSnapshot: () => snapshot,

    retain() {
      refs += 1
      if (refs === 1) void start()
    },

    release() {
      // Clamped rather than allowed to go negative: an unbalanced release
      // would otherwise leave the count below zero, and the next retain()
      // would not reach 1 and never restart the socket.
      refs = Math.max(0, refs - 1)
      if (refs === 0) stop()
    },

    /**
     * Raise the page size. Never lowers it: the bell wants twelve and the
     * inbox wants fifty, and shrinking back when the inbox unmounts would
     * throw away rows the bell already has for no gain.
     */
    want(next) {
      if (next > limit) {
        limit = next
        if (active) void load()
      }
    },

    load,

    /**
     * Optimistic, then authoritative. The row is marked read locally so the
     * click is instantaneous; the server's answer comes back through the same
     * subscription as an UPDATE and reconciles anything that went wrong.
     */
    async markRead(ids) {
      if (ids.length === 0) return
      const now = new Date().toISOString()
      const hit = snapshot.rows.filter((r) => ids.includes(r.id) && !r.read_at).length
      set({
        rows: snapshot.rows.map((r) =>
          ids.includes(r.id) && !r.read_at ? { ...r, read_at: now } : r
        ),
        unread: Math.max(0, snapshot.unread - hit),
      })
      await supabase.from("notifications").update({ read_at: now }).in("id", ids).is("read_at", null)
      await load()
    },

    async markUnread(id) {
      set({
        rows: snapshot.rows.map((r) => (r.id === id ? { ...r, read_at: null } : r)),
        unread: snapshot.unread + 1,
      })
      await supabase.from("notifications").update({ read_at: null }).eq("id", id)
      await load()
    },

    async markAllRead() {
      const now = new Date().toISOString()
      set({
        rows: snapshot.rows.map((r) => (r.read_at ? r : { ...r, read_at: now })),
        unread: 0,
      })
      await supabase.rpc("fn_mark_all_notifications_read")
      await load()
    },

    async archive(id) {
      const now = new Date().toISOString()
      set({ rows: snapshot.rows.filter((r) => r.id !== id) })
      await supabase
        .from("notifications")
        .update({ archived_at: now, read_at: now })
        .eq("id", id)
      await load()
    },

    async clearRead() {
      await supabase.rpc("fn_archive_read_notifications")
      await load()
    },

    seen() {
      if (snapshot.live) set({ live: false })
    },
  }
}

function getStore(userId: string): Store {
  if (typeof window === "undefined") return SERVER_STORE
  let store = stores.get(userId)
  if (!store) {
    store = createStore(userId)
    stores.set(userId, store)
  }
  return store
}

export function useInbox(userId: string, limit = 12) {
  const store = React.useMemo(() => getStore(userId), [userId])

  const snapshot = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => EMPTY
  )

  // Two effects, not one. Folding the page size into the retain effect would
  // make "Show older" drop the reference count to zero, tear the channel down
  // and build a new one -- a socket reconnect to read twenty more rows.
  React.useEffect(() => {
    store.retain()
    return () => store.release()
  }, [store])

  React.useEffect(() => {
    store.want(limit)
  }, [store, limit])

  return {
    rows: snapshot.rows,
    unread: snapshot.unread,
    loading: snapshot.loading,
    live: snapshot.live,
    load: store.load,
    markRead: store.markRead,
    markUnread: store.markUnread,
    markAllRead: store.markAllRead,
    archive: store.archive,
    clearRead: store.clearRead,
    seen: store.seen,
  }
}
