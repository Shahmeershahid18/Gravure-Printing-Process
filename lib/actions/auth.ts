"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { landingFor, type Role } from "@/lib/auth"

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
    return { error: "Email or password is not correct. Check both and try again." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle()

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    return { error: "This account is deactivated. Ask an admin to reactivate it." }
  }

  revalidatePath("/", "layout")
  redirect(landingFor((profile?.role as Role) ?? "viewer"))
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
  await supabase.auth.signOut()

  const jar = await cookies()
  jar.delete("operator_id")
  jar.delete("operator_name")

  revalidatePath("/", "layout")
  redirect("/login")
}
