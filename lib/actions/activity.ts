"use server"

import { headers } from "next/headers"
import { createClient } from "@/utils/supabase/server"

/**
 * The write half of the activity log.
 *
 * The read half does not exist here at all: `private.activity_log` is in a
 * schema PostgREST does not expose, so there is no query any client of this
 * app -- including this file -- can run against it. Only the console's
 * fn_sa_* functions can read it, and each of those checks the caller.
 *
 * Every call is deliberately fire-and-forget. Logging is never allowed to fail
 * a user's action or slow it measurably: if the log write errors, the user
 * still gets their page. The alternative -- a sign-in that fails because the
 * audit trail is briefly unavailable -- is worse than a gap in the trail.
 */

export type ActivityCategory =
  | "auth"      // sign in, sign out, PIN unlock, failures
  | "page"      // navigation
  | "data"      // writes (mostly raised by the database trigger, not here)
  | "admin"     // privileged acts
  | "security"  // refused access, guard trips
  | "general"

type LogInput = {
  event: string
  category?: ActivityCategory
  summary?: string | null
  targetType?: string | null
  targetId?: string | null
  path?: string | null
  meta?: Record<string, unknown>
  /** Only for events raised before a session exists, i.e. a failed sign-in. */
  actorEmail?: string | null
}

/**
 * The client's address and browser, as seen through whatever proxy is in
 * front of the app. x-forwarded-for is a list when there is more than one hop
 * and the first entry is the original client.
 */
async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const fwd = h.get("x-forwarded-for")
    return {
      ip: fwd?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent"),
    }
  } catch {
    return { ip: null, userAgent: null }
  }
}

export async function logActivity(input: LogInput): Promise<void> {
  try {
    const supabase = await createClient()
    const { ip, userAgent } = await requestContext()

    await supabase.rpc("fn_log_activity", {
      p_event: input.event,
      p_category: input.category ?? "general",
      p_summary: input.summary ?? null,
      p_target_type: input.targetType ?? null,
      p_target_id: input.targetId ?? null,
      p_path: input.path ?? null,
      p_meta: input.meta ?? {},
      p_ip: ip,
      p_user_agent: userAgent,
      p_actor_email: input.actorEmail ?? null,
    })
  } catch (error) {
    // Server log only. The caller is mid-action and has nothing to do with it.
    console.error("[activity]", input.event, error)
  }
}

/**
 * Called from the client on every navigation.
 *
 * Page views are the difference between a log that shows what someone changed
 * and a log that shows what someone looked at, and on a system holding customer
 * artwork and cylinder costs those are different questions.
 *
 * Paths are recorded as the route rather than as typed, with uuids replaced by
 * a marker: /runs/3fa8…/ and /runs/9c21…/ are the same screen, and a hundred
 * distinct paths make the log harder to read without saying anything the
 * target_id does not already say.
 */
export async function logPageView(path: string, title?: string): Promise<void> {
  const clean = path.split("?")[0].slice(0, 300)
  const route = clean.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ":id"
  )
  const id = clean.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  )?.[0]

  await logActivity({
    event: "page.view",
    category: "page",
    summary: title ?? route,
    path: route,
    targetType: id ? "record" : null,
    targetId: id ?? null,
  })
}
