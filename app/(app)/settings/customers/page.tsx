import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Customers" }

export default async function CustomersPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()
  const { data } = await supabase.from("customers").select("*").order("name")

  return (
    <>
      <SectionHeading>Customers</SectionHeading>
      <MasterSection
        table="customers"
        rows={data ?? []}
        canEdit={can.editMasters(profile.role)}
      />
    </>
  )
}
