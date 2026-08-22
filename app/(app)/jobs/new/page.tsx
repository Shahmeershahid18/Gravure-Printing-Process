import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { NewJobForm } from "./new-job-form"

export const metadata = { title: "Create job file" }

export default async function NewJobPage() {
  await requireRole("admin", "planner")
  const supabase = await createClient()

  const [{ data: customers }, { data: machines }] = await Promise.all([
    supabase.from("customers").select("id, name, code").order("name"),
    supabase.from("machines").select("id, code").eq("is_active", true).order("code"),
  ])

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Job files", href: "/jobs" }, { label: "New" }]}
        title="Create job file"
        subtitle="The job file number is issued by the system. Rev-00 is created with it, because nothing can run until a revision exists."
      />
      <NewJobForm customers={customers ?? []} machines={machines ?? []} />
    </>
  )
}
