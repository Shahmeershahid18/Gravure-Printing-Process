import { notFound } from "next/navigation"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { ArtworkTimeline } from "./artwork-timeline"

export const metadata = { title: "Artwork revisions" }

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ jobFileId: string }>
}) {
  const { jobFileId } = await params
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: job } = await supabase
    .from("job_files")
    .select("id, job_file_no, job_no, product_name, no_of_colours")
    .eq("id", jobFileId)
    .maybeSingle()

  if (!job) notFound()

  const [{ data: revisions }, { data: mappings }, { data: cylinders }] = await Promise.all([
    supabase
      .from("artwork_revisions")
      .select("*")
      .eq("job_file_id", jobFileId)
      .order("revision_no", { ascending: false }),
    supabase
      .from("artwork_revision_cylinders")
      .select("id, revision_id, station_no, cylinder_id, action, remarks"),
    supabase
      .from("cylinders")
      .select("id, cylinder_no, colour_name, status")
      .order("cylinder_no"),
  ])

  const revIds = new Set((revisions ?? []).map((r) => r.id))
  const scoped = (mappings ?? []).filter((m) => revIds.has(m.revision_id))

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Job files", href: "/jobs" },
          { label: job.job_file_no, href: `/jobs/${jobFileId}` },
          { label: "Artwork" },
        ]}
        title="Artwork revisions"
        subtitle="A revision is never deleted. Past runs keep pointing at the revision that was on the machine, which is how a shade complaint six months later gets an exact answer."
      />
      <ArtworkTimeline
        jobFileId={jobFileId}
        colourCount={job.no_of_colours}
        revisions={revisions ?? []}
        mappings={scoped}
        cylinders={cylinders ?? []}
        canEdit={can.editJobs(profile.role)}
      />
    </>
  )
}
