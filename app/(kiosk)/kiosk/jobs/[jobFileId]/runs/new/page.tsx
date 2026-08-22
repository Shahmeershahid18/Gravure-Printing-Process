import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { startRun } from '@/lib/actions/runs'
import { AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default async function PreRunBriefingPage({ params }: { params: { jobFileId: string } }) {
  const supabase = await createClient()

  // Ensure operator is logged in
  const opCookie = cookies().get('operator_id')?.value
  if (!opCookie) {
    redirect('/login')
  }

  // Get machine ID (mocked for now, assuming tablet is bound to G-01)
  const { data: machine } = await supabase.from('machines').select('id, code').eq('code', 'G-01').single()
  if (!machine) return <div>Machine G-01 not found</div>

  const { data: briefing, error } = await supabase.rpc('fn_pre_run_briefing', {
    p_job_file_id: params.jobFileId,
    p_machine_id: machine.id
  })

  if (error || !briefing) {
    return <div className="p-8 text-destructive">Error loading briefing: {error?.message}</div>
  }

  const b = briefing as any

  return (
    <div className="p-[var(--gap)] space-y-[var(--gap)] pb-32">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pre-run Briefing</h1>
          <div className="text-xl text-muted-foreground mt-2">
            {b.job.job_file_no} · {b.job.job_no} · {b.job.customer}
          </div>
          <div className="text-lg text-muted-foreground">
            {b.job.product_name} · {b.job.structure}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Machine</div>
          <div className="text-3xl font-bold text-primary">{machine.code}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[var(--gap)]">
        {/* Left Column */}
        <div className="space-y-[var(--gap)]">
          
          {b.machine_change && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Machine Change Alert</AlertTitle>
              <AlertDescription>
                Last run was on {b.machine_change.previous_machine}. We are now on {b.machine_change.new_machine}.
                <br />
                {b.machine_change.warning}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Cylinder Alerts</CardTitle>
              <CardDescription>Cylinders over 80% wear or in poor condition</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {b.cylinder_alerts?.length === 0 ? (
                <div className="p-4 text-muted-foreground">All cylinders are in good condition.</div>
              ) : (
                <div className="divide-y">
                  {b.cylinder_alerts?.map((c: any, i: number) => (
                    <div key={i} className="p-4 flex justify-between items-center bg-red-50/50 dark:bg-red-950/20">
                      <div>
                        <div className="font-bold">Stn {c.station_no}: {c.cylinder_no}</div>
                        <div className="text-sm text-muted-foreground">{c.colour_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">{c.life_used_pct}% worn</div>
                        <div className="text-sm text-muted-foreground capitalize">{c.condition}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Open Notes from Previous Runs</CardTitle>
              <CardDescription>Issues operators flagged for the next run</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {b.open_next_run_notes?.length === 0 ? (
                <div className="p-4 text-muted-foreground">No open notes.</div>
              ) : (
                <div className="divide-y">
                  {b.open_next_run_notes?.map((n: any, i: number) => (
                    <div key={i} className="p-4 bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="font-bold mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {n.title}
                        <span className="text-xs font-normal text-muted-foreground uppercase ml-auto">
                          Run {n.from_run}
                        </span>
                      </div>
                      <div className="text-sm">{n.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column */}
        <div className="space-y-[var(--gap)]">
          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Best Run Reference</CardTitle>
              <CardDescription>Reference settings from the best historical run</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {b.best_run ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-500">
                        {b.best_run.waste_pct_m}%
                      </div>
                      <div className="text-sm text-muted-foreground">Historical best waste</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{b.best_run.avg_speed_mpm} m/min</div>
                      <div className="text-sm text-muted-foreground">Avg Speed</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground border-t pt-4">
                    Achieved on Run {b.best_run.run_no} ({b.best_run.run_date})
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No completed runs to benchmark.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle>Substrate Watchlist</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {b.substrate_watchlist?.length === 0 ? (
                <div className="p-4 text-muted-foreground">No substrate issues flagged.</div>
              ) : (
                <div className="divide-y">
                  {b.substrate_watchlist?.map((s: any, i: number) => (
                    <div key={i} className="p-4">
                      <div className="font-bold">{s.batch_no}</div>
                      <div className="text-sm text-muted-foreground">{s.supplier} ({s.material_type} {s.thickness_micron}µ)</div>
                      <div className="text-sm font-medium text-amber-600 mt-1">{s.issue_count} issues recorded</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-[var(--gap)] bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <form action={startRun}>
          <input type="hidden" name="jobFileId" value={params.jobFileId} />
          <input type="hidden" name="machineId" value={machine.id} />
          <input type="hidden" name="operatorId" value={opCookie} />
          <Button type="submit" size="lg" className="w-full h-20 text-2xl font-bold rounded-xl bg-primary hover:bg-primary/90 transition-transform active:scale-[0.98]">
            Acknowledge & Start Run
          </Button>
        </form>
      </div>
    </div>
  )
}
