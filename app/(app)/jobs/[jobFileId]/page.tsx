import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from '@/components/job/JobHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Job360Page({ params }: { params: { jobFileId: string } }) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('job_files')
    .select(`
      *,
      customers (name),
      artwork_revisions (
        id,
        revision_no,
        revision_label,
        is_current,
        shade_card_no
      )
    `)
    .eq('id', params.jobFileId)
    .single()

  if (!job) return notFound()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <JobHeader job={job} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Run history will be populated in Phase 4.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8 Colour Stations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Station details will be populated in Phase 4.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cylinder Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Cylinder status will be populated in Phase 3.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Problem History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Observations will be populated in Phase 5.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
