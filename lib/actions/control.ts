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
