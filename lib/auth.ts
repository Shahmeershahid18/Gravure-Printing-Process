import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { landingFor, type Role } from "@/lib/roles"

// Re-exported so server components have one import for both the session and
// the vocabulary. Client components import from "@/lib/roles" directly.
export { ROLES, can, roleLabel, initials, landingFor } from "@/lib/roles"
export type { Role } from "@/lib/roles"

export type SessionProfile = {
  id: string
  email: string
  full_name: string
  employee_no: string | null
  role: Role
  default_machine_id: string | null
  machine_code: string | null
  is_active: boolean
}

/**
 * The signed-in identity plus its profile row.
 *
 * Cached per request so a page, its layout and its nav do not each pay for the
 * same round trip.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, employee_no, role, default_machine_id, is_active, machines(code)")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) {
    // Signed in with no profile row: the handle_new_user trigger did not fire.
    // Treat as the least-privileged role rather than crashing the shell.
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.email ?? "Unknown user",
      employee_no: null,
      role: "viewer",
      default_machine_id: null,
      machine_code: null,
      is_active: true,
    }
  }

  const machine = profile.machines as { code: string } | { code: string }[] | null
  const machine_code = Array.isArray(machine) ? machine[0]?.code ?? null : machine?.code ?? null

  return {
    id: profile.id,
    email: user.email ?? "",
    full_name: profile.full_name,
    employee_no: profile.employee_no,
    role: profile.role as Role,
    default_machine_id: profile.default_machine_id,
    machine_code,
    is_active: profile.is_active,
  }
})

/** Use in any page that must not render for a signed-out visitor. */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  return profile
}

/**
 * Guard a page to a set of roles. Sends the wrong role to its own landing page
 * rather than to a dead end -- plan Section 3.2.
 */
export async function requireRole(...roles: Role[]): Promise<SessionProfile> {
  const profile = await requireProfile()
  if (!roles.includes(profile.role)) redirect(landingFor(profile.role))
  return profile
}
