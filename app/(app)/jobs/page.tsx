import { createClient } from '@/utils/supabase/server'
import { DataTable } from '@/components/ui/data-table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
        <Button asChild>
          <Link href="/jobs/new">Create Job File</Link>
        </Button>
      </div>

      <DataTable
        columns={[
          {
            header: 'Job File',
            accessorKey: 'job_file_no',
            cell: (row) => (
              <Link href={`/jobs/${row.id}`} className="font-medium hover:underline text-primary">
                {row.job_file_no}
              </Link>
            )
          },
          { header: 'Job No', accessorKey: 'job_no' },
          { header: 'Customer', accessorKey: 'customer' },
          { header: 'Product', accessorKey: 'product_name' },
          { header: 'Structure', accessorKey: 'structure' },
          { header: 'Current Rev', accessorKey: 'revision' },
          { header: 'Shade Card', accessorKey: 'shade_card' },
          {
            header: 'Status',
            accessorKey: 'status',
            cell: (row) => (
              <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                {row.status}
              </Badge>
            )
          }
        ]}
        data={formattedJobs}
        searchKey="product_name"
      />
    </div>
  )
}
