"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

const OPERATOR_COOKIE = "operator_id"
const OPERATOR_NAME_COOKIE = "operator_name"

/**
 * PIN auto-locks after 30 minutes idle, but the Supabase session persists, so
 * the tablet never gets logged out mid-shift (plan Section 8, point 4).
 */
const PIN_TTL_SECONDS = 30 * 60

export type OperatorSession = { id: string; name: string } | null

export async function getActiveOperator(): Promise<OperatorSession> {
  const jar = await cookies()
  const id = jar.get(OPERATOR_COOKIE)?.value
  const name = jar.get(OPERATOR_NAME_COOKIE)?.value
  if (!id) return null
  return { id, name: name ? decodeURIComponent(name) : "Operator" }
}

export async function signInOperator(
  operatorId: string,
  pin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, error: "A PIN is 4 digits. Enter all four." }
  }

  const supabase = await createClient()

  const { data: ok, error } = await supabase.rpc("fn_verify_operator_pin", {
    p_profile_id: operatorId,
    p_pin: pin,
  })

  if (error) {
    return { ok: false, error: "Cannot reach the server. Try again in a moment." }
  }
  if (!ok) {
    return { ok: false, error: "That PIN is not correct for this operator." }
  }

  const { data: profile } = await supabase
    .from("v_operator_directory")
    .select("full_name")
    .eq("id", operatorId)
    .maybeSingle()

  const jar = await cookies()
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PIN_TTL_SECONDS,
  }
  jar.set(OPERATOR_COOKIE, operatorId, opts)
  jar.set(
    OPERATOR_NAME_COOKIE,
    encodeURIComponent(profile?.full_name ?? "Operator"),
    { ...opts, httpOnly: false }
  )

  revalidatePath("/kiosk", "layout")
  return { ok: true }
}

/**
 * Lock the tablet back to the operator picker.
 *
 * This is not a sign-out: the machine account's Supabase session stays alive
 * so the next operator does not have to find IT to get back in.
 */
export async function lockOperator() {
  const jar = await cookies()
  jar.delete(OPERATOR_COOKIE)
  jar.delete(OPERATOR_NAME_COOKIE)
  revalidatePath("/kiosk", "layout")
}

/** Push the idle timer out on real activity, so a long run does not lock. */
export async function touchOperatorSession() {
  const jar = await cookies()
  const id = jar.get(OPERATOR_COOKIE)?.value
  const name = jar.get(OPERATOR_NAME_COOKIE)?.value
  if (!id) return
  const opts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PIN_TTL_SECONDS,
  }
  jar.set(OPERATOR_COOKIE, id, { ...opts, httpOnly: true })
  if (name) jar.set(OPERATOR_NAME_COOKIE, name, { ...opts, httpOnly: false })
}
