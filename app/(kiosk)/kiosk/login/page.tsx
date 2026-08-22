import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { OperatorPicker, type OperatorTile } from "@/components/kiosk/OperatorPicker"

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

  return (
    <OperatorPicker operators={operators} machineCode={profile.machine_code} />
  )
}
