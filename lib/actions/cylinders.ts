"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, can } from "@/lib/auth"
import { friendlyError, dbThrow } from "@/lib/errors"

export type EventResult = { ok: boolean; error?: string }

const EventSchema = z.object({
  cylinder_id: z.string().uuid(),
  event_type: z.enum([
    "engraved", "chrome_plated", "dechromed", "re_engraved", "cleaning",
    "repair", "inspection", "issued_to_customer", "received_from_customer", "scrapped",
  ]),
  event_date: z.string().min(1, "Pick the date this happened."),
  meters_at_event: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nullable().optional()
  ),
  supplier_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
  cost: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nullable().optional()
  ),
  description: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
})

/**
 * Record something that happened to a cylinder.
 *
 * Cleaning and repair carry the meter reading at that moment, so you can see
 * whether a repair bought you 200,000 meters or 20,000 (plan Section 2.3).
 * Engrave, re-engrave and re-chrome additionally reset the surface life count.
 */
export async function logCylinderEvent(values: Record<string, unknown>): Promise<EventResult> {
  const profile = await requireProfile()
  if (!can.logObservation(profile.role)) {
    return { ok: false, error: "Your role cannot record cylinder events." }
  }

  const parsed = EventSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()

  // Default the reading to the cylinder's current lifetime total rather than
  // making someone look it up and mistype it.
  let meters_at_event = parsed.data.meters_at_event
  if (meters_at_event === null || meters_at_event === undefined) {
    const { data } = await supabase
      .from("v_cylinder_summary")
      .select("lifetime_meters")
      .eq("id", parsed.data.cylinder_id)
      .maybeSingle()
    meters_at_event = Number(data?.lifetime_meters ?? 0)
  }

  const { error } = await supabase.from("cylinder_events").insert({
    ...parsed.data,
    meters_at_event,
    performed_by: profile.id,
  })

  if (error) return { ok: false, error: friendlyError(error, "Could not save the cylinder.") }

  // Some events also move the cylinder, so keep status honest without making
  // the user remember a second step.
  const statusFor: Record<string, string> = {
    re_engraved: "in_store",
    engraved: "in_store",
    chrome_plated: "in_store",
    repair: "under_repair",
    issued_to_customer: "with_customer",
    received_from_customer: "in_store",
    scrapped: "scrapped",
  }
  const nextStatus = statusFor[parsed.data.event_type]
  if (nextStatus) {
    const patch: Record<string, unknown> = { status: nextStatus }
    // A restored surface is a new surface: condition goes back to new.
    if (["engraved", "re_engraved", "chrome_plated"].includes(parsed.data.event_type)) {
      patch.condition = "new"
    }
    await supabase.from("cylinders").update(patch).eq("id", parsed.data.cylinder_id)
  }

  revalidatePath(`/cylinders/${parsed.data.cylinder_id}`)
  revalidatePath("/cylinders")
  return { ok: true }
}

/** Update a cylinder's condition or status straight from the detail page. */
export async function updateCylinderState(formData: FormData) {
  const profile = await requireProfile()
  if (!can.editCylinders(profile.role)) {
    throw new Error("Your role cannot change cylinders.")
  }

  const id = String(formData.get("cylinderId") ?? "")
  const patch: Record<string, unknown> = {}
  const status = String(formData.get("status") ?? "")
  const condition = String(formData.get("condition") ?? "")
  if (status) patch.status = status
  if (condition) patch.condition = condition

  const supabase = await createClient()
  const { error } = await supabase.from("cylinders").update(patch).eq("id", id)
  if (error) dbThrow(error, "Saving the cylinder")

  revalidatePath(`/cylinders/${id}`)
  revalidatePath("/cylinders")
}
