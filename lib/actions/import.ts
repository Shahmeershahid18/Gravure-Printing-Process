"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireRole } from "@/lib/auth"

export type ImportTarget =
  | "customers" | "suppliers" | "machines" | "colour_names" | "issue_templates"
  | "cylinder_life_rules" | "ink_products" | "ink_batches" | "substrate_batches"
  | "cylinders" | "job_files"

export type ImportResult =
  | { ok: true; inserted: number; failed: { row: number; error: string }[] }
  | { ok: false; error: string }

type Row = Record<string, unknown>

/** Case-insensitive column read, because Excel headers are never consistent. */
function get(row: Row, ...names: string[]): unknown {
  const keys = Object.keys(row)
  for (const name of names) {
    const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
    if (key !== undefined) {
      const v = row[key]
      if (v === "" || v === null || v === undefined) return null
      return v
    }
  }
  return null
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(String(v).replace(/[, ]/g, ""))
  return Number.isFinite(n) ? n : null
}

function dateOrNull(v: unknown): string | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/**
 * Import one sheet.
 *
 * Rows are inserted one at a time rather than in a batch. It is slower, and it
 * is the right trade: a batch insert fails whole, and the point of this
 * screen is to tell the user exactly which Excel rows are wrong so they can
 * fix those rather than the whole file.
 */
export async function importRows(target: ImportTarget, rows: Row[]): Promise<ImportResult> {
  await requireRole("admin", "planner")

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "That sheet has no rows to import." }
  }
  if (rows.length > 5000) {
    return { ok: false, error: "That sheet has more than 5,000 rows. Split it and import in parts." }
  }

  const supabase = await createClient()

  // Resolve the business keys the workbook uses into the UUIDs the schema uses.
  const [customers, suppliers, machines, inks] = await Promise.all([
    supabase.from("customers").select("id, code, name"),
    supabase.from("suppliers").select("id, code, name"),
    supabase.from("machines").select("id, code"),
    supabase.from("ink_products").select("id, ink_code"),
  ])

  const customerByCode = new Map<string, string>()
  for (const c of customers.data ?? []) {
    customerByCode.set(c.code.toLowerCase(), c.id)
    customerByCode.set(c.name.toLowerCase(), c.id)
  }
  const supplierByCode = new Map<string, string>()
  for (const s of suppliers.data ?? []) {
    supplierByCode.set(s.code.toLowerCase(), s.id)
    supplierByCode.set(s.name.toLowerCase(), s.id)
  }
  const machineByCode = new Map((machines.data ?? []).map((m) => [m.code.toLowerCase(), m.id]))
  const inkByCode = new Map((inks.data ?? []).map((i) => [i.ink_code.toLowerCase(), i.id]))

  const failed: { row: number; error: string }[] = []
  let inserted = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // +2 so the number matches what the user sees in Excel: 1-based, with a
    // header row above.
    const excelRow = i + 2

    try {
      const payload = mapRow(target, row, {
        customerByCode,
        supplierByCode,
        machineByCode,
        inkByCode,
      })

      if ("error" in payload) {
        failed.push({ row: excelRow, error: payload.error })
        continue
      }

      // colour_names is keyed on its name, not on a uuid.
      const keyColumn = target === "colour_names" ? "name" : "id"
      const { data: created, error } = await supabase
        .from(target)
        .insert(payload.data)
        .select(keyColumn)
        .single<{ id?: string; name?: string }>()

      if (error) {
        failed.push({
          row: excelRow,
          error: error.message.includes("duplicate key")
            ? "Already exists, skipped."
            : error.message,
        })
        continue
      }

      // A job file with no revision can never be run, so an imported one gets
      // its Rev-00 the same way a hand-created one does.
      if (target === "job_files" && created?.id) {
        const { error: revError } = await supabase.from("artwork_revisions").insert({
          job_file_id: created.id,
          revision_no: 0,
          revision_date: new Date().toISOString().slice(0, 10),
          change_summary: "Imported from the legacy workbook",
          is_current: true,
        })
        if (revError) {
          await supabase.from("job_files").delete().eq("id", created.id)
          failed.push({ row: excelRow, error: `Rev-00 could not be created: ${revError.message}` })
          continue
        }
      }

      inserted++
    } catch (e) {
      failed.push({ row: excelRow, error: e instanceof Error ? e.message : "Unknown error" })
    }
  }

  revalidatePath("/settings")
  revalidatePath("/cylinders")
  revalidatePath("/jobs")
  revalidatePath("/inks")
  revalidatePath("/substrates")

  return { ok: true, inserted, failed }
}

type Lookups = {
  customerByCode: Map<string, string>
  supplierByCode: Map<string, string>
  machineByCode: Map<string, string>
  inkByCode: Map<string, string>
}

function mapRow(
  target: ImportTarget,
  row: Row,
  lk: Lookups
): { data: Record<string, unknown> } | { error: string } {
  switch (target) {
    case "customers": {
      const code = str(get(row, "code"))
      const name = str(get(row, "name", "customer", "customer_name"))
      if (!code || !name) return { error: "Needs both a code and a name." }
      return {
        data: {
          code,
          name,
          contact_name: str(get(row, "contact_name", "contact")),
          contact_email: str(get(row, "contact_email", "email")),
          notes: str(get(row, "notes", "remarks")),
        },
      }
    }

    case "suppliers": {
      const code = str(get(row, "code"))
      const name = str(get(row, "name", "supplier"))
      if (!code || !name) return { error: "Needs both a code and a name." }
      const type = str(get(row, "type", "supplies"))
      return {
        data: {
          code,
          name,
          type: type ? type.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : [],
          notes: str(get(row, "notes", "remarks")),
        },
      }
    }

    case "machines": {
      const code = str(get(row, "code", "machine", "machine_code"))
      if (!code) return { error: "Needs a machine code." }
      return {
        data: {
          code,
          name: str(get(row, "name")),
          max_web_width_mm: numOrNull(get(row, "max_web_width_mm", "web_width")),
          max_speed_mpm: numOrNull(get(row, "max_speed_mpm", "max_speed")),
          dryer_zones: numOrNull(get(row, "dryer_zones", "dryers")),
        },
      }
    }

    case "colour_names": {
      const name = str(get(row, "name", "colour", "colour_name"))
      if (!name) return { error: "Needs a colour name." }
      return { data: { name, sort_order: numOrNull(get(row, "sort_order", "order")) ?? 100 } }
    }

    case "issue_templates": {
      const area = str(get(row, "area"))?.toLowerCase().replace(/\s+/g, "_")
      const title = str(get(row, "title", "issue"))
      if (!area || !title) return { error: "Needs both an area and a title." }
      return { data: { area, title, hint: str(get(row, "hint", "notes")) } }
    }

    case "cylinder_life_rules": {
      const limit = numOrNull(get(row, "limit_meters", "limit", "life_limit"))
      if (!limit) return { error: "Needs a limit in meters." }
      return {
        data: {
          screen_lpi_min: numOrNull(get(row, "screen_lpi_min", "lpi_min", "from_lpi")),
          screen_lpi_max: numOrNull(get(row, "screen_lpi_max", "lpi_max", "to_lpi")),
          limit_meters: limit,
          priority: numOrNull(get(row, "priority")) ?? 100,
          notes: str(get(row, "notes", "remarks")),
        },
      }
    }

    case "ink_products": {
      const ink_code = str(get(row, "ink_code", "code"))
      const colour_name = str(get(row, "colour_name", "colour"))
      if (!ink_code || !colour_name) return { error: "Needs an ink code and a colour name." }
      const supplierCode = str(get(row, "supplier_code", "supplier"))
      const system = str(get(row, "ink_system", "system"))?.toLowerCase().replace(/[\s/]+/g, "_")
      return {
        data: {
          ink_code,
          colour_name,
          ink_system: system && ["nc", "pu", "nc_pu", "water_based", "solvent_other"].includes(system)
            ? system
            : "solvent_other",
          pantone_ref: str(get(row, "pantone_ref", "pantone")),
          technology: str(get(row, "technology")),
          supplier_id: supplierCode ? lk.supplierByCode.get(supplierCode.toLowerCase()) ?? null : null,
        },
      }
    }

    case "ink_batches": {
      const inkCode = str(get(row, "ink_code", "ink", "code"))
      const batch_no = str(get(row, "batch_no", "batch"))
      if (!inkCode || !batch_no) return { error: "Needs an ink code and a batch number." }
      const ink_product_id = lk.inkByCode.get(inkCode.toLowerCase())
      if (!ink_product_id) return { error: `No ink product with code "${inkCode}". Import ink products first.` }
      return {
        data: {
          ink_product_id,
          batch_no,
          mfg_date: dateOrNull(get(row, "mfg_date", "manufactured")),
          received_date: dateOrNull(get(row, "received_date", "received")),
          qty_kg: numOrNull(get(row, "qty_kg", "quantity")),
          supplier_lot: str(get(row, "supplier_lot", "lot")),
          remarks: str(get(row, "remarks", "notes")),
        },
      }
    }

    case "substrate_batches": {
      const supplierCode = str(get(row, "supplier_code", "supplier"))
      const batch_no = str(get(row, "batch_no", "batch"))
      const material_type = str(get(row, "material_type", "material"))
      const thickness = numOrNull(get(row, "thickness_micron", "thickness", "micron"))
      if (!supplierCode) return { error: "Needs a supplier code." }
      if (!batch_no || !material_type || !thickness) {
        return { error: "Needs a batch number, material type and thickness." }
      }
      const supplier_id = lk.supplierByCode.get(supplierCode.toLowerCase())
      if (!supplier_id) return { error: `No supplier "${supplierCode}". Import suppliers first.` }
      return {
        data: {
          supplier_id,
          batch_no,
          material_type,
          thickness_micron: thickness,
          grade: str(get(row, "grade")),
          width_mm: numOrNull(get(row, "width_mm", "width")),
          lot_no: str(get(row, "lot_no", "lot")),
          treatment_dyne_supplier: numOrNull(get(row, "treatment_dyne_supplier", "dyne")),
          gsm: numOrNull(get(row, "gsm")),
          received_date: dateOrNull(get(row, "received_date", "received")),
          qty_kg: numOrNull(get(row, "qty_kg", "quantity")),
          remarks: str(get(row, "remarks", "notes")),
        },
      }
    }

    case "cylinders": {
      const cylinder_no = str(get(row, "cylinder_no", "cylinder", "cyl_no"))
      if (!cylinder_no) return { error: "Needs a cylinder number." }
      const ownership = str(get(row, "ownership", "owner"))?.toLowerCase().includes("cust")
        ? "customer"
        : "company"
      const customerCode = str(get(row, "customer_code", "customer"))
      const owned_by_customer_id = customerCode
        ? lk.customerByCode.get(customerCode.toLowerCase()) ?? null
        : null
      if (ownership === "customer" && !owned_by_customer_id) {
        return { error: "Marked customer owned but the customer could not be matched." }
      }
      const supplierCode = str(get(row, "engraver", "engraver_supplier", "supplier"))
      return {
        data: {
          cylinder_no,
          colour_name: str(get(row, "colour_name", "colour")),
          ownership,
          owned_by_customer_id,
          engraver_supplier_id: supplierCode
            ? lk.supplierByCode.get(supplierCode.toLowerCase()) ?? null
            : null,
          base_no: str(get(row, "base_no", "base")),
          circumference_mm: numOrNull(get(row, "circumference_mm", "circumference")),
          face_width_mm: numOrNull(get(row, "face_width_mm", "face_width")),
          screen_lpi: numOrNull(get(row, "screen_lpi", "lpi", "screen")),
          stylus_angle: numOrNull(get(row, "stylus_angle", "stylus")),
          cell_depth_micron: numOrNull(get(row, "cell_depth_micron", "cell_depth")),
          engraving_date: dateOrNull(get(row, "engraving_date", "engraved")),
          // The Excel cumulative minus the runs being imported. See plan
          // Section 12: the ledger starts from a truthful baseline without
          // inventing fake run records.
          opening_meters: numOrNull(get(row, "opening_meters", "cumulative_meters", "cumulative")) ?? 0,
          status: str(get(row, "status"))?.toLowerCase().replace(/\s+/g, "_") ?? "in_store",
          condition: str(get(row, "condition"))?.toLowerCase() ?? "good",
          location: str(get(row, "location")),
          notes: str(get(row, "notes", "remarks")),
        },
      }
    }

    case "job_files": {
      const job_no = str(get(row, "job_no", "job", "job_number"))
      const customerCode = str(get(row, "customer_code", "customer"))
      const product_name = str(get(row, "product_name", "product"))
      const structure = str(get(row, "structure"))
      if (!job_no) return { error: "Needs a job number." }
      if (!product_name || !structure) return { error: "Needs a product name and a structure." }
      if (!customerCode) return { error: "Needs a customer." }
      const customer_id = lk.customerByCode.get(customerCode.toLowerCase())
      if (!customer_id) return { error: `No customer "${customerCode}". Import customers first.` }
      const machineCode = str(get(row, "machine_code", "machine"))
      const colours = numOrNull(get(row, "no_of_colours", "colours"))
      return {
        data: {
          job_no,
          customer_id,
          product_name,
          structure,
          no_of_colours: colours && colours >= 1 && colours <= 8 ? colours : 8,
          default_machine_id: machineCode ? lk.machineByCode.get(machineCode.toLowerCase()) ?? null : null,
          reel_width_mm: numOrNull(get(row, "reel_width_mm", "reel_width")),
          repeat_length_mm: numOrNull(get(row, "repeat_length_mm", "repeat")),
          ups: numOrNull(get(row, "ups")),
          notes: str(get(row, "notes", "remarks")),
        },
      }
    }

    default:
      return { error: "Unknown import target." }
  }
}
