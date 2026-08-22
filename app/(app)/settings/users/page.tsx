import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { SectionHeading } from "@/components/ui/page-header"
import { UsersTable, type UserRow } from "./users-table"

export const metadata = { title: "Users and PINs" }

export default async function UsersPage() {
  const admin = await requireRole("admin")
  const supabase = await createClient()

  const [{ data: profiles }, { data: machines }] = await Promise.all([
    // has_pin is a generated column. pin_hash itself is not selectable by
    // anyone, admins included -- the privilege is revoked at column level in
    // 20260823140000_realtime_and_pin_hardening, so only the boolean can ever
    // reach a browser.
    supabase
      .from("profiles")
      .select("id, full_name, employee_no, role, default_machine_id, is_active, has_pin")
      .order("full_name"),
    supabase.from("machines").select("id, code").eq("is_active", true).order("code"),
  ])

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    employee_no: p.employee_no,
    role: p.role,
    default_machine_id: p.default_machine_id,
    is_active: p.is_active,
    has_pin: Boolean(p.has_pin),
  }))

  return (
    <>
      <SectionHeading>Users and PINs</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Role decides which shell a person lands in and what the database will
        let them write. Operators sign in at a machine tablet with a 4 digit
        PIN on top of that machine&apos;s account, so every operator needs both
        a machine and a PIN.
      </p>
      <UsersTable
        rows={rows}
        machines={machines ?? []}
        currentUserId={admin.id}
        canCreateSignIns={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}
      />
    </>
  )
}
