import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { OperatorPicker, type OperatorTile } from "@/components/kiosk/OperatorPicker"
import { SignOutTablet } from "@/components/kiosk/SignOutTablet"

export const metadata = { title: "Sign in at the machine" }

export default async function KioskLoginPage() {
  const profile = await requireRole("operator")
  if (await getActiveOperator()) redirect("/kiosk")

  const supabase = await createClient()

  // Operators assigned to this machine first; unassigned operators are still
  // offered, because a relief hand covering another line still has to sign in.
  const { data } = await supabase
    .from("v_operator_directory")
    .select("id, full_name, employee_no, has_pin, default_machine_id, machine_code")
    .order("full_name")

  const all = (data ?? []) as (OperatorTile & { default_machine_id: string | null })[]
  const mine = profile.default_machine_id
    ? all.filter((o) => o.default_machine_id === profile.default_machine_id)
    : all
  const operators = mine.length > 0 ? mine : all

  // Signing the tablet out abandons anything still queued on this device, so
  // the confirmation says how many runs are still open on this machine.
  let unfinishedRuns = 0
  if (profile.default_machine_id) {
    const { count } = await supabase
      .from("runs")
      .select("id", { count: "exact", head: true })
      .eq("machine_id", profile.default_machine_id)
      .is("deleted_at", null)
      .in("status", ["planned", "setup", "running"])
    unfinishedRuns = count ?? 0
  }

  return (
    <div className="flex h-full flex-col gap-[var(--gap)]">
      <div className="flex-1">
        <OperatorPicker operators={operators} machineCode={profile.machine_code} />
      </div>

      {/* The way out of a tablet that is being retired or moved. Kept off the
          kiosk bar so it is never a neighbour of Lock. */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-[var(--gap)] border-t border-steel-200 pt-[var(--gap)]">
        <p className="text-[length:calc(var(--base)*0.8)] text-steel-400">
          This tablet stays signed in between shifts. The next operator only
          needs their PIN.
        </p>
        <SignOutTablet
          machineCode={profile.machine_code}
          unfinishedRuns={unfinishedRuns}
        />
      </div>
    </div>
  )
}
