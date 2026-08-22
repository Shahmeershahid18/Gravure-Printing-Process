"use client"

import * as React from "react"
import { MasterTable, type FieldSpec, type MasterRow } from "./MasterTable"
import type { Column } from "@/components/ui/data-table"
import { saveMaster, type MasterTableName } from "@/lib/actions/masters"
import { Badge } from "@/components/ui/badge"
import { meters, shortDate, decimal } from "@/lib/format"

export type Lookup = { value: string; label: string }

/**
 * Every master screen, in one place.
 *
 * Column and field definitions live here rather than in seven page files, so a
 * change to how a batch code is displayed happens once and shows up everywhere
 * that batch code appears.
 */
export function MasterSection({
  table,
  rows,
  lookups = {},
  canEdit,
}: {
  table: MasterTableName
  rows: MasterRow[]
  lookups?: Record<string, Lookup[]>
  canEdit: boolean
}) {
  const label = (list: Lookup[] | undefined, id: unknown) =>
    list?.find((l) => l.value === id)?.label ?? "—"

  const config = React.useMemo<{
    entityName: string
    empty: string
    columns: Column<MasterRow>[]
    fields: FieldSpec[]
  }>(() => {
    switch (table) {
      case "customers":
        return {
          entityName: "customer",
          empty: "No customers yet. Add the first one, then job files can point at it.",
          columns: [
            { header: "Code", accessorKey: "code", cell: (r) => <span data-numeric="">{String(r.code)}</span> },
            { header: "Name", accessorKey: "name" },
            { header: "Contact", accessorKey: "contact_name" },
            { header: "Email", accessorKey: "contact_email" },
          ],
          fields: [
            { name: "code", label: "Code", required: true, half: true, hint: "Short code used on reports." },
            { name: "name", label: "Name", required: true, half: true },
            { name: "contact_name", label: "Contact name", half: true },
            { name: "contact_email", label: "Contact email", type: "email", half: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ],
        }

      case "machines":
        return {
          entityName: "machine",
          empty: "No machines yet. Add each press before scheduling a run on it.",
          columns: [
            { header: "Code", accessorKey: "code", cell: (r) => <span data-numeric="">{String(r.code)}</span> },
            { header: "Name", accessorKey: "name" },
            { header: "Stations", accessorKey: "stations", numeric: true },
            { header: "Max width", accessorKey: "max_web_width_mm", numeric: true, cell: (r) => `${decimal(r.max_web_width_mm as number, 0)} mm` },
            { header: "Max speed", accessorKey: "max_speed_mpm", numeric: true, cell: (r) => `${decimal(r.max_speed_mpm as number, 0)} m/min` },
            { header: "Status", accessorKey: "is_active", cell: (r) => <Badge tone={r.is_active ? "ok" : "neutral"}>{r.is_active ? "Active" : "Retired"}</Badge> },
          ],
          fields: [
            { name: "code", label: "Code", required: true, half: true, hint: "As the floor says it, e.g. G-02." },
            { name: "name", label: "Name", half: true },
            { name: "max_web_width_mm", label: "Max web width (mm)", type: "number", half: true },
            { name: "max_speed_mpm", label: "Max speed (m/min)", type: "number", half: true },
            { name: "dryer_zones", label: "Dryer zones", type: "number", half: true },
            { name: "is_active", label: "In service", type: "switch", half: true },
          ],
        }

      case "suppliers":
        return {
          entityName: "supplier",
          empty: "No suppliers yet. Add them before recording an ink or substrate batch.",
          columns: [
            { header: "Code", accessorKey: "code", cell: (r) => <span data-numeric="">{String(r.code)}</span> },
            { header: "Name", accessorKey: "name" },
            {
              header: "Supplies",
              cell: (r) => {
                const t = r.type as string[] | null
                return t?.length ? t.join(", ") : "—"
              },
            },
          ],
          fields: [
            { name: "code", label: "Code", required: true, half: true },
            { name: "name", label: "Name", required: true, half: true },
            {
              name: "type",
              label: "Supplies",
              hint: "Comma separated: substrate, ink, cylinder, solvent.",
            },
            { name: "notes", label: "Notes", type: "textarea" },
          ],
        }

      case "colour_names":
        return {
          entityName: "colour",
          empty: "No colour names yet. Seed the standard eight so nobody types “cyan” six ways.",
          columns: [
            { header: "Name", accessorKey: "name" },
            { header: "Order", accessorKey: "sort_order", numeric: true },
            { header: "Status", accessorKey: "is_active", cell: (r) => <Badge tone={r.is_active ? "ok" : "neutral"}>{r.is_active ? "In use" : "Retired"}</Badge> },
          ],
          fields: [
            { name: "name", label: "Name", required: true, half: true, lockOnEdit: true },
            { name: "sort_order", label: "Sort order", type: "number", half: true, hint: "Lower shows first in the grid." },
            { name: "is_active", label: "In use", type: "switch", half: true },
          ],
        }

      case "issue_templates":
        return {
          entityName: "issue template",
          empty:
            "No issue templates yet. Add the ones your floor hits most: an operator picking from a list produces groupable data, typing produces six spellings.",
          columns: [
            { header: "Area", accessorKey: "area", cell: (r) => String(r.area).replace(/_/g, " ") },
            { header: "Title", accessorKey: "title" },
            { header: "Hint", accessorKey: "hint" },
            { header: "Status", accessorKey: "is_active", cell: (r) => <Badge tone={r.is_active ? "ok" : "neutral"}>{r.is_active ? "In use" : "Retired"}</Badge> },
          ],
          fields: [
            {
              name: "area", label: "Area", required: true, type: "select", half: true,
              options: [
                "cylinder","ink","substrate","machine","registration","drying",
                "tension","static","adhesion","doctor_blade","other",
              ].map((a) => ({ value: a, label: a.replace(/_/g, " ") })),
            },
            { name: "title", label: "Title", required: true, half: true, hint: "How the operator will see it." },
            { name: "hint", label: "Hint", hint: "One line of guidance shown on hover." },
            { name: "is_active", label: "In use", type: "switch", half: true },
          ],
        }

      case "cylinder_life_rules":
        return {
          entityName: "life rule",
          empty:
            "No life rules yet. Add one per screen ruling band so wear alerts have a limit to measure against.",
          columns: [
            { header: "Priority", accessorKey: "priority", numeric: true, cell: (r) => <span data-numeric="">{String(r.priority ?? 100)}</span> },
            { header: "Customer", cell: (r) => (r.customer_id ? label(lookups.customers, r.customer_id) : "All customers") },
            { header: "Screen from", accessorKey: "screen_lpi_min", numeric: true, cell: (r) => (r.screen_lpi_min ? `${r.screen_lpi_min} LPI` : "Any") },
            { header: "Screen to", accessorKey: "screen_lpi_max", numeric: true, cell: (r) => (r.screen_lpi_max ? `${r.screen_lpi_max} LPI` : "Any") },
            { header: "Limit", accessorKey: "limit_meters", numeric: true, cell: (r) => `${meters(r.limit_meters as number)} m` },
            { header: "Notes", accessorKey: "notes" },
          ],
          fields: [
            {
              name: "customer_id", label: "Customer", type: "select", half: true,
              options: lookups.customers ?? [],
              hint: "Leave blank to apply to every customer.",
            },
            { name: "priority", label: "Priority", type: "number", half: true, hint: "Lower wins when two rules match." },
            { name: "screen_lpi_min", label: "Screen from (LPI)", type: "number", half: true },
            { name: "screen_lpi_max", label: "Screen to (LPI)", type: "number", half: true },
            { name: "limit_meters", label: "Limit (meters)", type: "number", required: true, half: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ],
        }

      case "ink_products":
        return {
          entityName: "ink",
          empty: "No inks yet. Add them before an operator has to pick one at a station.",
          columns: [
            { header: "Code", accessorKey: "ink_code", cell: (r) => <span data-numeric="">{String(r.ink_code)}</span> },
            { header: "Colour", accessorKey: "colour_name" },
            { header: "System", accessorKey: "ink_system", cell: (r) => String(r.ink_system).toUpperCase().replace(/_/g, " ") },
            { header: "Pantone", accessorKey: "pantone_ref" },
            { header: "Supplier", cell: (r) => label(lookups.suppliers, r.supplier_id) },
            { header: "Type", accessorKey: "is_self_colour", cell: (r) => (r.is_self_colour ? "Self colour" : "Process") },
          ],
          fields: [
            { name: "ink_code", label: "Ink code", required: true, half: true },
            { name: "colour_name", label: "Colour name", required: true, half: true },
            {
              name: "ink_system", label: "Ink system", type: "select", required: true, half: true,
              options: [
                { value: "nc", label: "NC" },
                { value: "pu", label: "PU" },
                { value: "nc_pu", label: "NC / PU" },
                { value: "water_based", label: "Water based" },
                { value: "solvent_other", label: "Solvent, other" },
              ],
            },
            { name: "supplier_id", label: "Supplier", type: "select", half: true, options: lookups.suppliers ?? [] },
            { name: "pantone_ref", label: "Pantone reference", half: true },
            { name: "technology", label: "Technology", half: true, hint: "Surface print or reverse print grade." },
            { name: "is_self_colour", label: "Self colour", type: "switch", half: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ],
        }

      case "ink_batches":
        return {
          entityName: "ink batch",
          empty: "No ink batches yet. A station cannot record which batch it ran until one exists.",
          columns: [
            { header: "Batch", accessorKey: "batch_no", cell: (r) => <span data-numeric="">{String(r.batch_no)}</span> },
            { header: "Ink", cell: (r) => label(lookups.inkProducts, r.ink_product_id) },
            { header: "Made", accessorKey: "mfg_date", cell: (r) => shortDate(r.mfg_date as string) },
            { header: "Received", accessorKey: "received_date", cell: (r) => shortDate(r.received_date as string) },
            { header: "Quantity", accessorKey: "qty_kg", numeric: true, cell: (r) => `${decimal(r.qty_kg as number)} kg` },
            { header: "Supplier lot", accessorKey: "supplier_lot" },
          ],
          fields: [
            { name: "ink_product_id", label: "Ink", type: "select", required: true, options: lookups.inkProducts ?? [] },
            { name: "batch_no", label: "Batch number", required: true, half: true },
            { name: "supplier_lot", label: "Supplier lot", half: true },
            { name: "mfg_date", label: "Manufactured", type: "date", half: true },
            { name: "received_date", label: "Received", type: "date", half: true },
            { name: "qty_kg", label: "Quantity (kg)", type: "number", half: true },
            { name: "remarks", label: "Remarks", type: "textarea" },
          ],
        }

      case "substrate_batches":
        return {
          entityName: "substrate batch",
          empty: "No substrate batches yet. Add the reels you have so a bond complaint can be traced to one.",
          columns: [
            { header: "Batch", accessorKey: "batch_no", cell: (r) => <span data-numeric="">{String(r.batch_no)}</span> },
            { header: "Supplier", cell: (r) => label(lookups.suppliers, r.supplier_id) },
            { header: "Material", accessorKey: "material_type" },
            { header: "Thickness", accessorKey: "thickness_micron", numeric: true, cell: (r) => `${decimal(r.thickness_micron as number)} µ` },
            { header: "Width", accessorKey: "width_mm", numeric: true, cell: (r) => `${decimal(r.width_mm as number, 0)} mm` },
            { header: "Dyne", accessorKey: "treatment_dyne_supplier", numeric: true, cell: (r) => decimal(r.treatment_dyne_supplier as number) },
            { header: "Received", accessorKey: "received_date", cell: (r) => shortDate(r.received_date as string) },
          ],
          fields: [
            { name: "supplier_id", label: "Supplier", type: "select", required: true, half: true, options: lookups.suppliers ?? [] },
            { name: "batch_no", label: "Batch number", required: true, half: true },
            {
              name: "material_type", label: "Material", type: "select", required: true, half: true,
              options: ["PET", "BOPP", "MBOPP", "CPP", "PE", "Paper"].map((m) => ({ value: m, label: m })),
            },
            { name: "grade", label: "Grade", half: true },
            { name: "thickness_micron", label: "Thickness (µ)", type: "number", required: true, half: true },
            { name: "width_mm", label: "Width (mm)", type: "number", half: true },
            { name: "treatment_dyne_supplier", label: "Dyne from supplier", type: "number", half: true },
            { name: "gsm", label: "GSM", type: "number", half: true },
            { name: "lot_no", label: "Lot number", half: true },
            { name: "received_date", label: "Received", type: "date", half: true },
            { name: "qty_kg", label: "Quantity (kg)", type: "number", half: true },
            { name: "remarks", label: "Remarks", type: "textarea" },
          ],
        }

      default:
        return { entityName: "record", empty: "Nothing here yet.", columns: [], fields: [] }
    }
  }, [table, lookups])

  return (
    <MasterTable
      rows={rows}
      columns={config.columns}
      fields={config.fields}
      canEdit={canEdit}
      entityName={config.entityName}
      emptyMessage={config.empty}
      save={(values) => saveMaster(table, values)}
    />
  )
}
