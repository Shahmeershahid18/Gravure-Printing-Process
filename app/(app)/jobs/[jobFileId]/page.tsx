import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from '@/components/job/JobHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

  const activeRev = job.artwork_revisions?.find((r: any) => r.is_current)

  // Fetch Run History
  const { data: runs } = await supabase
    .from('v_run_summary')
    .select('*')
    .eq('job_file_id', params.jobFileId)
    .order('run_no', { ascending: false })

  // Fetch Cylinders for active revision
  let cylinders: any[] = []
  if (activeRev) {
    const { data: revCyls } = await supabase
      .from('artwork_revision_cylinders')
      .select(`
        station_no,
        v_cylinder_ledger (
          id, cylinder_no, colour_name, current_meters, life_limit, wear_percentage, status, condition
        )
      `)
      .eq('artwork_revision_id', activeRev.id)
      .order('station_no', { ascending: true })
    
    cylinders = revCyls || []
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <JobHeader job={job} />

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {!runs || runs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {runs.map((r: any) => (
                <div key={r.id} className="border border-border rounded-lg p-4 min-w-[200px] shrink-0 bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold">Run {r.run_no}</div>
                    <Badge variant={r.result === 'ok' ? 'default' : r.result === 'ok_with_issues' ? 'secondary' : 'destructive'}>
                      {r.result.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{r.run_date}</div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Machine</div>
                      <div className="font-medium">{r.machine_code}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Speed</div>
                      <div className="font-medium">{r.avg_speed_mpm || '-'} m/m</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Waste</div>
                      <div className={`font-medium ${r.waste_pct_m > 5 ? 'text-destructive' : ''}`}>
                        {r.waste_pct_m ? `${r.waste_pct_m}%` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>8 Colour Stations (Current Rev)</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeRev ? (
              <p className="text-muted-foreground text-sm">No active artwork revision.</p>
            ) : cylinders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No cylinders assigned to this revision.</p>
            ) : (
              <div className="space-y-4">
                {cylinders.map((c: any) => {
                  const cyl = c.v_cylinder_ledger
                  if (!cyl) return null
                  return (
                    <div key={c.station_no} className="flex gap-4 items-center border-b pb-4 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                        {c.station_no}
                      </div>
                      <div>
                        <div className="font-bold">{cyl.cylinder_no}</div>
                        <div className="text-sm text-muted-foreground">{cyl.colour_name}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cylinder Wear Status</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeRev || cylinders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No cylinders to display.</p>
            ) : (
              <div className="space-y-4">
                {cylinders.map((c: any) => {
                  const cyl = c.v_cylinder_ledger
                  if (!cyl) return null
                  const wear = cyl.wear_percentage || 0
                  let color = 'bg-emerald-500'
                  if (wear > 80) color = 'bg-destructive'
                  else if (wear > 60) color = 'bg-amber-500'

                  return (
                    <div key={c.station_no} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cyl.cylinder_no} ({cyl.colour_name})</span>
                        <span className={wear > 80 ? 'text-destructive font-bold' : ''}>{Math.round(wear)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${Math.min(wear, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{cyl.current_meters?.toLocaleString()} m</span>
                        <span>{cyl.life_limit?.toLocaleString()} m</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
