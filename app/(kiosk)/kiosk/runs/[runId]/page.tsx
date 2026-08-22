import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { RunGrid } from '@/components/kiosk/RunGrid'

export default async function RunPage({ params }: { params: { runId: string } }) {
  const supabase = await createClient()

  const { data: run } = await supabase
    .from('runs')
    .select(`
      *,
      job_files(job_no, job_file_no, product_name),
      machines(code)
    `)
    .eq('id', params.runId)
    .single()

  if (!run) return notFound()

  const { data: stations } = await supabase
    .from('run_stations')
    .select(`
      *,
      cylinders(cylinder_no, colour_name, ownership),
      ink_products(ink_code, colour_name)
    `)
    .eq('run_id', params.runId)
    .order('station_no', { ascending: true })

  const { data: process } = await supabase
    .from('run_process')
    .select('*')
    .eq('run_id', params.runId)
    .single()

  const { data: substrates } = await supabase
    .from('run_substrates')
    .select(`
      *,
      substrate_batches(batch_no, material_type, thickness_micron, width_mm)
    `)
    .eq('run_id', params.runId)

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Run {run.run_no}</h1>
          <div className="text-lg text-muted-foreground mt-1">
            {run.job_files?.job_file_no} · {run.job_files?.product_name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Machine</div>
          <div className="text-2xl font-bold">{run.machines?.code}</div>
        </div>
      </div>

      <RunGrid 
        run={run} 
        initialStations={stations || []} 
        process={process} 
        substrates={substrates || []} 
      />
    </div>
  )
}
