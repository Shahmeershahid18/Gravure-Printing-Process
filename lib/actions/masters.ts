"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { requireProfile, can } from "@/lib/auth"
import { friendlyError } from "@/lib/errors"

export type SaveResult = { ok: boolean; error?: string }

/**
 * Coercion helpers.
 *
 * Every value arrives from an HTML control as a string, so "" has to become
 * NULL rather than 0 or "". Getting this wrong is how a blank max speed ends
 * up as a machine that cannot run.
 */
const text = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().nullable().optional()
)
const int = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().nullable().optional()
)
const dec = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().nullable().optional()
)
const bool = z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean())
const uuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().uuid().nullable().optional()
)
const required = z.string().trim().min(1)

// -- table definitions -------------------------------------------------------

const TABLES = {
  customers: {
    path: "/settings/customers",
    label: "customer",
    schema: z.object({
      code: required,
      name: required,
      contact_name: text,
      contact_email: z.preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? null : v),
        z.string().email("Enter a valid email address, or leave it blank.").nullable().optional()
      ),
      notes: text,
    }),
  },
  machines: {
    path: "/settings/machines",
    label: "machine",
    schema: z.object({
      code: required,
      name: text,
      max_web_width_mm: int,
      max_speed_mpm: int,
      dryer_zones: int,
      is_active: bool,
    }),
  },
  suppliers: {
    path: "/settings/suppliers",
    label: "supplier",
    schema: z.object({
      code: required,
      name: required,
      // What this supplier supplies, entered as a comma separated list and
      // stored as the text[] the schema expects.
      type: z.preprocess((v) => {
        if (Array.isArray(v)) return v
        if (typeof v !== "string" || v.trim() === "") return []
        return v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      }, z.array(z.string())),
      notes: text,
    }),
  },
  colour_names: {
    path: "/settings/colours",
    label: "colour",
    key: "name" as const,
    schema: z.object({
      name: required,
      sort_order: int,
      is_active: bool,
    }),
  },
  issue_templates: {
    path: "/settings/issue-templates",
    label: "issue template",
    schema: z.object({
      area: required,
      title: required,
      hint: text,
      is_active: bool,
    }),
  },
  cylinder_life_rules: {
    path: "/settings/life-rules",
    label: "life rule",
    schema: z.object({
      customer_id: uuid,
      screen_lpi_min: int,
      screen_lpi_max: int,
      limit_meters: z.preprocess((v) => Number(v), z.number().int().positive("Enter the limit in meters.")),
      priority: int,
      notes: text,
    }),
  },
  ink_products: {
    path: "/inks",
    label: "ink",
    schema: z.object({
      ink_code: required,
      colour_name: required,
      ink_system: required,
      pantone_ref: text,
      technology: text,
      supplier_id: uuid,
      is_self_colour: bool,
      notes: text,
    }),
  },
  ink_batches: {
    path: "/inks",
    label: "ink batch",
    schema: z.object({
      ink_product_id: z.string().uuid("Pick the ink this batch belongs to."),
      batch_no: required,
      mfg_date: text,
      received_date: text,
      qty_kg: dec,
      supplier_lot: text,
      remarks: text,
    }),
  },
  substrate_batches: {
    path: "/substrates",
    label: "substrate batch",
    schema: z.object({
      supplier_id: z.string().uuid("Pick the supplier."),
      material_type: required,
      grade: text,
      thickness_micron: z.preprocess((v) => Number(v), z.number().positive("Enter the thickness in microns.")),
      width_mm: dec,
      batch_no: required,
      lot_no: text,
      treatment_dyne_supplier: dec,
      gsm: dec,
      received_date: text,
      qty_kg: dec,
      remarks: text,
    }),
  },
  cylinders: {
    path: "/cylinders",
    label: "cylinder",
    schema: z.object({
      cylinder_no: required,
      colour_name: text,
      ownership: required,
      owned_by_customer_id: uuid,
      engraver_supplier_id: uuid,
      base_no: text,
      circumference_mm: dec,
      face_width_mm: dec,
      screen_lpi: int,
      stylus_angle: dec,
      cell_depth_micron: dec,
      engraving_date: text,
      status: text,
      condition: text,
      opening_meters: int,
      life_limit_override: int,
      location: text,
      notes: text,
    }),
  },
} as const

export type MasterTableName = keyof typeof TABLES

function permitted(table: MasterTableName, role: Parameters<typeof can.editMasters>[0]): boolean {
  switch (table) {
    case "ink_products":
    case "ink_batches":
    case "substrate_batches":
      return can.editBatches(role)
    case "cylinders":
      return can.editCylinders(role)
    case "cylinder_life_rules":
      return can.editLifeRules(role)
    default:
      return can.editMasters(role)
  }
}

/**
 * Save one master row, create or update.
 *
 * Returns a result rather than throwing, because the caller is a dialog that
 * has to show the operator what to fix without losing what they typed.
 */
export async function saveMaster(
  table: MasterTableName,
  values: Record<string, unknown>,
  /**
   * The key of the row being edited, or undefined when creating.
   *
   * Most of these tables have a surrogate `id`, so "is this an update?" could
   * be read off the values. `colour_names` cannot: its key is the name itself.
   * Inferring the answer from `values.name` meant a brand new colour looked
   * exactly like an edit of a colour with that name, so the insert became an
   * UPDATE matching nothing -- PostgREST answers 204 to that, so it reported
   * success and created no row. It also made renaming impossible, because the
   * new name was used to find the old row.
   *
   * The caller knows which it is. It says so.
   */
  originalKey?: string
): Promise<SaveResult> {
  const profile = await requireProfile()
  const def = TABLES[table]
  if (!def) return { ok: false, error: "Unknown record type." }

  if (!permitted(table, profile.role)) {
    return { ok: false, error: `Your role cannot change ${def.label}s.` }
  }

  const parsed = def.schema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue.path.join(".") || "A field"
    return { ok: false, error: issue.message.startsWith("Enter") || issue.message.startsWith("Pick")
      ? issue.message
      : `${field}: ${issue.message}` }
  }

  const supabase = await createClient()
  const keyColumn = "key" in def ? (def.key as string) : "id"

  // An edit targets the row it started from. On a natural-key table that is
  // the only way a rename can work: the WHERE has to name the old value while
  // the SET carries the new one.
  const target = originalKey ?? (values.id as string | undefined)

  // The table name is a union here, so the generated per-table insert types
  // collapse to their intersection. Zod has already validated the shape
  // against the right schema, so the row goes through untyped.
  const row = parsed.data as Record<string, unknown>
  const q = supabase.from(table)

  // On insert, a field the user left blank must be omitted rather than sent as
  // NULL. colour_names.sort_order is `not null default 100`: sending NULL
  // fails the not-null constraint, so "Add colour" refused every colour whose
  // sort order was left blank -- which the form does not mark as required.
  // Omitting the key lets the column default apply, and for a genuinely
  // nullable column the result is NULL either way.
  //
  // On update the opposite holds: an explicit null is how a field gets cleared.
  const insertRow = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== null && v !== undefined)
  )

  const { error } = target
    ? await q.update(row).eq(keyColumn, target)
    : await q.insert(insertRow)

  if (error) return { ok: false, error: friendly(error.message, def.label) }

  revalidatePath(def.path)
  return { ok: true }
}

/**
 * Postgres speaks in constraint names. The floor does not, so the two most
 * common failures get translated and everything else passes through.
 */
function friendly(message: string, label: string): string {
  if (message.includes("duplicate key") || message.includes("already exists")) {
    return `That ${label} code is already in use. Pick another.`
  }
  if (message.includes("violates row-level security")) {
    return `Your role cannot change ${label}s.`
  }
  if (message.includes("violates foreign key")) {
    return "Something this record points at no longer exists. Refresh and try again."
  }
  // Never the raw text: it names tables, columns and policies.
  return friendlyError({ message }, `Could not save that ${label}.`)
}
