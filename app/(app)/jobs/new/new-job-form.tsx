"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createJobFile } from "@/lib/actions/jobs"
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

export function NewJobForm({
  customers,
  machines,
}: {
  customers: { id: string; name: string; code: string }[]
  machines: { id: string; code: string }[]
}) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const values = Object.fromEntries(new FormData(e.currentTarget))
    const res = await createJobFile(values)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.push(`/jobs/${res.id}`)
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {error && <Alert tone="critical" title="Job file not created">{error}</Alert>}

      <Card>
        <CardHeader
          title="The job"
          description="Named the way the floor names it, so an operator recognises it on the tablet."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="customer_id" required>
            <Select id="customer_id" name="customer_id" required defaultValue="">
              <option value="" disabled>Pick a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Job number" htmlFor="job_no" required hint="Your own number, e.g. GR-2548.">
            <Input id="job_no" name="job_no" required placeholder="GR-2548" />
          </Field>

          <Field label="Product" htmlFor="product_name" required>
            <Input id="product_name" name="product_name" required placeholder="Biscuit" />
          </Field>

          <Field label="Structure" htmlFor="structure" required hint="As printed on the spec sheet.">
            <Input id="structure" name="structure" required placeholder="PET 12 / MBOPP 20" />
          </Field>

          <Field
            label="Number of colours"
            htmlFor="no_of_colours"
            required
            hint="Stations above this number start idle on every run."
          >
            <Select id="no_of_colours" name="no_of_colours" required defaultValue="8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Default machine"
            htmlFor="default_machine_id"
            hint="A form default only. Each run records its own machine."
          >
            <Select id="default_machine_id" name="default_machine_id" defaultValue="">
              <option value="">Not set</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.code}</option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reel and repeat" description="Optional. Fill in what the spec sheet gives you." />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Reel width (mm)" htmlFor="reel_width_mm">
            <Input id="reel_width_mm" name="reel_width_mm" type="number" step="any" numeric />
          </Field>
          <Field label="Repeat length (mm)" htmlFor="repeat_length_mm">
            <Input id="repeat_length_mm" name="repeat_length_mm" type="number" step="any" numeric />
          </Field>
          <Field label="Ups" htmlFor="ups">
            <Input id="ups" name="ups" type="number" numeric />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="First revision"
          description="Rev-00 is created with the job file. You can add the shade card now or later."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Artwork number" htmlFor="artwork_no">
            <Input id="artwork_no" name="artwork_no" />
          </Field>
          <Field label="Shade card number" htmlFor="shade_card_no">
            <Input id="shade_card_no" name="shade_card_no" placeholder="SC-01" />
          </Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" placeholder="Anything the floor should know about this job" />
          </Field>
        </CardBody>
        <CardFooter>
          <Link href="/jobs">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creating…" : "Create job file"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
