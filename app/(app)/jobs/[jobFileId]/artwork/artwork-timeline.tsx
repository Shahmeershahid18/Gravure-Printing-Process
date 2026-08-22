"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createArtworkRevision, setRevisionCylinder } from "@/lib/actions/jobs"
import { Card, CardHeader, CardBody } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { Badge, humanise } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { swatchFor } from "@/lib/stations"
import { shortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type Revision = {
  id: string
  revision_no: number
  revision_label: string
  revision_date: string
  artwork_no: string | null
  shade_card_no: string | null
  change_summary: string
  customer_approval: string
  effective_from_run: number | null
  is_current: boolean
}

type Mapping = {
  id: string
  revision_id: string
  station_no: number
  cylinder_id: string | null
  action: string
  remarks: string | null
}

type Cylinder = { id: string; cylinder_no: string; colour_name: string | null; status: string }

const ACTIONS = [
  { value: "new", label: "New" },
  { value: "re_engraved", label: "Re-engraved" },
  { value: "unchanged", label: "Unchanged" },
  { value: "removed", label: "Removed" },
]

/**
 * The revision timeline and its 8 station cylinder map.
 *
 * A new revision copies the previous cylinder set so the planner marks what
 * changed rather than re-entering eight stations. Marking a station
 * re-engraved is what resets that cylinder's surface life -- see plan
 * Section 7.2 -- so the wording here matters more than it looks.
 */
export function ArtworkTimeline({
  jobFileId,
  colourCount,
  revisions,
  mappings,
  cylinders,
  canEdit,
}: {
  jobFileId: string
  colourCount: number
  revisions: Revision[]
  mappings: Mapping[]
  cylinders: Cylinder[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string | null>(
    revisions.find((r) => r.is_current)?.id ?? revisions[0]?.id ?? null
  )
  const [creating, setCreating] = React.useState(false)

  const current = revisions.find((r) => r.id === selected) ?? null
  const rows = React.useMemo(() => {
    const byStation = new Map(
      mappings.filter((m) => m.revision_id === selected).map((m) => [m.station_no, m])
    )
    return Array.from({ length: 8 }, (_, i) => {
      const no = i + 1
      return (
        byStation.get(no) ?? {
          id: `new-${no}`,
          revision_id: selected ?? "",
          station_no: no,
          cylinder_id: null,
          action: no > colourCount ? "removed" : "unchanged",
          remarks: null,
        }
      )
    })
  }, [mappings, selected, colourCount])

  const cylMap = React.useMemo(
    () => new Map(cylinders.map((c) => [c.id, c])),
    [cylinders]
  )

  if (revisions.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No revisions yet. A job file is created with Rev-00, so this list being empty means something went wrong at creation."
          action={
            canEdit ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create a revision
              </Button>
            ) : undefined
          }
        />
        {creating && (
          <NewRevisionDialog
            jobFileId={jobFileId}
            onClose={() => setCreating(false)}
            onSaved={() => {
              setCreating(false)
              router.refresh()
            }}
          />
        )}
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Timeline */}
      <div className="lg:col-span-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
            Revisions
          </h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              New
            </Button>
          )}
        </div>
        <ol className="overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-paper-000">
          {revisions.map((r) => {
            const active = r.id === selected
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-full border-b border-steel-200 px-3 py-3 text-left transition-colors last:border-0",
                    active ? "bg-paper-100 ring-2 ring-inset ring-ink-900" : "hover:bg-paper-100"
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span data-numeric="" className="font-semibold text-ink-900">
                      {r.revision_label}
                    </span>
                    {r.is_current && <Badge tone="ok">Current</Badge>}
                  </span>
                  <span data-numeric="" className="mt-0.5 block text-[length:calc(var(--base)*0.8)] text-ink-600">
                    {shortDate(r.revision_date)}
                    {r.shade_card_no ? ` · ${r.shade_card_no}` : ""}
                  </span>
                  <span className="mt-1 block truncate text-[length:calc(var(--base)*0.82)] text-steel-400">
                    {r.change_summary}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Detail */}
      <div className="lg:col-span-3">
        {current && (
          <Card>
            <CardHeader
              title={`${current.revision_label} · station cylinders`}
              description="Marking a station re-engraved resets that cylinder's surface life. Lifetime meters keep climbing for costing."
              action={
                <Badge
                  tone={
                    current.customer_approval === "approved"
                      ? "ok"
                      : current.customer_approval === "rejected"
                        ? "critical"
                        : "warn"
                  }
                >
                  {humanise(current.customer_approval)}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-steel-400">
                    Artwork number
                  </p>
                  <p data-numeric="" className="text-ink-900">{current.artwork_no ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-steel-400">
                    Shade card
                  </p>
                  <p data-numeric="" className="text-ink-900">{current.shade_card_no ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-steel-400">
                    Effective from run
                  </p>
                  <p data-numeric="" className="text-ink-900">{current.effective_from_run ?? "—"}</p>
                </div>
              </div>

              <p className="rounded-[var(--radius)] border border-steel-200 bg-paper-100 p-3 text-[length:calc(var(--base)*0.92)] text-ink-900">
                {current.change_summary}
              </p>

              <Table>
                <THead>
                  <TR>
                    <TH numeric>Stn</TH>
                    <TH>Cylinder</TH>
                    <TH>Colour</TH>
                    <TH>Change</TH>
                    <TH>Remarks</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((m) => {
                    const c = m.cylinder_id ? cylMap.get(m.cylinder_id) : null
                    const swatch = swatchFor(c?.colour_name)
                    const idle = m.station_no > colourCount
                    return (
                      <TR key={m.station_no} className={idle ? "text-steel-400" : undefined}>
                        <TD numeric>
                          <span className="flex items-center justify-end gap-2">
                            <span
                              aria-hidden="true"
                              className={cn("block h-4 w-2 rounded-sm", idle && "opacity-25")}
                              style={{ backgroundColor: `var(${swatch.varName})` }}
                            />
                            {m.station_no}
                          </span>
                        </TD>
                        <TD>
                          {canEdit ? (
                            <StationCylinderPicker
                              jobFileId={jobFileId}
                              revisionId={current.id}
                              stationNo={m.station_no}
                              value={m.cylinder_id}
                              action={m.action}
                              cylinders={cylinders}
                            />
                          ) : (
                            <span data-numeric="">{c?.cylinder_no ?? "—"}</span>
                          )}
                        </TD>
                        <TD>{c?.colour_name ?? "—"}</TD>
                        <TD>
                          {canEdit ? (
                            <StationActionPicker
                              jobFileId={jobFileId}
                              revisionId={current.id}
                              stationNo={m.station_no}
                              cylinderId={m.cylinder_id}
                              value={m.action}
                            />
                          ) : (
                            humanise(m.action)
                          )}
                        </TD>
                        <TD className="text-[length:calc(var(--base)*0.86)]">{m.remarks ?? "—"}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>

              <p className="text-[length:calc(var(--base)*0.82)] text-ink-600">
                Cylinders come from the master list.{" "}
                <Link href="/cylinders" className="underline hover:text-ink-900">
                  Register a new one
                </Link>{" "}
                before mapping it here.
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      {creating && (
        <NewRevisionDialog
          jobFileId={jobFileId}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function StationCylinderPicker({
  jobFileId,
  revisionId,
  stationNo,
  value,
  action,
  cylinders,
}: {
  jobFileId: string
  revisionId: string
  stationNo: number
  value: string | null
  action: string
  cylinders: Cylinder[]
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  return (
    <Select
      value={value ?? ""}
      disabled={busy}
      aria-label={`Station ${stationNo} cylinder`}
      className="h-[calc(var(--tap)*0.8)] min-w-40"
      onChange={async (e) => {
        setBusy(true)
        await setRevisionCylinder({
          revision_id: revisionId,
          station_no: stationNo,
          cylinder_id: e.target.value || null,
          action,
          job_file_id: jobFileId,
        })
        setBusy(false)
        router.refresh()
      }}
    >
      <option value="">Not assigned</option>
      {cylinders.map((c) => (
        <option key={c.id} value={c.id}>
          {c.cylinder_no}
          {c.colour_name ? ` — ${c.colour_name}` : ""}
        </option>
      ))}
    </Select>
  )
}

function StationActionPicker({
  jobFileId,
  revisionId,
  stationNo,
  cylinderId,
  value,
}: {
  jobFileId: string
  revisionId: string
  stationNo: number
  cylinderId: string | null
  value: string
}) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  return (
    <Select
      value={value}
      disabled={busy}
      aria-label={`Station ${stationNo} change`}
      className="h-[calc(var(--tap)*0.8)] min-w-32"
      onChange={async (e) => {
        setBusy(true)
        await setRevisionCylinder({
          revision_id: revisionId,
          station_no: stationNo,
          cylinder_id: cylinderId,
          action: e.target.value,
          job_file_id: jobFileId,
        })
        setBusy(false)
        router.refresh()
      }}
    >
      {ACTIONS.map((a) => (
        <option key={a.value} value={a.value}>
          {a.label}
        </option>
      ))}
    </Select>
  )
}

function NewRevisionDialog({
  jobFileId,
  onClose,
  onSaved,
}: {
  jobFileId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = React.useState({
    change_summary: "",
    artwork_no: "",
    shade_card_no: "",
    effective_from_run: "",
    customer_approval: "pending",
  })
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await createArtworkRevision({ ...values, job_file_id: jobFileId })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onSaved()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New artwork revision"
      description="The previous revision stays exactly as it is. This one becomes current and every future run binds to it."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create revision"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="critical" title="Not created">{error}</Alert>}

        <Field
          label="What changed"
          htmlFor="change_summary"
          required
          hint="Six months from now this sentence is the only record of why."
        >
          <Textarea
            id="change_summary"
            value={values.change_summary}
            onChange={(e) => setValues((v) => ({ ...v, change_summary: e.target.value }))}
            placeholder="Customer changed the back panel copy. Stations 4 and 6 re-engraved."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Artwork number" htmlFor="artwork_no">
            <Input id="artwork_no" value={values.artwork_no}
              onChange={(e) => setValues((v) => ({ ...v, artwork_no: e.target.value }))} />
          </Field>
          <Field label="Shade card number" htmlFor="shade_card_no">
            <Input id="shade_card_no" value={values.shade_card_no}
              onChange={(e) => setValues((v) => ({ ...v, shade_card_no: e.target.value }))} />
          </Field>
          <Field label="Effective from run" htmlFor="effective_from_run">
            <Input id="effective_from_run" type="number" numeric value={values.effective_from_run}
              onChange={(e) => setValues((v) => ({ ...v, effective_from_run: e.target.value }))} />
          </Field>
          <Field label="Customer approval" htmlFor="customer_approval">
            <Select id="customer_approval" value={values.customer_approval}
              onChange={(e) => setValues((v) => ({ ...v, customer_approval: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  )
}
