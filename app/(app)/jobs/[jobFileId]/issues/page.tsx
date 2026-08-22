import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from '@/components/job/JobHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Image as ImageIcon } from 'lucide-react'
import { revalidatePath } from 'next/cache'

async function clearNextRunNote(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const jobFileId = formData.get('jobFileId') as string
  
  await supabase
    .from('observations')
    .update({ 
      next_run_note: null, 
      next_run_note_cleared_at: new Date().toISOString() 
    })
    .eq('id', id)
    
  revalidatePath(`/jobs/${jobFileId}/issues`)
}

export default async function JobIssuesPage({ params }: { params: { jobFileId: string } }) {
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

  const { data: observations } = await supabase
    .from('observations')
    .select(`
      *,
      runs(run_no),
      run_stations(station_no),
      machines(code)
    `)
    .eq('job_file_id', params.jobFileId)
    .order('observed_at', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <JobHeader job={job} />

      <Card>
        <CardHeader>
          <CardTitle>Problem History</CardTitle>
        </CardHeader>
        <CardContent>
          {!observations || observations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No observations recorded for this job.</p>
          ) : (
            <div className="space-y-6">
              {observations.map((obs: any) => (
                <div key={obs.id} className="border border-border rounded-lg p-6 bg-card flex flex-col gap-4 relative">
                  {obs.next_run_note && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      CHECK NEXT RUN
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="uppercase tracking-wider">
                          {obs.area.replace('_', ' ')}
                        </Badge>
                        <Badge variant={obs.severity === 'minor' ? 'secondary' : obs.severity === 'major' ? 'default' : 'destructive'} className="uppercase">
                          {obs.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-2">
                          {new Date(obs.observed_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{obs.title}</h3>
                      <p className="text-muted-foreground mt-1">{obs.description}</p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold text-muted-foreground uppercase tracking-widest">Run {obs.runs?.run_no}</div>
                      <div>Machine {obs.machines?.code}</div>
                      {obs.run_stations && <div>Station {obs.run_stations.station_no}</div>}
                    </div>
                  </div>

                  {obs.action_taken && (
                    <div className="bg-muted p-4 rounded-md text-sm border-l-2 border-primary">
                      <span className="font-bold">Action Taken: </span>
                      {obs.action_taken}
                    </div>
                  )}

                  <div className="flex justify-between items-end mt-2">
                    <div className="flex items-center gap-4 text-sm font-medium">
                      {obs.photo_path ? (
                        <a 
                          href={`/storage/v1/object/public/observation_photos/${obs.photo_path}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ImageIcon className="w-4 h-4" /> View Photo
                        </a>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> No Photo
                        </span>
                      )}
                    </div>

                    {obs.next_run_note && (
                      <form action={clearNextRunNote}>
                        <input type="hidden" name="id" value={obs.id} />
                        <input type="hidden" name="jobFileId" value={params.jobFileId} />
                        <button type="submit" className="text-sm font-bold flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                          <CheckCircle className="w-4 h-4" /> Clear Next Run Note
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
