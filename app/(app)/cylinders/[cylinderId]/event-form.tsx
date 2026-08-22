"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { logCylinderEvent } from "@/lib/actions/cylinders"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { humanise } from "@/components/ui/badge"
import { today } from "@/lib/format"

const EVENTS = [
  "engraved", "re_engraved", "chrome_plated", "dechromed", "cleaning",
  "repair", "inspection", "issued_to_customer", "received_from_customer", "scrapped",
]

const RESETS = ["engraved", "re_engraved", "chrome_plated"]

export function CylinderEventForm({
  cylinderId,
  currentMeters,
  suppliers,
}: {
  cylinderId: string
  currentMeters: number
  suppliers: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [values, setValues] = React.useState({
    event_type: "cleaning",
    event_date: today(),
    meters_at_event: String(currentMeters),
    supplier_id: "",
    cost: "",
    description: "",
  })
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const resets = RESETS.includes(values.event_type)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await logCylinderEvent({ ...values, cylinder_id: cylinderId })
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not saved.")
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="full" onClick={() => setOpen(true)}>
        Record an event
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record a cylinder event"
        description="The meter reading at the moment it happened is what lets you tell whether a repair bought you 200,000 meters or 20,000."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save event"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

          {resets && (
            <Alert tone="info" title="This resets surface life">
              A restored surface is a new printing surface on the same base.
              Surface meters start again from zero and wear alerts follow the
              new figure. Lifetime meters keep climbing for costing.
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What happened" htmlFor="ev-type" required>
              <Select id="ev-type" value={values.event_type} onChange={(e) => set("event_type", e.target.value)}>
                {EVENTS.map((e) => (
                  <option key={e} value={e}>{humanise(e)}</option>
                ))}
              </Select>
            </Field>

            <Field label="Date" htmlFor="ev-date" required>
              <Input id="ev-date" type="date" value={values.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </Field>

            <Field
              label="Meters at this point"
              htmlFor="ev-meters"
              hint="Defaults to the lifetime total this cylinder has now."
            >
              <Input id="ev-meters" type="number" numeric value={values.meters_at_event} onChange={(e) => set("meters_at_event", e.target.value)} />
            </Field>

            <Field label="Supplier" htmlFor="ev-supplier">
              <Select id="ev-supplier" value={values.supplier_id} onChange={(e) => set("supplier_id", e.target.value)}>
                <option value="">In house</option>
                {suppliers.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Cost" htmlFor="ev-cost" hint="In PKR.">
              <Input id="ev-cost" type="number" step="any" numeric value={values.cost} onChange={(e) => set("cost", e.target.value)} />
            </Field>

            <Field label="Description" htmlFor="ev-desc" className="sm:col-span-2">
              <Textarea id="ev-desc" value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What was done and why" />
            </Field>
          </div>
        </div>
      </Dialog>
    </>
  )
}
