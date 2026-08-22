"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, can } from "@/lib/auth"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { friendlyError, dbThrow } from "@/lib/errors"

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Acknowledge the briefing and start the run.
 *
 * The acknowledgement stamp is the point of the whole briefing: it is what
 * makes the system defensible when an old mistake repeats (plan Section 10.2).
 * Creating the run, seeding its 8 stations and stamping the acknowledgement
 * happen together, so a run can never exist in a state where somebody started
 * it without seeing what went wrong last time.
 */
export async function acknowledgeAndStartRun(formData: FormData) {
  const profile = await requireProfile()
  const supabase = await createClient()

  const jobFileId = String(formData.get("jobFileId") ?? "")
  const machineId = String(formData.get("machineId") ?? "")
  const existingRunId = String(formData.get("runId") ?? "")

  if (!jobFileId || !machineId) {
    throw new Error("Pick a job and a machine before starting the run.")
  }

  // On the kiosk the acting person is the PIN-identified operator, not the
  // machine account -- plan Section 8, point 3.
  const operator = await getActiveOperator()
  const actorId = operator?.id ?? profile.id

  let runId = existingRunId

  if (!runId) {
    const { data: rev } = await supabase
      .from("artwork_revisions")
      .select("id")
      .eq("job_file_id", jobFileId)
      .eq("is_current", true)
      .maybeSingle()

    if (!rev) {
      throw new Error(
        "This job has no current artwork revision. A planner must mark one current before it can run."
      )
    }

    const { data: lastRun } = await supabase
      .from("runs")
      .select("run_no")
      .eq("job_file_id", jobFileId)
      .order("run_no", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: run, error } = await supabase
      .from("runs")
      .insert({
        job_file_id: jobFileId,
        artwork_revision_id: rev.id,
        run_no: (lastRun?.run_no ?? 0) + 1,
        machine_id: machineId,
        run_date: new Date().toISOString().slice(0, 10),
        operator_id: actorId,
        status: "setup",
        start_time: new Date().toISOString(),
        briefing_ack_by: actorId,
        briefing_ack_at: new Date().toISOString(),
        created_by: profile.id,
      })
      .select("id")
      .single()

    if (error) dbThrow(error, "Saving the run")
    runId = run.id
  } else {
    const { error } = await supabase
      .from("runs")
      .update({
        status: "setup",
        start_time: new Date().toISOString(),
        operator_id: actorId,
        briefing_ack_by: actorId,
        briefing_ack_at: new Date().toISOString(),
      })
      .eq("id", runId)
    if (error) dbThrow(error, "Saving the run")
  }

  // Seeds the 8 station rows and carries forward the previous run's cylinders,
  // inks, blade settings and open notes.
  await supabase.rpc("fn_seed_run_stations", { p_run_id: runId })

  // run_process is one row per run; create it up front so the process screen
  // has something to update rather than having to guess insert-or-update.
  await supabase.from("run_process").upsert({ run_id: runId }, { onConflict: "run_id" })

  revalidatePath("/kiosk")
  revalidatePath("/runs")
  redirect(profile.role === "operator" ? `/kiosk/runs/${runId}` : `/runs/${runId}`)
}

/** Schedule a run from the desktop shell without starting it. */
export async function scheduleRun(formData: FormData): Promise<void> {
  const profile = await requireProfile()
  if (!can.enterRuns(profile.role)) throw new Error("Your role cannot schedule runs.")

  const supabase = await createClient()
  const jobFileId = String(formData.get("jobFileId") ?? "")
  const machineId = String(formData.get("machineId") ?? "")
  const runDate = String(formData.get("runDate") ?? "") || new Date().toISOString().slice(0, 10)
  const shift = String(formData.get("shift") ?? "") || null

  const { data: rev } = await supabase
    .from("artwork_revisions")
    .select("id")
    .eq("job_file_id", jobFileId)
    .eq("is_current", true)
    .maybeSingle()

  if (!rev) {
    throw new Error(
      "This job has no current artwork revision. Mark one current before scheduling a run."
    )
  }

  const { data: lastRun } = await supabase
    .from("runs")
    .select("run_no")
    .eq("job_file_id", jobFileId)
    .order("run_no", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: run, error } = await supabase
    .from("runs")
    .insert({
      job_file_id: jobFileId,
      artwork_revision_id: rev.id,
      run_no: (lastRun?.run_no ?? 0) + 1,
      machine_id: machineId,
      run_date: runDate,
      shift,
      status: "planned",
      created_by: profile.id,
    })
    .select("id")
    .single()

  if (error) dbThrow(error, "Saving the run")

  await supabase.rpc("fn_seed_run_stations", { p_run_id: run.id })
  await supabase.from("run_process").upsert({ run_id: run.id }, { onConflict: "run_id" })

  revalidatePath(`/jobs/${jobFileId}`)
  revalidatePath("/runs")
  redirect(`/runs/${run.id}`)
}

/** Update one station cell. Used by the grid's autosave and by the sync queue. */
export async function saveStationField(
  stationId: string,
  patch: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("run_stations").update(patch).eq("id", stationId)
  if (error) return { ok: false, error: friendlyError(error, "Could not save the run.") }
  return { ok: true }
}

export async function saveRunProcess(
  runId: string,
  patch: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("run_process")
    .upsert({ run_id: runId, ...patch }, { onConflict: "run_id" })
  if (error) return { ok: false, error: friendlyError(error, "Could not save the run.") }
  revalidatePath(`/kiosk/runs/${runId}`)
  return { ok: true }
}

/**
 * Apply the run total to every non-idle station.
 *
 * The operator presses one button instead of typing the same number 8 times,
 * which is also what stops the eight figures drifting apart (Section 7.6).
 */
export async function applyRunMeters(runId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_apply_run_meters", { p_run_id: runId })
  if (error) return { ok: false, error: friendlyError(error, "Could not save the run.") }
  revalidatePath(`/kiosk/runs/${runId}`)
  revalidatePath(`/runs/${runId}`)
  return { ok: true }
}

/**
 * Close the run.
 *
 * Waste percentages are generated columns, so neither can be entered wrong.
 * Meters are required: a run closed without them silently breaks every
 * cylinder ledger downstream.
 */
export async function closeRun(formData: FormData) {
  const profile = await requireProfile()
  const supabase = await createClient()

  const runId = String(formData.get("runId") ?? "")
  const producedM = numberOrNull(formData.get("produced_qty_m"))
  const producedKg = numberOrNull(formData.get("produced_qty_kg"))
  const wasteM = numberOrNull(formData.get("waste_m"))
  const wasteKg = numberOrNull(formData.get("waste_kg"))
  const result = String(formData.get("result") ?? "")
  const avgSpeed = numberOrNull(formData.get("avg_speed_mpm"))
  const maxSpeed = numberOrNull(formData.get("max_speed_mpm"))
  const remarks = String(formData.get("remarks") ?? "") || null
  const applyMeters = formData.get("apply_meters") === "on"

  if (producedM === null) {
    throw new Error("Meters produced must be entered before closing the run.")
  }
  if (!result) {
    throw new Error("Pick a result before closing the run.")
  }

  const { error } = await supabase
    .from("runs")
    .update({
      produced_qty_m: producedM,
      produced_qty_kg: producedKg,
      waste_m: wasteM ?? 0,
      waste_kg: wasteKg,
      avg_speed_mpm: avgSpeed,
      max_speed_mpm: maxSpeed,
      remarks,
      result,
      status: "completed",
      end_time: new Date().toISOString(),
      supervisor_id: profile.role === "supervisor" ? profile.id : undefined,
    })
    .eq("id", runId)

  if (error) dbThrow(error, "Saving the run")

  // Meters have to be on the stations before the ledger means anything.
  if (applyMeters) {
    await supabase.rpc("fn_apply_run_meters", { p_run_id: runId })
  }

  revalidatePath("/kiosk")
  revalidatePath("/runs")
  revalidatePath(`/runs/${runId}`)
  redirect(profile.role === "operator" ? "/kiosk" : `/runs/${runId}`)
}

/** Reopen a locked or completed run. Supervisor and admin only. */
export async function reopenRun(formData: FormData) {
  const profile = await requireProfile()
  if (!can.editLockedRuns(profile.role)) {
    throw new Error("Only a supervisor or admin can reopen a run.")
  }
  const runId = String(formData.get("runId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase
    .from("runs")
    .update({ locked_at: null, status: "running" })
    .eq("id", runId)
  if (error) dbThrow(error, "Saving the run")
  revalidatePath(`/runs/${runId}`)
}

/** Soft delete. Admin only, and the ledger recomputes because views filter it. */
export async function deleteRun(formData: FormData) {
  const profile = await requireProfile()
  if (!can.deleteRuns(profile.role)) {
    throw new Error("Only an admin can delete a run.")
  }
  const runId = String(formData.get("runId") ?? "")
  const supabase = await createClient()
  const { error } = await supabase
    .from("runs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", runId)
  if (error) dbThrow(error, "Saving the run")
  revalidatePath("/runs")
  redirect("/runs")
}

function numberOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
