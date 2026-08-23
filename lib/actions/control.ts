"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireSuperAdmin, ROLES, type Role } from "@/lib/auth"
import { friendlyError } from "@/lib/errors"
import { logActivity } from "@/lib/actions/activity"

/**
 * Everything the console reads and writes.
 *
 * Not one of these functions runs a query. `private.activity_log` and
 * `private.superadmins` live in a schema PostgREST does not expose, so there
 * is no table for a `.from()` call to name -- every path goes through an
 * fn_sa_* function whose first statement is fn_sa_guard(). That means the
 * check happens in the database, once, and cannot be forgotten by a page that
 * calls one of these directly.
 *
 * requireSuperAdmin() on each is therefore belt to the database's braces. It
 * earns its place by turning a 42501 from PostgREST into the same 404 the rest
 * of the console gives, so a stale session that has just been revoked sees the
 * route disappear rather than an error page that confirms it was ever there.
 */

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export type Overview = {
  users: { total: number; active: number; inactive: number; hidden: number }
  by_role: Record<string, number>
  activity: {
    total: number
    last_hour: number
    last_day: number
    last_week: number
    sign_ins_today: number
    failed_today: number
  }
  online: { actor_id: string; actor_name: string | null; actor_role: string | null; last_seen: string; events: number }[]
  notifications: { total: number; unread: number }
  generated_at: string
}

export async function getOverview(): Promise<Overview | null> {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_sa_overview")
  if (error) {
    console.error("[control] overview", error.code, error.message)
    return null
  }
  return data as Overview
}

export type ControlUser = {
  id: string
  full_name: string
  employee_no: string | null
  role: Role
  is_active: boolean
  has_pin: boolean
  created_at: string
  machine_code: string | null
  email: string | null
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  is_superadmin: boolean
  superadmin_since: string | null
  event_count: number
  last_seen: string | null
  unread_notifications: number
}

export async function getUsers(): Promise<ControlUser[]> {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_sa_users")
  if (error) {
    console.error("[control] users", error.code, error.message)
    return []
  }
  return (data ?? []) as ControlUser[]
}

export type ActivityRow = {
  id: number
  occurred_at: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  actor_role: string | null
  actor_hidden: boolean
  category: string
  event: string
  summary: string | null
  target_type: string | null
  target_id: string | null
  path: string | null
  ip: string | null
  user_agent: string | null
  meta: Record<string, unknown>
}

export type ActivityPage = { total: number; rows: ActivityRow[] }

export async function getActivity(filters: {
  limit?: number
  offset?: number
  actor?: string | null
  category?: string | null
  event?: string | null
  since?: string | null
  search?: string | null
}): Promise<ActivityPage> {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_sa_activity", {
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
    p_actor: filters.actor || null,
    p_category: filters.category || null,
    p_event: filters.event || null,
    p_since: filters.since || null,
    p_search: filters.search || null,
  })

  if (error) {
    console.error("[control] activity", error.code, error.message)
    return { total: 0, rows: [] }
  }
  return data as ActivityPage
}

export type UserDetail = {
  profile: (Omit<ControlUser, "event_count" | "last_seen" | "unread_notifications"> & {
    email: string | null
  }) | null
  counts: Record<string, number>
  activity: ActivityRow[]
  changes: {
    id: string
    table_name: string
    record_id: string
    action: string
    changed_at: string
  }[]
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_sa_user_detail", {
    p_user: userId,
    p_limit: 200,
  })
  if (error) {
    console.error("[control] user detail", error.code, error.message)
    return null
  }
  return data as UserDetail
}

export type AuditRow = {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
  changed_by_name: string | null
  changed_by_role: string | null
  changed_by_hidden: boolean
}

export async function getAudit(filters: {
  limit?: number
  offset?: number
  table?: string | null
  actor?: string | null
  action?: string | null
}): Promise<{ total: number; rows: AuditRow[] }> {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_sa_audit", {
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
    p_table: filters.table || null,
    p_actor: filters.actor || null,
    p_action: filters.action || null,
  })

  if (error) {
    console.error("[control] audit", error.code, error.message)
    return { total: 0, rows: [] }
  }
  return data as { total: number; rows: AuditRow[] }
}

export async function getAuditTables(): Promise<string[]> {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_sa_audit_tables")
  return (data ?? []) as string[]
}

// -----------------------------------------------------------------------------
// Writes
// -----------------------------------------------------------------------------

export type ControlResult = { ok: boolean; error?: string }

export async function setUser(values: {
  id: string
  role?: Role
  is_active?: boolean
  full_name?: string
}): Promise<ControlResult> {
  const me = await requireSuperAdmin()

  if (values.role && !ROLES.includes(values.role)) {
    return { ok: false, error: "That is not a role this system knows." }
  }
  // The console is reached through a session, and a session belongs to an
  // account that can be deactivated. Deactivating your own is a locked door
  // with the key inside.
  if (values.id === me.id && values.is_active === false) {
    return { ok: false, error: "You cannot deactivate the account you are signed in with." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_sa_set_user", {
    p_user: values.id,
    p_role: values.role ?? null,
    p_is_active: values.is_active ?? null,
    p_full_name: values.full_name ?? null,
  })

  if (error) return { ok: false, error: friendlyError(error, "That change was not saved.") }

  revalidatePath("/control/users")
  return { ok: true }
}

/**
 * Grant or revoke the hidden role.
 *
 * The database refuses to remove the last one -- see fn_sa_set_superadmin --
 * because the console has no other way in, and a system whose only privileged
 * account can be removed from inside that account is one SQL console call away
 * from being unrecoverable at exactly the wrong moment.
 */
export async function setSuperadmin(userId: string, on: boolean): Promise<ControlResult> {
  const me = await requireSuperAdmin()

  if (userId === me.id && !on) {
    return {
      ok: false,
      error:
        "You cannot revoke your own access from in here. Grant another account first, sign in as it, then revoke this one.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_sa_set_superadmin", { p_user: userId, p_on: on })

  if (error) return { ok: false, error: friendlyError(error, "That change was not saved.") }

  await logActivity({
    event: on ? "admin.superadmin_granted" : "admin.superadmin_revoked",
    category: "admin",
    targetType: "profile",
    targetId: userId,
  })

  revalidatePath("/control/users")
  return { ok: true }
}

/**
 * Stop a suspicious account acting, without losing what it did.
 *
 * This is the first response to a suspicious account, not deletion. Everything
 * that makes the account suspicious is evidence, and evidence is exactly what
 * a delete destroys -- so this is reversible, instant, and keeps the whole
 * trail. It takes effect on their next request rather than their next
 * sign-in, because the middleware re-reads is_active every time.
 */
export async function suspendUser(
  userId: string,
  reason?: string,
  on = true
): Promise<ControlResult & { name?: string }> {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_sa_suspend_user", {
    p_user: userId,
    p_reason: reason?.trim() || null,
    p_on: on,
  })

  if (error) {
    return { ok: false, error: friendlyError(error, "That account was not changed.") }
  }

  revalidatePath("/control/users")
  revalidatePath("/settings/users")
  return { ok: true, name: (data as { name?: string } | null)?.name }
}

export type DeleteOutcome = ControlResult & {
  name?: string
  detached?: Record<string, number>
}

/**
 * Remove an account permanently.
 *
 * Two steps, in this order and not the other, because eleven columns across
 * the schema reference profiles(id) with no ON DELETE action -- so the sign-in
 * cannot be removed while any of them still point at it, and detaching them is
 * what destroys "who ran this job".
 *
 *   1. fn_sa_prepare_delete deactivates the account, writes a tombstone naming
 *      it, then nulls those references and reports how many it touched.
 *   2. The Admin API removes the sign-in itself. That cannot be done from SQL:
 *      auth.users is owned by supabase_auth_admin, so the service role key is
 *      the supported path and the same one createUser() already uses.
 *
 * If step 2 fails, what is left is a suspended account with detached history
 * rather than a live account whose trail has been wiped. That is the right way
 * round for a partial failure, and it is why the service key is checked before
 * step 1 runs rather than after.
 */
export async function deleteUser(userId: string): Promise<DeleteOutcome> {
  const me = await requireSuperAdmin()

  if (userId === me.id) {
    return { ok: false, error: "You cannot delete the account you are signed in with." }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !url) {
    return {
      ok: false,
      error:
        "This server has no service role key, so it cannot remove a sign-in. Suspend the account instead — that stops them acting immediately and keeps the record of what they did.",
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_sa_prepare_delete", { p_user: userId })
  if (error) {
    return { ok: false, error: friendlyError(error, "That account was not deleted.") }
  }

  const prepared = data as { name: string; email: string | null; detached: Record<string, number> }

  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { msg?: string; message?: string }
    console.error("[control] delete user", res.status, body.msg ?? body.message ?? "")

    await logActivity({
      event: "admin.user_delete_failed",
      category: "security",
      summary: `Sign-in removal failed for ${prepared.name}; the account is suspended and its history detached`,
      targetType: "profile",
      targetId: userId,
    })

    return {
      ok: false,
      name: prepared.name,
      detached: prepared.detached,
      error:
        "The account was suspended and its records detached, but the sign-in itself could not be removed. Delete it from the Supabase dashboard under Authentication → Users to finish.",
    }
  }

  revalidatePath("/control/users")
  revalidatePath("/settings/users")
  return { ok: true, name: prepared.name, detached: prepared.detached }
}

export type Signals = {
  window_hours: number
  failed_sign_ins: { email: string; attempts: number; last_attempt: string; distinct_ips: number }[]
  pin_failures: { user_id: string; name: string | null; attempts: number; last_attempt: string }[]
  refusals: { actor_id: string; name: string | null; role: string | null; events: number; last_seen: string }[]
  heavy_readers: { actor_id: string; name: string | null; role: string | null; pages: number; last_seen: string }[]
  deletions: { actor_id: string | null; name: string | null; n: number; last_seen: string }[]
  dormant: { id: string; full_name: string; role: string; last_sign_in_at: string | null }[]
}

export async function getSignals(hours = 24): Promise<Signals | null> {
  await requireSuperAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("fn_sa_signals", { p_hours: hours })
  if (error) {
    console.error("[control] signals", error.code, error.message)
    return null
  }
  return data as Signals
}

export async function pruneActivity(
  olderThanDays: number,
  includeAudit = false
): Promise<ControlResult & { deleted?: number; auditDeleted?: number }> {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("fn_sa_prune_activity", {
    p_older_than_days: Math.max(olderThanDays, 7),
    p_include_audit: includeAudit,
  })

  if (error) return { ok: false, error: friendlyError(error, "Nothing was removed.") }

  const result = data as { deleted: number; audit_deleted: number } | null

  revalidatePath("/control/activity")
  revalidatePath("/control/audit")
  return {
    ok: true,
    deleted: result?.deleted ?? 0,
    auditDeleted: result?.audit_deleted ?? 0,
  }
}
