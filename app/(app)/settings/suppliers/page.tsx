import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Suppliers" }

export default async function SuppliersPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()
  const { data } = await supabase.from("suppliers").select("*").order("name")

  return (
    <>
      <SectionHeading>Suppliers</SectionHeading>
      <MasterSection
        table="suppliers"
        rows={data ?? []}
        canEdit={can.editMasters(profile.role)}
      />
    </>
  )
}
