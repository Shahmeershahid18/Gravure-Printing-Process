import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function CylinderDetailPage({ params }: { params: { cylinderId: string } }) {
  const supabase = await createClient()

  const { data: cylinder } = await supabase
    .from('v_cylinder_ledger')
    .select(`
      *,
      customers (name),
      suppliers (name),
      cylinder_events (
        id,
        event_type,
        event_date,
        meters_at_event,
        description,
        cost,
        currency,
        suppliers (name)
      )
    `)
    .eq('id', params.cylinderId)
    .single()

  if (!cylinder) return notFound()

  const wear = cylinder.wear_percentage || 0
  let color = 'bg-emerald-500'
  if (wear > 80) color = 'bg-destructive'
  else if (wear > 60) color = 'bg-amber-500'

  const events = [...(cylinder.cylinder_events || [])].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const { data: runHistory } = await supabase
    .from('v_cylinder_run_history')
    .select('*')
    .eq('cylinder_id', params.cylinderId)
    .order('run_date', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header Info */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-4">
          {cylinder.cylinder_no}
          <span className="text-muted-foreground font-normal">·</span>
          {cylinder.colour_name}
          <span className="text-muted-foreground font-normal">·</span>
          <span className="capitalize text-xl font-normal">
            {cylinder.ownership} {cylinder.customers ? `(${cylinder.customers.name})` : ''}
          </span>
        </h1>
        
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Engraved {cylinder.engraving_date}</span>
          <span>·</span>
          <span>{cylinder.circumference_mm} mm circ</span>
          <span>·</span>
          <span>{cylinder.screen_lpi} LPI</span>
          <span>·</span>
          <span>{cylinder.stylus_angle}° stylus</span>
        </div>

        <div className="text-sm">
          Life rule: max {cylinder.life_limit?.toLocaleString()} m
        </div>

        {/* Big Wear Bar */}
        <div className="pt-2">
          <div className="w-full flex items-center gap-4 mb-2">
            <div className="flex-1 h-6 bg-slate-200 overflow-hidden relative">
              <div 
                className={`h-full ${color}`} 
                style={{ width: `${Math.min(wear, 100)}%` }} 
              />
            </div>
            <div className="text-lg font-mono font-medium text-right shrink-0 w-[240px]">
              {cylinder.current_meters?.toLocaleString()} / {cylinder.life_limit?.toLocaleString()} m
            </div>
            <div className="text-lg font-mono font-bold shrink-0 w-16 text-right">
              {Math.round(wear)}%
            </div>
          </div>
          <div className="flex gap-4 text-sm mt-3">
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={cylinder.status === 'in_store' ? 'outline' : 'secondary'}>
                {cylinder.status.replace('_', ' ')}
              </Badge>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Condition:</span>
              <span className="capitalize font-medium">{cylinder.condition}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Running History */}
        <Card>
          <CardHeader>
            <CardTitle>Running History</CardTitle>
            <CardDescription>Records of jobs run with this cylinder.</CardDescription>
          </CardHeader>
          <CardContent>
            {!runHistory || runHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No run history found.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-bold text-muted-foreground border-b pb-2">
                  <div className="col-span-2">Job File</div>
                  <div className="col-span-1">Mc</div>
                  <div className="col-span-1">Run</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2 text-right">This Run</div>
                  <div className="col-span-2 text-right">Cumulative</div>
                  <div className="col-span-2">Note</div>
                </div>
                {runHistory.map((rh: any) => (
                  <div key={`${rh.run_id}`} className="grid grid-cols-12 gap-4 text-sm border-b pb-2 last:border-0">
                    <div className="col-span-2 font-medium">{rh.job_file_no}</div>
                    <div className="col-span-1 text-muted-foreground">{rh.machine_code}</div>
                    <div className="col-span-1 text-muted-foreground">{rh.run_no}</div>
                    <div className="col-span-2 text-muted-foreground">{rh.run_date}</div>
                    <div className="col-span-2 text-right">{rh.this_run_meters?.toLocaleString() || 0} m</div>
                    <div className="col-span-2 text-right font-medium">{rh.cumulative_meters?.toLocaleString()} m</div>
                    <div className="col-span-2 text-muted-foreground truncate" title={rh.observation}>{rh.observation}</div>
                  </div>
                ))}
                
                <div className="grid grid-cols-12 gap-4 text-sm border-t pt-2 text-muted-foreground">
                  <div className="col-span-6 text-right font-medium">Opening reading at import</div>
                  <div className="col-span-2"></div>
                  <div className="col-span-2 text-right">{cylinder.opening_meters?.toLocaleString()} m</div>
                  <div className="col-span-2"></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Events */}
        <Card>
          <CardHeader>
            <CardTitle>Service Events</CardTitle>
            <CardDescription>Maintenance, plating, and movement history.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events recorded.</p>
            ) : (
              <div className="space-y-4">
                {events.map(ev => (
                  <div key={ev.id} className="grid grid-cols-12 gap-4 text-sm border-b pb-4 last:border-0">
                    <div className="col-span-2 text-muted-foreground font-mono">{ev.event_date}</div>
                    <div className="col-span-2 font-medium capitalize">{ev.event_type.replace(/_/g, ' ')}</div>
                    <div className="col-span-3 text-muted-foreground">
                      at {ev.meters_at_event?.toLocaleString() || 0} m
                    </div>
                    <div className="col-span-3 truncate">
                      {ev.suppliers?.name || 'In house'}
                    </div>
                    <div className="col-span-2 text-right">
                      {ev.cost ? `${ev.currency} ${ev.cost.toLocaleString()}` : ''}
                    </div>
                    {ev.description && (
                      <div className="col-span-12 text-muted-foreground mt-1">
                        ↳ {ev.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
