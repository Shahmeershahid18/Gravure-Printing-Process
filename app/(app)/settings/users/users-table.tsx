"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input, Select } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ROLES, roleLabel, type Role } from "@/lib/roles"
import {
  updateProfile,
  setOperatorPin,
  clearOperatorPin,
  createUser,
} from "@/lib/actions/users"

export type UserRow = {
  id: string
  full_name: string
  employee_no: string | null
  role: string
  default_machine_id: string | null
  is_active: boolean
  has_pin: boolean
}

export function UsersTable({
  rows,
  machines,
  currentUserId,
  canCreateSignIns,
}: {
  rows: UserRow[]
  machines: { id: string; code: string }[]
  currentUserId: string
  canCreateSignIns: boolean
}) {
  const router = useRouter()
  const [edit, setEdit] = React.useState<UserRow | null>(null)
  const [pinFor, setPinFor] = React.useState<UserRow | null>(null)
  const [creating, setCreating] = React.useState(false)

  const machineCode = (id: string | null) =>
    machines.find((m) => m.id === id)?.code ?? "—"

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setCreating(true)}>
          Add person
        </Button>
      </div>

      <DataTable<UserRow>
        rowKey={(r) => r.id}
        data={rows}
        filterPlaceholder="Filter people…"
        emptyMessage="No people yet. Add the first sign-in to get started."
        columns={[
          {
            header: "Name",
            accessorKey: "full_name",
            cell: (r) => (
              <span className="font-semibold text-ink-900">
                {r.full_name}
                {r.id === currentUserId && (
                  <span className="ml-2 text-[length:calc(var(--base)*0.78)] font-normal text-steel-400">
                    you
                  </span>
                )}
              </span>
            ),
          },
          {
            header: "Employee no",
            accessorKey: "employee_no",
            cell: (r) => <span data-numeric="">{r.employee_no ?? "—"}</span>,
          },
          {
            header: "Role",
            accessorKey: "role",
            cell: (r) => <Badge tone="neutral" glyph={false}>{roleLabel(r.role as Role)}</Badge>,
          },
          {
            header: "Machine",
            accessorKey: "default_machine_id",
            cell: (r) => <span data-numeric="">{machineCode(r.default_machine_id)}</span>,
          },
          {
            header: "PIN",
            accessorKey: "has_pin",
            cell: (r) =>
              r.role !== "operator" ? (
                <span className="text-steel-400">Not needed</span>
              ) : r.has_pin ? (
                <Badge tone="ok">Set</Badge>
              ) : (
                <Badge tone="warn">Not set</Badge>
              ),
          },
          {
            header: "Status",
            accessorKey: "is_active",
            cell: (r) =>
              r.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="neutral">Deactivated</Badge>,
          },
          {
            header: "",
            noFilter: true,
            className: "text-right whitespace-nowrap",
            cell: (r) => (
              <span className="flex justify-end gap-1">
                {r.role === "operator" && (
                  <Button variant="ghost" size="sm" onClick={() => setPinFor(r)}>
                    {r.has_pin ? "Change PIN" : "Set PIN"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEdit(r)}>
                  Edit
                </Button>
              </span>
            ),
          },
        ]}
      />

      {edit && (
        <EditDialog
          user={edit}
          machines={machines}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null)
            router.refresh()
          }}
        />
      )}

      {pinFor && (
        <PinDialog
          user={pinFor}
          onClose={() => setPinFor(null)}
          onSaved={() => {
            setPinFor(null)
            router.refresh()
          }}
        />
      )}

      {creating && (
        <CreateDialog
          machines={machines}
          enabled={canCreateSignIns}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function EditDialog({
  user,
  machines,
  onClose,
  onSaved,
}: {
  user: UserRow
  machines: { id: string; code: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = React.useState(user)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await updateProfile({
      id: values.id,
      full_name: values.full_name,
      employee_no: values.employee_no,
      role: values.role,
      default_machine_id: values.default_machine_id,
      is_active: values.is_active,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not saved.")
    onSaved()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Edit ${user.full_name}`}
      description="Role decides both the shell they land in and what the database lets them write."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

        <Field label="Full name" htmlFor="u-name" required>
          <Input
            id="u-name"
            value={values.full_name}
            onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))}
          />
        </Field>

        <Field label="Employee number" htmlFor="u-emp">
          <Input
            id="u-emp"
            value={values.employee_no ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, employee_no: e.target.value }))}
          />
        </Field>

        <Field label="Role" htmlFor="u-role" required>
          <Select
            id="u-role"
            value={values.role}
            onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </Select>
        </Field>

        <Field
          label="Machine"
          htmlFor="u-machine"
          hint={
            values.role === "operator"
              ? "Required. An operator can only write to runs on this machine."
              : "Only operators need a machine."
          }
        >
          <Select
            id="u-machine"
            value={values.default_machine_id ?? ""}
            onChange={(e) =>
              setValues((v) => ({ ...v, default_machine_id: e.target.value || null }))
            }
          >
            <option value="">Not assigned</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.code}</option>
            ))}
          </Select>
        </Field>

        <Field label="Account active" htmlFor="u-active">
          <div className="flex h-[var(--tap)] items-center gap-3">
            <Switch
              id="u-active"
              checked={values.is_active}
              onCheckedChange={(c) => setValues((v) => ({ ...v, is_active: c }))}
            />
            <span className="text-ink-600">
              {values.is_active ? "Can sign in" : "Signed out and blocked"}
            </span>
          </div>
        </Field>
      </div>
    </Dialog>
  )
}

function PinDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow
  onClose: () => void
  onSaved: () => void
}) {
  const [pin, setPin] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = async () => {
    if (pin !== confirm) return setError("The two PINs do not match. Type them again.")
    setBusy(true)
    setError(null)
    const res = await setOperatorPin(user.id, pin)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not saved.")
    onSaved()
  }

  const clear = async () => {
    setBusy(true)
    const res = await clearOperatorPin(user.id)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not cleared.")
    onSaved()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`PIN for ${user.full_name}`}
      description="Attribution on the tablet is by PIN, not by password. Give it to the operator in person."
      footer={
        <>
          {user.has_pin && (
            <Button variant="ghost" onClick={clear} disabled={busy}>
              Remove PIN
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || pin.length !== 4}>
            {busy ? "Saving…" : "Save PIN"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="critical" title="Not saved">{error}</Alert>}

        <Field label="New PIN" htmlFor="pin1" required hint="Exactly 4 digits.">
          <Input
            id="pin1"
            type="password"
            inputMode="numeric"
            maxLength={4}
            numeric
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </Field>

        <Field label="Confirm PIN" htmlFor="pin2" required>
          <Input
            id="pin2"
            type="password"
            inputMode="numeric"
            maxLength={4}
            numeric
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </Field>
      </div>
    </Dialog>
  )
}

function CreateDialog({
  machines,
  enabled,
  onClose,
  onSaved,
}: {
  machines: { id: string; code: string }[]
  enabled: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = React.useState({
    email: "",
    password: "",
    full_name: "",
    role: "viewer",
    employee_no: "",
    default_machine_id: "",
  })
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await createUser(values)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? "Not created.")
    onSaved()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add person"
      description="Creates the sign-in and sets their role in one step."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy || !enabled}>
            {busy ? "Creating…" : "Create sign-in"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Says what to do, not what the server runs on. Naming the provider
            and the exact variable told an admin nothing useful and told
            everyone else how the deployment is put together. */}
        {!enabled && (
          <Alert tone="warn" title="Creating sign-ins is not switched on">
            This server cannot create sign-ins yet. Ask whoever set the system
            up to enable it. In the meantime, add the person here without a
            sign-in and set their role — they can be given access later.
          </Alert>
        )}
        {error && <Alert tone="critical" title="Not created">{error}</Alert>}

        <Field label="Full name" htmlFor="c-name" required>
          <Input id="c-name" value={values.full_name}
            onChange={(e) => setValues((v) => ({ ...v, full_name: e.target.value }))} />
        </Field>

        <Field label="Email" htmlFor="c-email" required
               hint="Machine accounts use an address nobody reads, e.g. g01@yourdomain.local.">
          <Input id="c-email" type="email" value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </Field>

        <Field label="Password" htmlFor="c-pass" required hint="At least 8 characters.">
          <Input id="c-pass" type="password" value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} />
        </Field>

        <Field label="Role" htmlFor="c-role" required>
          <Select id="c-role" value={values.role}
            onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </Select>
        </Field>

        <Field label="Employee number" htmlFor="c-emp">
          <Input id="c-emp" value={values.employee_no}
            onChange={(e) => setValues((v) => ({ ...v, employee_no: e.target.value }))} />
        </Field>

        <Field label="Machine" htmlFor="c-machine"
               hint="Set this for operators and for machine tablet accounts.">
          <Select id="c-machine" value={values.default_machine_id}
            onChange={(e) => setValues((v) => ({ ...v, default_machine_id: e.target.value }))}>
            <option value="">Not assigned</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.code}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}
