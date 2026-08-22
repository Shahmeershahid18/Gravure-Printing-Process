"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireProfile } from "@/lib/auth"
import { dbThrow } from "@/lib/errors"

/**
 * The printed web on this run -- print only, one web (locked decision 6).
 * Reels are recorded per roll so a bond complaint traces to a batch and a
 * supplier rather than to "the PET we were running that week".
 */
export async function addRunSubstrate(formData: FormData) {
  await requireProfile()
  const supabase = await createClient()

  const runId = String(formData.get("runId") ?? "")
  const batchId = String(formData.get("substrate_batch_id") ?? "")

  if (!batchId) throw new Error("Pick the substrate batch that is on the machine.")

  const { error } = await supabase.from("run_substrates").insert({
    run_id: runId,
    substrate_batch_id: batchId,
    roll_no: String(formData.get("roll_no") ?? "") || null,
    meters_used: numberOrNull(formData.get("meters_used")),
    kg_used: numberOrNull(formData.get("kg_used")),
    dyne_at_machine: numberOrNull(formData.get("dyne_at_machine")),
    treatment_side: String(formData.get("treatment_side") ?? "") || null,
    observation: String(formData.get("observation") ?? "") || null,
    result: String(formData.get("result") ?? "") || null,
  })

  if (error) dbThrow(error, "Saving the reel")

  revalidatePath(`/kiosk/runs/${runId}/substrate`)
  revalidatePath(`/runs/${runId}`)
}

export async function removeRunSubstrate(formData: FormData) {
  await requireProfile()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const runId = String(formData.get("runId") ?? "")

  const { error } = await supabase.from("run_substrates").delete().eq("id", id)
  if (error) dbThrow(error, "Saving the reel")

  revalidatePath(`/kiosk/runs/${runId}/substrate`)
  revalidatePath(`/runs/${runId}`)
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
