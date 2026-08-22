import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Colour names" }

export default async function ColoursPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()
  const { data } = await supabase.from("colour_names").select("*").order("sort_order")

  const rows = (data ?? []).map((r) => ({ ...r, id: r.name as string }))

  return (
    <>
      <SectionHeading>Colour names</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Station colours come from this list and are never free text. That is
        what stops one colour being recorded six ways.
      </p>
      <MasterSection
        table="colour_names"
        rows={rows}
        canEdit={can.editMasters(profile.role)}
      />
    </>
  )
}
