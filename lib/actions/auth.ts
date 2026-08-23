"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { landingFor, type Role } from "@/lib/auth"
import { logActivity } from "@/lib/actions/activity"

export type AuthState = { error?: string }

/**
 * Sign in with email and password.
 *
 * Errors say what to fix -- Section 4.4, rule 7 -- but a sign-in form is the
 * one place where saying too much is a disclosure risk, so a wrong email and a
 * wrong password give the same message.
 */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email) return { error: "Enter your email address." }
  if (!password) return { error: "Enter your password." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    // Recorded with the email that was tried, which is the only useful thing
    // about a failure: repeated attempts against one real address look
    // different from a spray across made-up ones. There is no session at this
    // point, so fn_log_activity accepts it on the strength of the auth.*
    // prefix and nothing else.
    await logActivity({
      event: "auth.sign_in_failed",
      category: "security",
      summary: `Failed sign-in for ${email}`,
      actorEmail: email,
    })
    return { error: "Email or password is not correct. Check both and try again." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle()

  if (profile && profile.is_active === false) {
    await logActivity({
      event: "auth.sign_in_blocked",
      category: "security",
      summary: `Deactivated account attempted sign-in: ${email}`,
      actorEmail: email,
    })
    await supabase.auth.signOut()
    return { error: "This account is deactivated. Ask an admin to reactivate it." }
  }

  await logActivity({
    event: "auth.sign_in",
    category: "auth",
    summary: `Signed in as ${profile?.role ?? "viewer"}`,
  })

  // Asked once, here, rather than being carried in the session: this is the
  // only moment the answer changes where the user goes, and it costs one small
  // query on a path that already makes several.
  const { data: superadmin } = await supabase.rpc("fn_is_superadmin")

  revalidatePath("/", "layout")
  redirect(landingFor((profile?.role as Role) ?? "viewer", superadmin === true))
}

/**
 * Sign out.
 *
 * Clears the Supabase session and the kiosk operator cookie together, so a
 * machine account signing out never leaves an operator attributed on the
 * tablet.
 */
export async function signOut() {
  const supabase = await createClient()

  // Before the session goes, or auth.uid() is null and the entry is anonymous.
  await logActivity({ event: "auth.sign_out", category: "auth", summary: "Signed out" })

  await supabase.auth.signOut()

  const jar = await cookies()
  jar.delete("operator_id")
  jar.delete("operator_name")

  revalidatePath("/", "layout")
  redirect("/login")
}
