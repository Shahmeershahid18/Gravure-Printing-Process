import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Issue templates" }

export default async function IssueTemplatesPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()
  const { data } = await supabase
    .from("issue_templates")
    .select("*")
    .order("area")
    .order("title")

  return (
    <>
      <SectionHeading>Issue templates</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        An operator picking “registration drift at high speed” from a list
        produces groupable data. An operator typing it produces six spellings
        and zero analytics.
      </p>
      <MasterSection
        table="issue_templates"
        rows={data ?? []}
        canEdit={can.editMasters(profile.role)}
      />
    </>
  )
}
