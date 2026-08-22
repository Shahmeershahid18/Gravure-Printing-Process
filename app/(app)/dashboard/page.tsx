import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Settings2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Fetch runs this week (mocking last 7 days since seeded data might be older, we'll fetch last 20 runs)
  const { data: runs } = await supabase
    .from('v_run_summary')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(20)

  const recentRuns = runs || []
  const avgWaste = recentRuns.length > 0 
    ? (recentRuns.reduce((acc, r) => acc + (r.waste_pct_m || 0), 0) / recentRuns.length).toFixed(1)
    : 0

  // 2. Fetch Cylinders Nearing End of Life
  const { data: cylinders } = await supabase
    .from('v_cylinder_ledger')
    .select('id, cylinder_no, colour_name, wear_percentage, current_meters, life_limit')
    .gte('wear_percentage', 80)
    .order('wear_percentage', { ascending: false })

  const dyingCylinders = cylinders || []

  // 3. Fetch Open Next Run Notes
  const { data: openNotes } = await supabase
    .from('observations')
    .select('*, job_files(job_file_no), machines(code)')
    .not('next_run_note', 'is', null)
    .is('next_run_note_cleared_at', null)
    .order('observed_at', { ascending: false })

  const activeNotes = openNotes || []

  // 4. Fetch Issue Pareto (group in memory for MVP)
  const { data: allObservations } = await supabase
    .from('observations')
    .select('area')

  const areaCounts = (allObservations || []).reduce((acc: any, obs) => {
    acc[obs.area] = (acc[obs.area] || 0) + 1
    return acc
  }, {})

  const pareto = Object.entries(areaCounts)
    .map(([area, count]) => ({ area, count: count as number }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-8">Intelligence Dashboard</h1>

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Runs (Last 20)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{recentRuns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Waste (Recent)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${Number(avgWaste) > 4 ? 'text-destructive' : 'text-emerald-500'}`}>
              {avgWaste}%
            </div>
          </CardContent>
        </Card>

        <Card className={activeNotes.length > 0 ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Open Action Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{activeNotes.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Notes & Cylinders */}
        <div className="lg:col-span-8 space-y-6">
          
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> 
                Must Check Before Next Run
              </CardTitle>
              <CardDescription>Observations flagged for supervisor or operator review.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active notes. All clear.</p>
              ) : (
                <div className="space-y-4">
                  {activeNotes.map((note: any) => (
                    <div key={note.id} className="p-4 rounded-lg border border-border bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/jobs/${note.job_file_id}/issues`} className="font-bold hover:underline">
                          {note.job_files?.job_file_no}
                        </Link>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Machine {note.machines?.code}
                        </span>
                      </div>
                      <p className="font-medium">{note.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 bg-background p-2 rounded border">
                        {note.next_run_note}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" /> 
                Cylinders Nearing End of Life
              </CardTitle>
              <CardDescription>Cylinders above 80% wear limit requiring replacement planning.</CardDescription>
            </CardHeader>
            <CardContent>
              {dyingCylinders.length === 0 ? (
                <p className="text-sm text-muted-foreground">All cylinders are within healthy limits.</p>
              ) : (
                <div className="space-y-4">
                  {dyingCylinders.map((cyl: any) => {
                    const isCritical = cyl.wear_percentage >= 95
                    return (
                      <div key={cyl.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <Link href={`/cylinders/${cyl.id}`} className="font-bold hover:underline">
                            {cyl.cylinder_no}
                          </Link>
                          <div className="text-sm text-muted-foreground">{cyl.colour_name}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={isCritical ? 'destructive' : 'secondary'} className={!isCritical ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}>
                            {Math.round(cyl.wear_percentage)}% Worn
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {cyl.current_meters?.toLocaleString()} / {cyl.life_limit?.toLocaleString()} m
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: Pareto & Trends */}
        <div className="lg:col-span-4 space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Issue Pareto</CardTitle>
              <CardDescription>Observations by area</CardDescription>
            </CardHeader>
            <CardContent>
              {pareto.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issues recorded.</p>
              ) : (
                <div className="space-y-4">
                  {pareto.map((item, i) => {
                    const max = pareto[0].count
                    const pct = (item.count / max) * 100
                    return (
                      <div key={item.area}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{item.area.replace('_', ' ')}</span>
                          <span className="font-bold">{item.count}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
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
              <CardTitle>Recent Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRuns.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <div className="font-medium">Run {r.run_no}</div>
                      <div className="text-xs text-muted-foreground">{r.machine_code}</div>
                    </div>
                    <div className={`font-bold ${r.waste_pct_m > 5 ? 'text-destructive' : ''}`}>
                      {r.waste_pct_m}% waste
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
