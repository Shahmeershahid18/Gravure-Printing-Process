"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { Dialog } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ROLES, roleLabel, type Role } from "@/lib/roles"
import { dateTime, num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { setSuperadmin, setUser, type ControlUser } from "@/lib/actions/control"

/**
 * The console's account list.
 *
 * Deliberately a different table from Settings → Users rather than the same
 * component with an extra prop. That screen is an admin tool with guard rails
 * written for an admin -- "you cannot remove your own admin role" -- and this
 * one has different rails for a different reader. Sharing the component would
 * have meant a growing set of conditionals inside it, each of which is a place
 * to accidentally show an admin something.
 */
export function ControlUsersTable({ users }: { users: ControlUser[] }) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<ControlUser | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.full_name, u.email, u.employee_no, u.role, u.machine_code]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    )
  }, [users, query])

  const save = async (values: { role?: Role; is_active?: boolean; full_name?: string }) => {
    if (!editing) return
    setBusy(true)
    setError(null)
    const result = await setUser({ id: editing.id, ...values })
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? "That change was not saved.")
      return
    }
    setEditing(null)
    router.refresh()
  }

  const toggleHidden = async (user: ControlUser) => {
    setBusy(true)
    setError(null)
    const result = await setSuperadmin(user.id, !user.is_superadmin)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? "That change was not saved.")
      return
    }
    setEditing(null)
    router.refresh()
  }

  return (
    <>
      {error && (
        <Alert tone="critical" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, email, employee number or machine…"
          aria-label="Filter accounts"
          className="max-w-md"
        />
      </div>

      {/* Table draws its own hairline container, so no Card around it. */}
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Last sign-in</TH>
            <TH numeric>Events</TH>
            <TH>
              <span className="sr-only">Actions</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 && (
            <TR>
              <TD colSpan={7} className="py-6 text-center text-ink-600">
                No account matches that. Clear the filter to see all of them.
              </TD>
            </TR>
          )}
          {rows.map((u) => (
              <TR key={u.id}>
                <TD>
                  <Link
                    href={`/control/users/${u.id}`}
                    className="font-semibold text-ink-900 hover:underline"
                  >
                    {u.full_name}
                  </Link>
                  <div className="text-[length:calc(var(--base)*0.78)] text-steel-400">
                    {u.employee_no ?? "No employee number"}
                    {u.machine_code ? ` · ${u.machine_code}` : ""}
                    {u.has_pin ? " · PIN set" : ""}
                  </div>
                </TD>
                <TD>
                  <span className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                    {u.email ?? "—"}
                  </span>
                </TD>
                <TD>{roleLabel(u.role)}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={u.is_active ? "ok" : "neutral"}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </Badge>
                    {u.is_superadmin && <Badge tone="info">Hidden</Badge>}
                  </div>
                </TD>
                <TD>
                  <span
                    title={dateTime(u.last_sign_in_at)}
                    className="text-[length:calc(var(--base)*0.86)] text-ink-600"
                  >
                    {u.last_sign_in_at ? relativeTime(u.last_sign_in_at) : "Never"}
                  </span>
                </TD>
                <TD numeric>{num(u.event_count)}</TD>
                <TD>
                  <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                    Edit
                  </Button>
                </TD>
              </TR>
          ))}
        </TBody>
      </Table>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? editing.full_name : ""}
        description={editing?.email ?? undefined}
        footer={
          <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
            Done
          </Button>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="sa-role"
                className="mb-1 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900"
              >
                Role
              </label>
              <select
                id="sa-role"
                defaultValue={editing.role}
                disabled={busy}
                onChange={(e) => void save({ role: e.target.value as Role })}
                className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:var(--base)] text-ink-900"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[length:calc(var(--base)*0.8)] text-steel-400">
                Decides which shell they land in and what the database will let
                them write.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-steel-200 pt-4">
              <div className="min-w-0">
                <div className="text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
                  Can sign in
                </div>
                <p className="mt-0.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
                  Deactivating takes effect on their next request, not on their
                  next sign-in — the middleware checks it every time.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                  {editing.is_active ? "Yes" : "No"}
                </span>
                <Switch
                  checked={editing.is_active}
                  disabled={busy}
                  onCheckedChange={(v) => void save({ is_active: v })}
                  aria-label="Can sign in"
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 border-t border-steel-200 pt-4">
              <div className="min-w-0">
                <div className="text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
                  Hidden super administrator
                </div>
                <p className="mt-0.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
                  Grants everything the database can grant and removes the
                  account from every other person&apos;s view of the system —
                  the users list, the operator picker and the audit trail.
                  Nobody else is told this changed.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                  {editing.is_superadmin ? "On" : "Off"}
                </span>
                <Switch
                  checked={editing.is_superadmin}
                  disabled={busy}
                  onCheckedChange={() => void toggleHidden(editing)}
                  aria-label="Hidden super administrator"
                />
              </div>
            </div>

            {error && <Alert tone="critical">{error}</Alert>}

            <Link
              href={`/control/users/${editing.id}`}
              className="block text-[length:calc(var(--base)*0.86)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              See everything this account has done
            </Link>
          </div>
        )}
      </Dialog>
    </>
  )
}
