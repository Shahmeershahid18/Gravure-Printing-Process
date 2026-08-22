import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Machines" }

export default async function MachinesPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()
  const { data } = await supabase.from("machines").select("*").order("code")

  return (
    <>
      <SectionHeading>Machines</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Every machine has exactly 8 print stations. That is a hard constraint in
        the database, not a default.
      </p>
      <MasterSection
        table="machines"
        rows={data ?? []}
        canEdit={can.editMasters(profile.role)}
      />
    </>
  )
}
