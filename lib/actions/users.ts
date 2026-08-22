"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireRole, ROLES, type Role } from "@/lib/auth"

export type UserResult = { ok: boolean; error?: string }

/**
 * Change a person's role, machine or active flag.
 *
 * Role is what drives both the shell someone lands in and the row level
 * policies, so this is the highest-leverage screen in the product and it is
 * admin only at every layer: middleware, this action, and the RLS policy on
 * profiles.
 */
export async function updateProfile(values: {
  id: string
  full_name: string
  employee_no?: string | null
  role: string
  default_machine_id?: string | null
  is_active: boolean
}): Promise<UserResult> {
  const admin = await requireRole("admin")

  if (!ROLES.includes(values.role as Role)) {
    return { ok: false, error: "That is not a role this system knows." }
  }
  if (!values.full_name?.trim()) {
    return { ok: false, error: "A person needs a name the floor will recognise." }
  }

  // An admin who demotes or deactivates themselves locks everyone out of user
  // management, and only a database console can undo it.
  if (values.id === admin.id && values.role !== "admin") {
    return { ok: false, error: "You cannot remove your own admin role. Ask another admin." }
  }
  if (values.id === admin.id && !values.is_active) {
    return { ok: false, error: "You cannot deactivate your own account." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: values.full_name.trim(),
      employee_no: values.employee_no?.trim() || null,
      role: values.role,
      default_machine_id: values.default_machine_id || null,
      is_active: values.is_active,
    })
    .eq("id", values.id)

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { ok: false, error: "That employee number is already used by someone else." }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath("/settings/users")
  return { ok: true }
}

/**
 * Set an operator's 4 digit PIN.
 *
 * The PIN never round-trips as a hash through the client: the database hashes
 * it inside a security definer function that checks the caller is an admin.
 */
export async function setOperatorPin(profileId: string, pin: string): Promise<UserResult> {
  await requireRole("admin")

  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, error: "A PIN is exactly 4 digits." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_set_operator_pin", {
    p_profile_id: profileId,
    p_pin: pin,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath("/settings/users")
  return { ok: true }
}

export async function clearOperatorPin(profileId: string): Promise<UserResult> {
  await requireRole("admin")
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_clear_operator_pin", { p_profile_id: profileId })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/settings/users")
  return { ok: true }
}

/**
 * Create a sign-in for a new person.
 *
 * Creating an auth user needs the service role key, which is server-only and
 * may not be configured. When it is missing this says so plainly rather than
 * failing with a stack trace, because the fallback -- creating the user in the
 * Supabase dashboard -- is a perfectly good five second job.
 */
export async function createUser(values: {
  email: string
  password: string
  full_name: string
  role: string
  employee_no?: string | null
  default_machine_id?: string | null
}): Promise<UserResult> {
  await requireRole("admin")

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !url) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set on the server, so this app cannot create sign-ins. Add the key to your environment, or create the user in the Supabase dashboard and set their role here.",
    }
  }
  if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    return { ok: false, error: "Enter a valid email address." }
  }
  if (values.password.length < 8) {
    return { ok: false, error: "Use a password of at least 8 characters." }
  }
  if (!ROLES.includes(values.role as Role)) {
    return { ok: false, error: "That is not a role this system knows." }
  }

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: values.email.trim(),
      password: values.password,
      email_confirm: true,
      user_metadata: { full_name: values.full_name.trim() },
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { msg?: string; message?: string }
    return { ok: false, error: body.msg ?? body.message ?? "The sign-in could not be created." }
  }

  const created = (await res.json()) as { id: string }

  // The handle_new_user trigger inserts the profile as 'viewer'; set the real
  // role and machine now.
  const supabase = await createClient()
  await supabase
    .from("profiles")
    .update({
      full_name: values.full_name.trim(),
      employee_no: values.employee_no?.trim() || null,
      role: values.role,
      default_machine_id: values.default_machine_id || null,
    })
    .eq("id", created.id)

  revalidatePath("/settings/users")
  return { ok: true }
}
