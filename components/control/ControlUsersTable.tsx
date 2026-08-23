"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchIcon, BanIcon, RotateCcwIcon, Trash2Icon, ShieldIcon } from "lucide-react"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { Dialog } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Segmented } from "@/components/ui/segmented"
import { ROLES, roleLabel, type Role } from "@/lib/roles"
import { dateTime, num } from "@/lib/format"
import { relativeTime } from "@/lib/notifications"
import { cn } from "@/lib/utils"
import {
  setSuperadmin,
  setUser,
  suspendUser,
  deleteUser,
  type ControlUser,
} from "@/lib/actions/control"

type Filter = "all" | "active" | "suspended"

/**
 * The console's account list.
 *
 * Deliberately a different table from Settings → Users rather than the same
 * component with an extra prop. That screen is an admin tool with guard rails
 * written for an admin -- "you cannot remove your own admin role" -- and this
 * one has different rails for a different reader. Sharing it would have meant
 * a growing set of conditionals inside, each a place to accidentally show an
 * admin something.
 */
export function ControlUsersTable({
  users,
  currentUserId,
}: {
  users: ControlUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [editing, setEditing] = React.useState<ControlUser | null>(null)
  const [removing, setRemoving] = React.useState<ControlUser | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) =>
        filter === "all" ? true : filter === "active" ? u.is_active : !u.is_active
      )
      .filter((u) =>
        !q
          ? true
          : [u.full_name, u.email, u.employee_no, u.role, u.machine_code].some((v) =>
              String(v ?? "").toLowerCase().includes(q)
            )
      )
  }, [users, query, filter])

  const after = (message?: string) => {
    setEditing(null)
    setRemoving(null)
    if (message) setNotice(message)
    router.refresh()
  }

  const save = async (values: { role?: Role; is_active?: boolean }) => {
    if (!editing) return
    setBusy(true)
    setError(null)
    const result = await setUser({ id: editing.id, ...values })
    setBusy(false)
    if (!result.ok) return setError(result.error ?? "That change was not saved.")
    after()
  }

  const toggleHidden = async (user: ControlUser) => {
    setBusy(true)
    setError(null)
    const result = await setSuperadmin(user.id, !user.is_superadmin)
    setBusy(false)
    if (!result.ok) return setError(result.error ?? "That change was not saved.")
    after()
  }

  return (
    <>
      {notice && (
        <Alert tone="ok" className="mb-4">
          {notice}
        </Alert>
      )}
      {error && !editing && !removing && (
        <Alert tone="critical" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, employee number or machine…"
            aria-label="Filter accounts"
            className="h-[var(--tap-sm)] w-72 pl-8"
          />
        </div>

        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${users.length})` },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
        />

        <span className="ml-auto text-[length:calc(var(--base)*0.82)] text-steel-400">
          {rows.length} shown
        </span>
      </div>

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
            <TR key={u.id} className={cn(!u.is_active && "opacity-70")}>
              <TD>
                <Link
                  href={`/control/users/${u.id}`}
                  className="font-semibold text-ink-900 hover:underline"
                >
                  {u.full_name}
                </Link>
                <div className="text-[length:calc(var(--base)*0.76)] text-steel-400">
                  {u.employee_no ?? "No employee number"}
                  {u.machine_code ? ` · ${u.machine_code}` : ""}
                  {u.has_pin ? " · PIN set" : ""}
                </div>
              </TD>

              <TD>
                <span className="text-[length:calc(var(--base)*0.84)] text-ink-600">
                  {u.email ?? "—"}
                </span>
              </TD>

              <TD>
                <span className="text-[length:calc(var(--base)*0.86)]">
                  {roleLabel(u.role)}
                </span>
              </TD>

              <TD>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={u.is_active ? "ok" : "critical"}>
                    {u.is_active ? "Active" : "Suspended"}
                  </Badge>
                  {u.is_superadmin && <Badge tone="info">Hidden</Badge>}
                  {u.id === currentUserId && <Badge tone="neutral">You</Badge>}
                </div>
              </TD>

              <TD>
                <span
                  title={dateTime(u.last_sign_in_at)}
                  className="text-[length:calc(var(--base)*0.84)] text-ink-600"
                >
                  {u.last_sign_in_at ? relativeTime(u.last_sign_in_at) : "Never"}
                </span>
              </TD>

              <TD numeric>
                <span className="text-[length:calc(var(--base)*0.84)]">
                  {num(u.event_count)}
                </span>
              </TD>

              <TD>
                <div className="flex justify-end gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                    Manage
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {/* ---------------------------------------------------------------- */}
      {/* Manage                                                            */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={editing !== null}
        onClose={() => {
          setEditing(null)
          setError(null)
        }}
        title={editing?.full_name ?? ""}
        description={editing?.email ?? undefined}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null)
              setError(null)
            }}
            disabled={busy}
          >
            Done
          </Button>
        }
      >
        {editing && (
          <div className="space-y-4">
            {error && <Alert tone="critical">{error}</Alert>}

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
                <div className="flex items-center gap-1.5 text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
                  <ShieldIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  Hidden super administrator
                </div>
                <p className="mt-0.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
                  Grants everything the database can grant and removes the
                  account from every other person&apos;s view — the users list,
                  the operator picker and the audit trail. Nobody is told.
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

            {editing.id !== currentUserId && (
              <div className="space-y-3 border-t border-steel-200 pt-4">
                <div>
                  <div className="text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
                    Access
                  </div>
                  <p className="mt-0.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
                    Suspending takes effect on their next request, not their next
                    sign-in — the middleware re-reads it every time. It also
                    clears any operator PIN.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {editing.is_active ? (
                    <SuspendButton user={editing} onDone={after} setBusy={setBusy} setError={setError} />
                  ) : (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true)
                        const r = await suspendUser(editing.id, undefined, false)
                        setBusy(false)
                        if (!r.ok) return setError(r.error ?? "Not changed.")
                        after(`${editing.full_name} can sign in again.`)
                      }}
                    >
                      <RotateCcwIcon aria-hidden="true" className="h-4 w-4" />
                      Restore access
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    disabled={busy || editing.is_superadmin}
                    onClick={() => {
                      setRemoving(editing)
                      setEditing(null)
                    }}
                    className="text-signal-critical hover:text-signal-critical"
                  >
                    <Trash2Icon aria-hidden="true" className="h-4 w-4" />
                    Delete permanently
                  </Button>
                </div>

                {editing.is_superadmin && (
                  <p className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                    Turn off the hidden role before deleting this account.
                  </p>
                )}
              </div>
            )}

            <Link
              href={`/control/users/${editing.id}`}
              className="block border-t border-steel-200 pt-4 text-[length:calc(var(--base)*0.86)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              See everything this account has done
            </Link>
          </div>
        )}
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Delete                                                            */}
      {/* ---------------------------------------------------------------- */}
      <DeleteDialog
        user={removing}
        onClose={() => {
          setRemoving(null)
          setError(null)
        }}
        onDone={after}
      />
    </>
  )
}

/**
 * Suspension takes a reason.
 *
 * Not validation theatre: the reason is the only part of an incident that is
 * not reconstructible from the log afterwards. Six months later the activity
 * trail still shows what they did; only this says why somebody decided it
 * mattered.
 */
function SuspendButton({
  user,
  onDone,
  setBusy,
  setError,
}: {
  user: ControlUser
  onDone: (message?: string) => void
  setBusy: (v: boolean) => void
  setError: (v: string | null) => void
}) {
  const [asking, setAsking] = React.useState(false)
  const [reason, setReason] = React.useState("")

  if (!asking) {
    return (
      <Button variant="outline" onClick={() => setAsking(true)}>
        <BanIcon aria-hidden="true" className="h-4 w-4" />
        Suspend access
      </Button>
    )
  }

  return (
    <div className="w-full space-y-2">
      <Textarea
        value={reason}
        rows={2}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why — e.g. repeated failed sign-ins from an unknown address"
        aria-label="Reason for suspension"
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setAsking(false)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            setBusy(true)
            setError(null)
            const r = await suspendUser(user.id, reason)
            setBusy(false)
            if (!r.ok) return setError(r.error ?? "Not changed.")
            onDone(`${user.full_name} is suspended and can no longer act.`)
          }}
        >
          Suspend {user.full_name}
        </Button>
      </div>
    </div>
  )
}

/**
 * Deleting says what it costs before it does it.
 *
 * Eleven columns reference profiles(id) with no ON DELETE action, so removing
 * a sign-in means detaching every one of them -- and detaching them is exactly
 * what destroys "who ran this job". Naming that here, and requiring the person
 * to type the account's name, is the difference between a considered removal
 * and a mis-click that quietly rewrites production history.
 */
function DeleteDialog({
  user,
  onClose,
  onDone,
}: {
  user: ControlUser | null
  onClose: () => void
  onDone: (message?: string) => void
}) {
  const [typed, setTyped] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setTyped("")
    setError(null)
  }, [user])

  const confirmed = user !== null && typed.trim() === user.full_name

  return (
    <Dialog
      open={user !== null}
      onClose={onClose}
      title="Delete permanently"
      description={user ? `${user.full_name} — ${user.email ?? "no email"}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!confirmed || busy}
            onClick={async () => {
              if (!user) return
              setBusy(true)
              setError(null)
              const r = await deleteUser(user.id)
              setBusy(false)
              if (!r.ok) return setError(r.error ?? "That account was not deleted.")

              const detached = Object.values(r.detached ?? {}).reduce((a, b) => a + b, 0)
              onDone(
                `${r.name} has been deleted. ${num(detached)} record${
                  detached === 1 ? "" : "s"
                } were detached from them and kept.`
              )
            }}
          >
            {busy ? "Deleting…" : "Delete this account"}
          </Button>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          {error && <Alert tone="critical">{error}</Alert>}

          <Alert tone="warn" title="Suspending is usually the right move instead.">
            A suspicious account is a live incident, and everything that makes it
            suspicious is evidence. Suspending stops them acting on their next
            request and keeps all of it. This does not.
          </Alert>

          <div>
            <div className="mb-1.5 text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900">
              What this destroys
            </div>
            <ul className="space-y-1 text-[length:calc(var(--base)*0.84)] text-ink-600">
              <li>
                Their name comes off every run they operated or supervised, every
                job file and artwork revision they created, every issue they
                raised and every cylinder event they performed. The records stay;
                the attribution does not.
              </li>
              <li>
                Their entries in the change history lose their author, so
                &ldquo;who changed this&rdquo; becomes unanswerable for those rows.
              </li>
              <li>
                Their sign-in is removed. They cannot be restored, and a new
                account with the same email is a different person to this system.
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-1.5 text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900">
              What survives
            </div>
            <p className="text-[length:calc(var(--base)*0.84)] text-ink-600">
              Their activity trail. It is written with no foreign key precisely
              so that it outlives the account, and a tombstone naming them, their
              email and their role is recorded before anything is detached — so
              the log still reads as a sentence.
            </p>
          </div>

          <div className="border-t border-steel-200 pt-4">
            <label
              htmlFor="confirm-name"
              className="mb-1 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900"
            >
              Type <span className="font-mono">{user.full_name}</span> to confirm
            </label>
            <Input
              id="confirm-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              placeholder={user.full_name}
            />
          </div>
        </div>
      )}
    </Dialog>
  )
}
