'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function startRun(formData: FormData) {
  const supabase = await createClient()
  
  const jobFileId = formData.get('jobFileId') as string
  const machineId = formData.get('machineId') as string
  const operatorId = formData.get('operatorId') as string

  // Get current artwork revision
  const { data: rev } = await supabase
    .from('artwork_revisions')
    .select('id')
    .eq('job_file_id', jobFileId)
    .eq('is_current', true)
    .single()

  if (!rev) throw new Error("No current artwork revision")

  // Get next run number
  const { data: lastRun } = await supabase
    .from('runs')
    .select('run_no')
    .eq('job_file_id', jobFileId)
    .order('run_no', { ascending: false })
    .limit(1)
    .single()

  const run_no = lastRun ? lastRun.run_no + 1 : 1

  // Create Run
  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({
      job_file_id: jobFileId,
      artwork_revision_id: rev.id,
      run_no,
      machine_id: machineId,
      run_date: new Date().toISOString().split('T')[0],
      operator_id: operatorId,
      status: 'setup',
      start_time: new Date().toISOString(),
      briefing_ack_by: operatorId,
      briefing_ack_at: new Date().toISOString()
    })
    .select()
    .single()

  if (runError) throw new Error(runError.message)

  // Seed stations
  await supabase.rpc('fn_seed_run_stations', { p_run_id: run.id })

  // Scaffold run_process
  await supabase.from('run_process').insert({ run_id: run.id })

  redirect(`/runs/${run.id}`)
}
