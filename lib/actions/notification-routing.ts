"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireRole, ROLES, type Role } from "@/lib/auth"
import { friendlyError } from "@/lib/errors"
import { logActivity } from "@/lib/actions/activity"

/**
 * Which roles a category is sent to.
 *
 * Admin only, at both layers: this action and the `types admin write` policy
 * on notification_types. Kept out of lib/actions/notifications.ts because that
 * file is imported by pages every role can open, and a server action module is
 * a single bundle boundary -- there is no reason for a viewer's request to
 * carry the code path that rewires everybody's notifications.
 */
export async function setCategoryRoles(
  category: string,
  roles: Role[]
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin")

  const clean = roles.filter((r) => ROLES.includes(r))
  if (clean.length !== roles.length) {
    return { ok: false, error: "That is not a role this system knows." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notification_types")
    .update({ default_roles: clean })
    .eq("category", category)

  if (error) {
    return { ok: false, error: friendlyError(error, "That change was not saved.") }
  }

  await logActivity({
    event: "admin.notification_routing",
    category: "admin",
    summary: `${category} now goes to ${clean.length ? clean.join(", ") : "nobody"}`,
    targetType: "notification_type",
    targetId: category,
    meta: { roles: clean },
  })

  revalidatePath("/settings/notifications")
  return { ok: true }
}
