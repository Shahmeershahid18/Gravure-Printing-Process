"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { Alert } from "@/components/ui/alert"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { importRows, type ImportTarget } from "@/lib/actions/import"
import { cn } from "@/lib/utils"

/**
 * The Excel importer, dry run first -- plan Section 12.
 *
 * Order matters because of foreign keys, so the targets are listed in the
 * order they must be run rather than alphabetically. Reconcile three cylinders
 * and three jobs against the workbook before trusting any of it, and when the
 * figures differ, fix the mapping rather than the data.
 */
const TARGETS: {
  value: ImportTarget
  label: string
  columns: string
  step: number
}[] = [
  { value: "customers", label: "Customers", columns: "code, name, contact_name, contact_email, notes", step: 1 },
  { value: "suppliers", label: "Suppliers", columns: "code, name, type, notes", step: 1 },
  { value: "machines", label: "Machines", columns: "code, name, max_web_width_mm, max_speed_mpm, dryer_zones", step: 1 },
  { value: "colour_names", label: "Colour names", columns: "name, sort_order", step: 1 },
  { value: "issue_templates", label: "Issue templates", columns: "area, title, hint", step: 1 },
  { value: "cylinder_life_rules", label: "Cylinder life rules", columns: "screen_lpi_min, screen_lpi_max, limit_meters, priority, notes", step: 2 },
  { value: "ink_products", label: "Ink products", columns: "ink_code, colour_name, ink_system, pantone_ref, supplier_code", step: 3 },
  { value: "ink_batches", label: "Ink batches", columns: "ink_code, batch_no, mfg_date, received_date, qty_kg", step: 3 },
  { value: "substrate_batches", label: "Substrate batches", columns: "supplier_code, material_type, thickness_micron, batch_no, lot_no, treatment_dyne_supplier, received_date, qty_kg", step: 3 },
  { value: "cylinders", label: "Cylinders", columns: "cylinder_no, colour_name, ownership, customer_code, screen_lpi, stylus_angle, circumference_mm, engraving_date, opening_meters, status, condition", step: 4 },
  { value: "job_files", label: "Job files", columns: "job_no, customer_code, product_name, structure, no_of_colours, machine_code, reel_width_mm", step: 5 },
]

type Row = Record<string, unknown>

export function ExcelImporter() {
  const router = useRouter()
  const [target, setTarget] = React.useState<ImportTarget>("customers")
  const [sheetNames, setSheetNames] = React.useState<string[]>([])
  const [workbook, setWorkbook] = React.useState<XLSX.WorkBook | null>(null)
  const [sheet, setSheet] = React.useState("")
  const [rows, setRows] = React.useState<Row[]>([])
  const [result, setResult] = React.useState<
    { inserted: number; failed: { row: number; error: string }[] } | null
  >(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const spec = TARGETS.find((t) => t.value === target)!

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { cellDates: true })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)
      const first = wb.SheetNames[0] ?? ""
      setSheet(first)
      loadSheet(wb, first)
    } catch {
      setError("That file could not be read as a workbook. Save it as .xlsx and try again.")
    }
  }

  const loadSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name]
    if (!ws) return setRows([])
    const parsed = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: false })
    setRows(parsed)
    setResult(null)
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  const expected = spec.columns.split(",").map((c) => c.trim())
  const missing = expected.filter(
    (c) => !headers.some((h) => h.trim().toLowerCase() === c.toLowerCase())
  )

  const runImport = async () => {
    setBusy(true)
    setError(null)
    const res = await importRows(target, rows)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setResult({ inserted: res.inserted, failed: res.failed })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="1 · Pick what you are importing"
          description="Run these in order. A job file cannot import before its customer exists."
        />
        <CardBody className="space-y-4">
          <Field label="Target" htmlFor="imp-target" hint={`Expected columns: ${spec.columns}`}>
            <Select
              id="imp-target"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value as ImportTarget)
                setResult(null)
              }}
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  Step {t.step} · {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2 · Choose the workbook"
          description="Nothing leaves your browser until you press Import."
        />
        <CardBody className="space-y-4">
          <label className="inline-flex h-[var(--tap)] cursor-pointer items-center rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-4 font-semibold text-ink-900 hover:bg-paper-100">
            Choose .xlsx file
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="sr-only" />
          </label>

          {sheetNames.length > 0 && (
            <Field label="Sheet" htmlFor="imp-sheet">
              <Select
                id="imp-sheet"
                value={sheet}
                onChange={(e) => {
                  setSheet(e.target.value)
                  if (workbook) loadSheet(workbook, e.target.value)
                }}
              >
                {sheetNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader
            title={`3 · Preview · ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            description="Check the first rows read correctly before importing anything."
          />
          <CardBody className="space-y-4">
            {missing.length > 0 && (
              <Alert tone="warn" title="Some expected columns are missing">
                This sheet has no column named {missing.join(", ")}. Those fields
                will import empty. Rename the headers in Excel to match, or
                accept the gaps.
              </Alert>
            )}

            <div className="max-h-96 overflow-auto">
              <Table>
                <THead>
                  <TR>
                    <TH numeric>#</TH>
                    {headers.slice(0, 10).map((h) => (
                      <TH key={h} className={cn(!expected.includes(h) && "text-steel-400")}>
                        {h}
                      </TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {rows.slice(0, 25).map((r, i) => (
                    <TR key={i}>
                      <TD numeric>{i + 2}</TD>
                      {headers.slice(0, 10).map((h) => (
                        <TD key={h} className="max-w-48 truncate">
                          {String(r[h] ?? "—")}
                        </TD>
                      ))}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {rows.length > 25 && (
              <p className="text-[length:calc(var(--base)*0.82)] text-steel-400">
                Showing the first 25 of {rows.length}. All {rows.length} will be
                imported.
              </p>
            )}
          </CardBody>
          <CardFooter>
            <Button variant="primary" onClick={runImport} disabled={busy}>
              {busy ? "Importing…" : `Import ${rows.length} rows into ${spec.label}`}
            </Button>
          </CardFooter>
        </Card>
      )}

      {error && <Alert tone="critical" title="Import failed">{error}</Alert>}

      {result && (
        <Card>
          <CardHeader title="4 · Result" />
          <CardBody className="space-y-4">
            <Alert
              tone={result.failed.length === 0 ? "ok" : "warn"}
              title={`${result.inserted} row${result.inserted === 1 ? "" : "s"} imported`}
            >
              {result.failed.length === 0
                ? "Every row went in. Reconcile a few figures against the workbook before moving to the next sheet."
                : `${result.failed.length} row${result.failed.length === 1 ? "" : "s"} were rejected and are listed below. Fix them in Excel and import just those.`}
            </Alert>

            {result.failed.length > 0 && (
              <Table>
                <THead>
                  <TR>
                    <TH numeric>Excel row</TH>
                    <TH>Why it was rejected</TH>
                  </TR>
                </THead>
                <TBody>
                  {result.failed.map((f, i) => (
                    <TR key={i}>
                      <TD numeric>{f.row}</TD>
                      <TD>{f.error}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
