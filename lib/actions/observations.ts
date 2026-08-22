"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, can } from "@/lib/auth"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { friendlyError, dbThrow } from "@/lib/errors"

export type ObservationInput = {
  job_file_id: string
  run_id?: string | null
  run_station_id?: string | null
  cylinder_id?: string | null
  ink_batch_id?: string | null
  substrate_batch_id?: string | null
  machine_id?: string | null
  area: string
  severity?: string
  title: string
  description: string
  action_taken?: string | null
  next_run_note?: string | null
  photo_urls?: string[]
}

/**
 * Log an observation.
 *
 * Everything the operator does not have to say -- severity default, timestamps,
 * and the links to run, station, cylinder, ink batch and machine -- is inferred
 * from context and filled here, because the target is fifteen seconds and a
 * form is what makes an operator log nothing at all (plan Section 10.4).
 */
export async function createObservation(
  input: ObservationInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const profile = await requireProfile()
  if (!can.logObservation(profile.role)) {
    return { ok: false, error: "Your role cannot log observations." }
  }

  if (!input.title?.trim()) {
    return { ok: false, error: "Pick a title so this issue can be grouped with others like it." }
  }

  const supabase = await createClient()

  // Attribution on the kiosk is the PIN-identified operator, not the machine
  // account the tablet is signed in as.
  const operator = await getActiveOperator()
  const reportedBy = operator?.id ?? profile.id

  // Infer the machine and the job from the run rather than trusting the client.
  let machineId = input.machine_id ?? null
  let jobFileId = input.job_file_id
  if (input.run_id) {
    const { data: run } = await supabase
      .from("runs")
      .select("machine_id, job_file_id")
      .eq("id", input.run_id)
      .maybeSingle()
    if (run) {
      machineId = run.machine_id
      jobFileId = run.job_file_id
    }
  }

  const { data, error } = await supabase
    .from("observations")
    .insert({
      job_file_id: jobFileId,
      run_id: input.run_id ?? null,
      run_station_id: input.run_station_id ?? null,
      cylinder_id: input.cylinder_id ?? null,
      ink_batch_id: input.ink_batch_id ?? null,
      substrate_batch_id: input.substrate_batch_id ?? null,
      machine_id: machineId,
      area: input.area,
      severity: input.severity || "minor",
      title: input.title.trim(),
      description: input.description?.trim() || input.title.trim(),
      action_taken: input.action_taken?.trim() || null,
      next_run_note: input.next_run_note?.trim() || null,
      photo_urls: input.photo_urls ?? [],
      reported_by: reportedBy,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: friendlyError(error, "Could not save the issue.") }

  revalidatePath("/issues")
  revalidatePath(`/jobs/${jobFileId}`)
  revalidatePath("/dashboard")
  if (input.run_id) revalidatePath(`/kiosk/runs/${input.run_id}`)

  return { ok: true, id: data.id }
}

/**
 * Clear a next-run note.
 *
 * Only from the briefing or the issue list, never from the station grid, so
 * the operator running the press cannot make a warning disappear mid-shift
 * (plan Section 10.3).
 */
export async function clearNextRunNote(formData: FormData) {
  const profile = await requireProfile()
  if (!can.clearNextRunNote(profile.role)) {
    throw new Error("Only a supervisor, QC or admin can clear a next run note.")
  }

  const id = String(formData.get("observationId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase
    .from("observations")
    .update({
      next_run_note_cleared_at: new Date().toISOString(),
      next_run_note_cleared_by: profile.id,
    })
    .eq("id", id)

  if (error) dbThrow(error, "Saving the issue")

  revalidatePath("/issues")
  revalidatePath("/dashboard")
  revalidatePath("/shift")
}

export async function resolveObservation(formData: FormData) {
  const profile = await requireProfile()
  if (!can.logObservation(profile.role)) {
    throw new Error("Your role cannot close observations.")
  }
  const id = String(formData.get("observationId") ?? "")
  const result = String(formData.get("result") ?? "") || null

  const supabase = await createClient()
  const { error } = await supabase
    .from("observations")
    .update({ is_resolved: true, result })
    .eq("id", id)

  if (error) dbThrow(error, "Saving the issue")
  revalidatePath("/issues")
}
