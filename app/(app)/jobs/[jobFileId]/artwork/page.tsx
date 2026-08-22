import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from '@/components/job/JobHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArtworkRevisionForm } from './client'

export default async function ArtworkTimelinePage({ params }: { params: { jobFileId: string } }) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('job_files')
    .select(`
      *,
      customers (name),
      artwork_revisions (
        *
      )
    `)
    .eq('id', params.jobFileId)
    .single()

  if (!job) return notFound()

  // Sort revisions by revision_no ascending
  const sortedRevisions = [...(job.artwork_revisions || [])].sort((a, b) => a.revision_no - b.revision_no)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <JobHeader job={job} />

      <div className="flex gap-6 items-start">
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Artwork History</h2>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {sortedRevisions.map((rev) => (
              <div key={rev.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  {rev.revision_no}
                </div>
                
                <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ${rev.is_current ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {rev.revision_label}
                        {rev.is_current && <Badge className="ml-2">Current</Badge>}
                      </CardTitle>
                      <time className="text-sm font-medium text-muted-foreground">{rev.revision_date}</time>
                    </div>
                    {rev.shade_card_no && <CardDescription>Shade Card: {rev.shade_card_no}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{rev.change_summary}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[350px] shrink-0 sticky top-40">
          <ArtworkRevisionForm jobFileId={job.id} />
        </div>
      </div>
    </div>
  )
}
