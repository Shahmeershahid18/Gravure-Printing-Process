"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

export type FieldSpec = {
  name: string
  label: string
  type?: "text" | "number" | "email" | "textarea" | "select" | "switch" | "date"
  options?: { value: string; label: string }[]
  required?: boolean
  hint?: string
  /** Half-width on the form grid. Defaults to full. */
  half?: boolean
  /** Cannot be changed after creation, e.g. a natural key other rows point at. */
  lockOnEdit?: boolean
}

export type MasterRow = Record<string, unknown> & { id?: string }

/**
 * List plus create/edit dialog for a simple master table.
 *
 * Seven settings screens differ only in their columns and their field list, so
 * they share this and stay consistent with each other for free -- which is the
 * whole point of a design system that ships before the features do.
 */
export function MasterTable({
  rows,
  columns,
  fields,
  save,
  canEdit,
  entityName,
  emptyMessage,
}: {
  rows: MasterRow[]
  columns: Column<MasterRow>[]
  fields: FieldSpec[]
  save: (values: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  canEdit: boolean
  entityName: string
  emptyMessage: string
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<MasterRow | null>(null)
  const [open, setOpen] = React.useState(false)
  const [values, setValues] = React.useState<Record<string, unknown>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const startCreate = () => {
    setEditing(null)
    setValues(
      Object.fromEntries(
        fields.map((f) => [f.name, f.type === "switch" ? true : ""])
      )
    )
    setError(null)
    setOpen(true)
  }

  const startEdit = (row: MasterRow) => {
    setEditing(row)
    setValues(
      Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? (f.type === "switch" ? false : "")]))
    )
    setError(null)
    setOpen(true)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await save({ ...values, id: editing?.id })
    setBusy(false)
    if (!res.ok) return setError(res.error ?? `The ${entityName} could not be saved.`)
    setOpen(false)
    router.refresh()
  }

  const allColumns: Column<MasterRow>[] = canEdit
    ? [
        ...columns,
        {
          header: "",
          noFilter: true,
          className: "w-24 text-right",
          cell: (row) => (
            <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
              Edit
            </Button>
          ),
        },
      ]
    : columns

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button variant="primary" onClick={startCreate}>
            Add {entityName}
          </Button>
        </div>
      )}

      <DataTable
        columns={allColumns}
        data={rows}
        filterPlaceholder={`Filter ${entityName}s…`}
        emptyMessage={emptyMessage}
        emptyAction={
          canEdit ? (
            <Button variant="primary" onClick={startCreate}>
              Add {entityName}
            </Button>
          ) : undefined
        }
        rowKey={(r, i) => String(r.id ?? i)}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${entityName}` : `Add ${entityName}`}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `field-${f.name}`
              const disabled = Boolean(editing && f.lockOnEdit)
              const value = values[f.name]

              return (
                <Field
                  key={f.name}
                  label={f.label}
                  htmlFor={id}
                  required={f.required}
                  hint={disabled ? "Set when created and cannot be changed." : f.hint}
                  className={f.half ? "" : "sm:col-span-2"}
                >
                  {f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      value={String(value ?? "")}
                      disabled={disabled}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      id={id}
                      value={String(value ?? "")}
                      disabled={disabled}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    >
                      <option value="">Not set</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === "switch" ? (
                    <div className="flex h-[var(--tap)] items-center gap-3">
                      <Switch
                        id={id}
                        checked={Boolean(value)}
                        disabled={disabled}
                        onCheckedChange={(c) => setValues((v) => ({ ...v, [f.name]: c }))}
                      />
                      <span className="text-ink-600">{value ? "Yes" : "No"}</span>
                    </div>
                  ) : (
                    <Input
                      id={id}
                      type={f.type === "number" ? "number" : f.type ?? "text"}
                      numeric={f.type === "number"}
                      step={f.type === "number" ? "any" : undefined}
                      value={String(value ?? "")}
                      disabled={disabled}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </Field>
              )
            })}
          </div>
        </div>
      </Dialog>
    </>
  )
}
