"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { Badge, conditionTone, humanise } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { WearBar } from "@/components/cylinder/WearGauge"
import { saveMaster } from "@/lib/actions/masters"
import { meters, shortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type CylinderRow = {
  id: string
  cylinder_no: string
  colour_name: string | null
  ownership: string
  status: string
  condition: string
  customer_name: string | null
  screen_lpi: number | null
  surface_meters: number
  lifetime_meters: number
  life_limit_meters: number
  life_used_pct: number
  surface_since: string | null
  run_count: number
  job_count: number
  last_used_on: string | null
  last_cleaning: string | null
  major_issue_count: number
}

type Option = { value: string; label: string }

const STATUSES = ["in_store", "on_machine", "at_engraver", "under_repair", "with_customer", "scrapped"]
const CONDITIONS = ["new", "good", "fair", "worn", "damaged"]

export function CylindersBoard({
  rows,
  canEdit,
  customers,
  suppliers,
}: {
  rows: CylinderRow[]
  canEdit: boolean
  customers: Option[]
  suppliers: Option[]
}) {
  const [filter, setFilter] = React.useState<"all" | "alerts" | "on_floor" | "with_customer">("all")
  const [creating, setCreating] = React.useState(false)

  const filtered = React.useMemo(() => {
    switch (filter) {
      case "alerts":
        return rows.filter(
          (c) =>
            !["with_customer", "at_engraver", "scrapped"].includes(c.status) &&
            (c.life_used_pct >= 80 || ["worn", "damaged"].includes(c.condition))
        )
      case "on_floor":
        return rows.filter((c) => !["with_customer", "at_engraver", "scrapped"].includes(c.status))
      case "with_customer":
        return rows.filter((c) => c.ownership === "customer")
      default:
        return rows
    }
  }, [rows, filter])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All cylinders"],
              ["on_floor", "On the floor"],
              ["alerts", "Needs attention"],
              ["with_customer", "Customer owned"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                "inline-flex h-8 items-center rounded-[var(--radius)] border px-3 text-[length:calc(var(--base)*0.86)] font-semibold transition-colors",
                filter === key
                  ? "border-ink-900 bg-ink-900 text-paper-000"
                  : "border-steel-200 bg-paper-000 text-ink-600 hover:text-ink-900"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            Register cylinder
          </Button>
        )}
      </div>

      <DataTable<CylinderRow>
        data={filtered}
        rowKey={(r) => r.id}
        filterPlaceholder="Filter by cylinder number or colour…"
        emptyMessage="No cylinders registered yet. Add each one in your store with its opening meter reading."
        emptyAction={
          canEdit ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              Register cylinder
            </Button>
          ) : undefined
        }
        columns={[
          {
            header: "Cylinder",
            accessorKey: "cylinder_no",
            cell: (r) => (
              <Link href={`/cylinders/${r.id}`} data-numeric="" className="font-semibold text-ink-900 hover:underline">
                {r.cylinder_no}
              </Link>
            ),
          },
          { header: "Colour", accessorKey: "colour_name" },
          {
            header: "Owner",
            accessorKey: "customer_name",
            cell: (r) =>
              r.ownership === "customer" ? (
                <span className="text-ink-900">{r.customer_name ?? "Customer"}</span>
              ) : (
                <span className="text-ink-600">Company</span>
              ),
          },
          {
            header: "Screen",
            accessorKey: "screen_lpi",
            numeric: true,
            noFilter: true,
            cell: (r) => (r.screen_lpi ? `${r.screen_lpi} LPI` : "—"),
          },
          {
            header: "Surface life",
            accessorKey: "life_used_pct",
            noFilter: true,
            className: "min-w-56",
            cell: (r) => (
              <WearBar
                used={r.surface_meters}
                limit={r.life_limit_meters}
                pctUsed={r.life_used_pct}
              />
            ),
          },
          {
            header: "Lifetime",
            accessorKey: "lifetime_meters",
            numeric: true,
            noFilter: true,
            cell: (r) => `${meters(r.lifetime_meters)} m`,
          },
          {
            header: "Condition",
            accessorKey: "condition",
            cell: (r) => <Badge tone={conditionTone(r.condition)}>{humanise(r.condition)}</Badge>,
          },
          {
            header: "Status",
            accessorKey: "status",
            cell: (r) => <Badge tone="neutral" glyph={false}>{humanise(r.status)}</Badge>,
          },
          {
            header: "Last used",
            accessorKey: "last_used_on",
            noFilter: true,
            cell: (r) => <span data-numeric="">{shortDate(r.last_used_on)}</span>,
          },
          {
            header: "Issues",
            accessorKey: "major_issue_count",
            numeric: true,
            noFilter: true,
            cell: (r) =>
              r.major_issue_count > 0 ? (
                <span className="font-semibold text-signal-warn">{r.major_issue_count}</span>
              ) : (
                <span className="text-steel-400">0</span>
              ),
          },
        ]}
      />

      {creating && (
        <CylinderDialog
          customers={customers}
          suppliers={suppliers}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  )
}

function CylinderDialog({
  customers,
  suppliers,
  onClose,
}: {
  customers: Option[]
  suppliers: Option[]
  onClose: () => void
}) {
  const router = useRouter()
  const [values, setValues] = React.useState<Record<string, string>>({
    cylinder_no: "",
    colour_name: "",
    ownership: "company",
    owned_by_customer_id: "",
    engraver_supplier_id: "",
    base_no: "",
    circumference_mm: "",
    face_width_mm: "",
    screen_lpi: "",
    stylus_angle: "",
    cell_depth_micron: "",
    engraving_date: "",
    status: "in_store",
    condition: "new",
    opening_meters: "0",
    life_limit_override: "",
    location: "",
    notes: "",
  })
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))

  const submit = async () => {
    if (values.ownership === "customer" && !values.owned_by_customer_id) {
      return setError("A customer owned cylinder needs a customer. Pick one.")
    }
    setBusy(true)
    setError(null)
    const res = await saveMaster("cylinders", values)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not saved.")
    onClose()
    router.refresh()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      wide
      title="Register a cylinder"
      description="Opening meters is the historical figure at import. Cumulative meters are always derived from runs and can never be typed."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save cylinder"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cylinder number" htmlFor="cyl-no" required>
            <Input id="cyl-no" value={values.cylinder_no} onChange={(e) => set("cylinder_no", e.target.value)} placeholder="C-104" />
          </Field>
          <Field label="Colour" htmlFor="cyl-colour">
            <Input id="cyl-colour" value={values.colour_name} onChange={(e) => set("colour_name", e.target.value)} />
          </Field>

          <Field label="Ownership" htmlFor="cyl-own" required>
            <Select id="cyl-own" value={values.ownership} onChange={(e) => set("ownership", e.target.value)}>
              <option value="company">Company owned</option>
              <option value="customer">Customer owned</option>
            </Select>
          </Field>
          <Field
            label="Owning customer"
            htmlFor="cyl-cust"
            required={values.ownership === "customer"}
            hint={values.ownership === "company" ? "Only needed for customer owned cylinders." : undefined}
          >
            <Select
              id="cyl-cust"
              value={values.owned_by_customer_id}
              disabled={values.ownership === "company"}
              onChange={(e) => set("owned_by_customer_id", e.target.value)}
            >
              <option value="">Not set</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Engraver" htmlFor="cyl-eng">
            <Select id="cyl-eng" value={values.engraver_supplier_id} onChange={(e) => set("engraver_supplier_id", e.target.value)}>
              <option value="">Not set</option>
              {suppliers.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Base number" htmlFor="cyl-base">
            <Input id="cyl-base" value={values.base_no} onChange={(e) => set("base_no", e.target.value)} />
          </Field>

          <Field label="Circumference (mm)" htmlFor="cyl-circ">
            <Input id="cyl-circ" type="number" step="any" numeric value={values.circumference_mm} onChange={(e) => set("circumference_mm", e.target.value)} />
          </Field>
          <Field label="Face width (mm)" htmlFor="cyl-face">
            <Input id="cyl-face" type="number" step="any" numeric value={values.face_width_mm} onChange={(e) => set("face_width_mm", e.target.value)} />
          </Field>

          <Field label="Screen (LPI)" htmlFor="cyl-lpi" hint="Decides which life rule applies.">
            <Input id="cyl-lpi" type="number" numeric value={values.screen_lpi} onChange={(e) => set("screen_lpi", e.target.value)} />
          </Field>
          <Field label="Stylus angle" htmlFor="cyl-stylus">
            <Input id="cyl-stylus" type="number" step="any" numeric value={values.stylus_angle} onChange={(e) => set("stylus_angle", e.target.value)} />
          </Field>

          <Field label="Cell depth (µ)" htmlFor="cyl-cell">
            <Input id="cyl-cell" type="number" step="any" numeric value={values.cell_depth_micron} onChange={(e) => set("cell_depth_micron", e.target.value)} />
          </Field>
          <Field label="Engraving date" htmlFor="cyl-engdate">
            <Input id="cyl-engdate" type="date" value={values.engraving_date} onChange={(e) => set("engraving_date", e.target.value)} />
          </Field>

          <Field label="Status" htmlFor="cyl-status">
            <Select id="cyl-status" value={values.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{humanise(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Condition" htmlFor="cyl-cond">
            <Select id="cyl-cond" value={values.condition} onChange={(e) => set("condition", e.target.value)}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{humanise(c)}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Opening meters"
            htmlFor="cyl-open"
            hint="Meters already run before this system. Set it to your Excel cumulative minus any runs you import."
          >
            <Input id="cyl-open" type="number" numeric value={values.opening_meters} onChange={(e) => set("opening_meters", e.target.value)} />
          </Field>
          <Field
            label="Life limit override"
            htmlFor="cyl-limit"
            hint="Leave blank unless this cylinder is special. Rules handle the rest."
          >
            <Input id="cyl-limit" type="number" numeric value={values.life_limit_override} onChange={(e) => set("life_limit_override", e.target.value)} />
          </Field>

          <Field label="Location" htmlFor="cyl-loc">
            <Input id="cyl-loc" value={values.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="cyl-notes" className="sm:col-span-2">
            <Textarea id="cyl-notes" value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
