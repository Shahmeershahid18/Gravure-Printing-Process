import { cache } from "react"
import { createClient } from "@/utils/supabase/server"
import { one } from "@/lib/rel"

export type RunHeader = {
  id: string
  run_no: number
  run_date: string
  shift: string | null
  status: string
  result: string | null
  machine_id: string
  job_file_id: string
  locked_at: string | null
  briefing_ack_at: string | null
  produced_qty_m: number | null
  produced_qty_kg: number | null
  waste_m: number | null
  waste_kg: number | null
  waste_pct_m: number | null
  waste_pct_kg: number | null
  avg_speed_mpm: number | null
  max_speed_mpm: number | null
  remarks: string | null
  machine: { code: string } | null
  job: {
    id: string
    job_file_no: string
    job_no: string
    product_name: string
    structure: string
    no_of_colours: number
    customer: string | null
  } | null
  revision_label: string | null
}

/** One loader for the run header, shared by the layout and all four passes. */
export const getRun = cache(async (runId: string): Promise<RunHeader | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("runs")
    .select(
      `id, run_no, run_date, shift, status, result, machine_id, job_file_id, locked_at,
       briefing_ack_at, produced_qty_m, produced_qty_kg, waste_m, waste_kg,
       waste_pct_m, waste_pct_kg, avg_speed_mpm, max_speed_mpm, remarks,
       machines(code),
       artwork_revisions(revision_label),
       job_files(id, job_file_no, job_no, product_name, structure, no_of_colours, customers(name))`
    )
    .eq("id", runId)
    .is("deleted_at", null)
    .maybeSingle()

  if (!data) return null

  const job = one<{
    id: string
    job_file_no: string
    job_no: string
    product_name: string
    structure: string
    no_of_colours: number
    customers: { name: string } | null
  }>(data.job_files)

  const rev = one<{ revision_label: string }>(data.artwork_revisions)

  return {
    ...data,
    machine: one<{ code: string }>(data.machines),
    revision_label: rev?.revision_label ?? null,
    job: job
      ? {
          id: job.id,
          job_file_no: job.job_file_no,
          job_no: job.job_no,
          product_name: job.product_name,
          structure: job.structure,
          no_of_colours: job.no_of_colours,
          customer: job.customers?.name ?? null,
        }
      : null,
  } as RunHeader
})

export const getRunStations = cache(async (runId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("run_stations")
    .select("*")
    .eq("run_id", runId)
    .order("station_no")
  return data ?? []
})

/** The master lists the grid types against. Nothing here is free text. */
export const getGridMasters = cache(async () => {
  const supabase = await createClient()
  const [cyl, ink, batch, colours, templates] = await Promise.all([
    supabase
      .from("v_cylinder_summary")
      .select("id, cylinder_no, colour_name, surface_meters, life_limit_meters, condition, status")
      .order("cylinder_no"),
    supabase.from("ink_products").select("id, ink_code, colour_name").order("ink_code"),
    supabase.from("ink_batches").select("id, batch_no, ink_product_id").order("batch_no"),
    supabase.from("colour_names").select("name").eq("is_active", true).order("sort_order"),
    supabase.from("issue_templates").select("id, area, title, hint").eq("is_active", true).order("title"),
  ])

  return {
    cylinders: (cyl.data ?? [])
      // A cylinder at the engraver or with the customer is not on this press.
      .filter((c) => !["at_engraver", "with_customer", "scrapped"].includes(String(c.status)))
      .map((c) => ({
        id: c.id as string,
        cylinder_no: c.cylinder_no as string,
        colour_name: (c.colour_name as string) ?? null,
        surface_meters: Number(c.surface_meters ?? 0),
        life_limit: Number(c.life_limit_meters ?? 0),
        condition: (c.condition as string) ?? null,
      })),
    inkProducts: ink.data ?? [],
    inkBatches: batch.data ?? [],
    colourNames: colours.data ?? [],
    issueTemplates: templates.data ?? [],
  }
})
