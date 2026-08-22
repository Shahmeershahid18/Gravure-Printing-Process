"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, can } from "@/lib/auth"

export type JobResult = { ok: true; id: string } | { ok: false; error: string }

const JobSchema = z.object({
  customer_id: z.string().uuid("Pick the customer."),
  job_no: z.string().trim().min(1, "Enter the job number, e.g. GR-2548."),
  product_name: z.string().trim().min(1, "Enter the product name."),
  structure: z.string().trim().min(1, "Enter the structure, e.g. PET 12 / MBOPP 20."),
  no_of_colours: z.coerce.number().int().min(1).max(8),
  default_machine_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
  reel_width_mm: nullNum(),
  repeat_length_mm: nullNum(),
  ups: nullNum(),
  notes: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  shade_card_no: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  artwork_no: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
})

function nullNum() {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nullable().optional()
  )
}

/**
 * Create a job file and its Rev-00 together.
 *
 * Nothing can run until a revision exists (plan Section 2.1, step 2), so
 * creating a job without one only produces a record that will block the first
 * operator who tries to use it.
 */
export async function createJobFile(values: Record<string, unknown>): Promise<JobResult> {
  const profile = await requireProfile()
  if (!can.editJobs(profile.role)) {
    return { ok: false, error: "Only a planner or admin can create job files." }
  }

  const parsed = JobSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { shade_card_no, artwork_no, ...job } = parsed.data
  const supabase = await createClient()

  const { data: created, error } = await supabase
    .from("job_files")
    // job_file_no is generated server side from a sequence, so users never
    // type it and it cannot collide.
    .insert({ ...job, created_by: profile.id })
    .select("id, job_file_no")
    .single()

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { ok: false, error: `Job number ${job.job_no} already exists. Check the job list.` }
    }
    return { ok: false, error: error.message }
  }

  const { error: revError } = await supabase.from("artwork_revisions").insert({
    job_file_id: created.id,
    revision_no: 0,
    revision_date: new Date().toISOString().slice(0, 10),
    change_summary: "Initial artwork",
    shade_card_no: shade_card_no ?? null,
    artwork_no: artwork_no ?? null,
    is_current: true,
    created_by: profile.id,
  })

  if (revError) {
    // Leave no half-built job behind: without Rev-00 nothing can run against it.
    await supabase.from("job_files").delete().eq("id", created.id)
    return { ok: false, error: `The job file could not be created: ${revError.message}` }
  }

  revalidatePath("/jobs")
  return { ok: true, id: created.id }
}

const RevisionSchema = z.object({
  job_file_id: z.string().uuid(),
  change_summary: z.string().trim().min(1, "Say what changed. Six months from now this is the only record."),
  artwork_no: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  shade_card_no: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  effective_from_run: nullNum(),
  customer_approval: z.string().optional(),
})

/**
 * Create the next artwork revision.
 *
 * The previous revision is never deleted: every future run binds to the new
 * one and every past run still points at the old one, which is how a shade
 * complaint six months later can be answered exactly (plan Section 2.2).
 */
export async function createArtworkRevision(values: Record<string, unknown>): Promise<JobResult> {
  const profile = await requireProfile()
  if (!can.editJobs(profile.role)) {
    return { ok: false, error: "Only a planner or admin can create artwork revisions." }
  }

  const parsed = RevisionSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const jobId = parsed.data.job_file_id

  const { data: latest } = await supabase
    .from("artwork_revisions")
    .select("id, revision_no")
    .eq("job_file_id", jobId)
    .order("revision_no", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNo = (latest?.revision_no ?? -1) + 1

  // Only one revision per job may be current, enforced by a partial unique
  // index, so the old one has to be stood down before the new one goes in.
  await supabase
    .from("artwork_revisions")
    .update({ is_current: false })
    .eq("job_file_id", jobId)
    .eq("is_current", true)

  const { data: created, error } = await supabase
    .from("artwork_revisions")
    .insert({
      job_file_id: jobId,
      revision_no: nextNo,
      revision_date: new Date().toISOString().slice(0, 10),
      change_summary: parsed.data.change_summary,
      artwork_no: parsed.data.artwork_no ?? null,
      shade_card_no: parsed.data.shade_card_no ?? null,
      effective_from_run: parsed.data.effective_from_run ?? null,
      customer_approval: parsed.data.customer_approval || "pending",
      is_current: true,
      created_by: profile.id,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }

  // Copy the previous cylinder set so the planner marks what changed rather
  // than re-entering eight stations.
  if (latest?.id) {
    const { data: prev } = await supabase
      .from("artwork_revision_cylinders")
      .select("station_no, cylinder_id")
      .eq("revision_id", latest.id)

    if (prev && prev.length > 0) {
      await supabase.from("artwork_revision_cylinders").insert(
        prev.map((c) => ({
          revision_id: created.id,
          station_no: c.station_no,
          cylinder_id: c.cylinder_id,
          action: "unchanged",
          remarks: "Carried over from the previous revision",
        }))
      )
    }
  }

  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/artwork`)
  return { ok: true, id: created.id }
}

/** Map a cylinder to a station on a revision, and say what changed about it. */
export async function setRevisionCylinder(values: {
  revision_id: string
  station_no: number
  cylinder_id: string | null
  action: string
  remarks?: string | null
  job_file_id: string
}): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile()
  if (!can.editJobs(profile.role)) {
    return { ok: false, error: "Only a planner or admin can map cylinders to stations." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("artwork_revision_cylinders").upsert(
    {
      revision_id: values.revision_id,
      station_no: values.station_no,
      cylinder_id: values.cylinder_id,
      action: values.action,
      remarks: values.remarks ?? null,
    },
    { onConflict: "revision_id,station_no" }
  )

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/jobs/${values.job_file_id}/artwork`)
  return { ok: true }
}

export async function updateJobStatus(formData: FormData) {
  const profile = await requireProfile()
  if (!can.editJobs(profile.role)) throw new Error("Only a planner or admin can change job status.")

  const id = String(formData.get("jobFileId") ?? "")
  const status = String(formData.get("status") ?? "")

  const supabase = await createClient()
  const { error } = await supabase
    .from("job_files")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath(`/jobs/${id}`)
  revalidatePath("/jobs")
}
