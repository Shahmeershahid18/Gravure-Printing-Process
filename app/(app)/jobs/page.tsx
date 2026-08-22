import { createClient } from '@/utils/supabase/server'
import { JobsTable } from './jobs-table'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('job_files')
    .select(`
      *,
      customers (name),
      artwork_revisions (
        revision_label,
        is_current,
        shade_card_no
      )
    `)
    .order('created_at', { ascending: false })

  const formattedJobs = jobs?.map(job => {
    const activeRev = job.artwork_revisions?.find((r: any) => r.is_current)
    return {
      id: job.id,
      job_file_no: job.job_file_no,
      job_no: job.job_no,
      customer: job.customers?.name || 'Unknown',
      product_name: job.product_name,
      structure: job.structure,
      revision: activeRev?.revision_label || '-',
      shade_card: activeRev?.shade_card_no || '-',
      status: job.status,
    }
  }) || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Files</h1>
          <p className="text-muted-foreground mt-2">Manage customer jobs and artwork revisions.</p>
        </div>
        <Link href="/jobs/new" className={buttonVariants({ variant: "default" })}>
          Create Job File
        </Link>
      </div>

      <JobsTable data={formattedJobs} />
    </div>
  )
}
