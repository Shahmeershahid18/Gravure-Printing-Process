"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, requireRole, type Role } from "@/lib/auth"
import { friendlyError } from "@/lib/errors"
import { logActivity } from "@/lib/actions/activity"
import type {
  Notification,
  NotificationCategory,
  NotificationSeverity,
} from "@/lib/notifications"
import { NOTIFICATION_COLUMNS } from "@/lib/notifications"

export type NotificationResult = { ok: boolean; error?: string }

/**
 * Reading and writing an inbox needs no privileged path.
 *
 * The policy on `notifications` is `recipient_id = auth.uid()`, so an ordinary
 * PostgREST call through the caller's own session can only ever touch their own
 * rows -- there is no filter here that, if omitted, would widen the blast
 * radius. The two exceptions are "mark all" and "archive read", which are RPCs
 * precisely because they are the calls where a missing filter would be a
 * mistake, and the predicate is not the client's to supply.
 */

export type Inbox = {
  rows: Notification[]
  unread: number
  total: number
}

export async function getInbox(options?: {
  filter?: "all" | "unread"
  category?: NotificationCategory | null
  limit?: number
}): Promise<Inbox> {
  const profile = await requireProfile()
  const supabase = await createClient()
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS, { count: "exact" })
    .eq("recipient_id", profile.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (options?.filter === "unread") query = query.is("read_at", null)
  if (options?.category) query = query.eq("category", options.category)

  const [{ data, count }, { count: unread }] = await Promise.all([
    query,
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .is("archived_at", null)
      .is("read_at", null),
  ])

  return {
    rows: (data ?? []) as unknown as Notification[],
    unread: unread ?? 0,
    total: count ?? 0,
  }
}

export async function markRead(ids: string[]): Promise<NotificationResult> {
  const profile = await requireProfile()
  if (ids.length === 0) return { ok: true }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("recipient_id", profile.id)
    .is("read_at", null)

  if (error) return { ok: false, error: friendlyError(error, "Could not mark that as read.") }

  revalidatePath("/notifications")
  return { ok: true }
}

export async function markUnread(id: string): Promise<NotificationResult> {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: null })
    .eq("id", id)
    .eq("recipient_id", profile.id)

  if (error) return { ok: false, error: friendlyError(error, "Could not mark that as unread.") }

  revalidatePath("/notifications")
  return { ok: true }
}

export async function markAllRead(): Promise<NotificationResult & { count?: number }> {
  await requireProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_mark_all_notifications_read")

  if (error) return { ok: false, error: friendlyError(error, "Could not mark these as read.") }

  revalidatePath("/notifications")
  return { ok: true, count: (data as number | null) ?? 0 }
}

/**
 * Archive, not delete.
 *
 * A notification is a record that someone was told something, and on a floor
 * where a briefing note is the difference between a good run and a reject that
 * is worth keeping. Archived rows leave the inbox and stay in the table.
 */
export async function archive(id: string): Promise<NotificationResult> {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString(), read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", profile.id)

  if (error) return { ok: false, error: friendlyError(error, "Could not clear that notification.") }

  revalidatePath("/notifications")
  return { ok: true }
}

export async function archiveRead(): Promise<NotificationResult & { count?: number }> {
  await requireProfile()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_archive_read_notifications")

  if (error) return { ok: false, error: friendlyError(error, "Could not clear these notifications.") }

  revalidatePath("/notifications")
  return { ok: true, count: (data as number | null) ?? 0 }
}

// -----------------------------------------------------------------------------
// Preferences
// -----------------------------------------------------------------------------

export type PreferenceRow = {
  category: NotificationCategory
  label: string
  description: string
  enabled: boolean
  /** False when the category never routes to this person's role anyway. */
  routed: boolean
}

export async function getPreferences(): Promise<PreferenceRow[]> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: types }, { data: prefs }] = await Promise.all([
    supabase
      .from("notification_types")
      .select("category, label, description, default_roles, default_enabled, sort_order")
      .order("sort_order"),
    supabase.from("notification_prefs").select("category, enabled").eq("user_id", profile.id),
  ])

  const chosen = new Map((prefs ?? []).map((p) => [p.category as string, p.enabled as boolean]))

  return (types ?? []).map((t) => ({
    category: t.category as NotificationCategory,
    label: t.label as string,
    description: t.description as string,
    enabled: chosen.get(t.category as string) ?? (t.default_enabled as boolean),
    // The super admin is routed nothing by design -- fn_notify skips hidden
    // accounts -- so every row would read "not sent to you". Showing them as
    // routed keeps the screen honest about what the switches would do.
    routed:
      profile.is_superadmin ||
      ((t.default_roles as Role[] | null) ?? []).includes(profile.role),
  }))
}

export async function setPreference(
  category: NotificationCategory,
  enabled: boolean
): Promise<NotificationResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: profile.id, category, enabled }, { onConflict: "user_id,category" })

  if (error) return { ok: false, error: friendlyError(error, "Could not save that setting.") }

  revalidatePath("/notifications/preferences")
  return { ok: true }
}

// -----------------------------------------------------------------------------
// Announcements
// -----------------------------------------------------------------------------

/**
 * The one path by which a person, rather than an event, puts something in
 * someone's inbox.
 *
 * The role check is repeated in the database function, which is the wall.
 * requireRole here is the signpost, and it also means an announcement attempt
 * by the wrong role never reaches the network.
 */
export async function broadcast(values: {
  title: string
  body?: string
  roles?: Role[]
  severity?: NotificationSeverity
  link?: string
}): Promise<NotificationResult & { sent?: number }> {
  const sender = await requireRole("admin")

  const title = values.title?.trim()
  if (!title) return { ok: false, error: "An announcement needs a title." }
  if (title.length > 120) {
    return { ok: false, error: "Keep the title under 120 characters. Put the detail in the message." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_broadcast_notification", {
    p_title: title,
    p_body: values.body?.trim() || null,
    p_roles: values.roles?.length ? values.roles : null,
    p_severity: values.severity ?? "info",
    p_link: values.link?.trim() || null,
  })

  if (error) return { ok: false, error: friendlyError(error, "The announcement was not sent.") }

  const sent = (data as number | null) ?? 0

  await logActivity({
    event: "admin.broadcast",
    category: "admin",
    summary: title,
    targetType: "notification",
    meta: { recipients: sent, roles: values.roles ?? "default", by: sender.id },
  })

  revalidatePath("/notifications")
  return { ok: true, sent }
}
