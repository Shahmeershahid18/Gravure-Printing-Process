'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const JobFileSchema = z.object({
  customer_id: z.string().uuid(),
  job_no: z.string().min(1, 'Job number is required'),
  product_name: z.string().min(1, 'Product name is required'),
  structure: z.string().min(1, 'Structure is required'),
  no_of_colours: z.coerce.number().int().min(1).max(8),
  default_machine_id: z.string().uuid().optional().nullable(),
  reel_width_mm: z.coerce.number().optional().nullable(),
  repeat_length_mm: z.coerce.number().optional().nullable(),
  ups: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createJobFile(data: z.infer<typeof JobFileSchema>) {
  const supabase = await createClient()

  const parsed = JobFileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data: job, error } = await supabase
    .from('job_files')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return { error: error.message }

  // Create Rev-00 automatically
  const { error: revError } = await supabase
    .from('artwork_revisions')
    .insert({
      job_file_id: job.id,
      revision_no: 0,
      revision_date: new Date().toISOString().split('T')[0],
      change_summary: 'Initial Artwork',
      is_current: true,
    })

  if (revError) return { error: revError.message }

  revalidatePath('/jobs')
  return { data: job }
}

const ArtworkRevisionSchema = z.object({
  job_file_id: z.string().uuid(),
  artwork_no: z.string().optional().nullable(),
  shade_card_no: z.string().optional().nullable(),
  change_summary: z.string().min(1, 'Change summary is required'),
  effective_from_run: z.coerce.number().int().optional().nullable(),
})

export async function createArtworkRevision(data: z.infer<typeof ArtworkRevisionSchema>) {
  const supabase = await createClient()

  const parsed = ArtworkRevisionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 1. Get current max revision
  const { data: latestRevs, error: latestError } = await supabase
    .from('artwork_revisions')
    .select('revision_no, id')
    .eq('job_file_id', parsed.data.job_file_id)
    .order('revision_no', { ascending: false })
    .limit(1)

  if (latestError) return { error: latestError.message }

  const prevRevNo = latestRevs.length > 0 ? latestRevs[0].revision_no : -1
  const newRevNo = prevRevNo + 1
  const prevRevId = latestRevs.length > 0 ? latestRevs[0].id : null

  // 2. Unset current
  await supabase
    .from('artwork_revisions')
    .update({ is_current: false })
    .eq('job_file_id', parsed.data.job_file_id)

  // 3. Create new
  const { data: newRev, error: newError } = await supabase
    .from('artwork_revisions')
    .insert({
      ...parsed.data,
      revision_no: newRevNo,
      revision_date: new Date().toISOString().split('T')[0],
      is_current: true,
    })
    .select()
    .single()

  if (newError) return { error: newError.message }

  // 4. Optionally copy cylinders (if there was a previous revision)
  if (prevRevId) {
    const { data: oldCyls } = await supabase
      .from('artwork_revision_cylinders')
      .select('*')
      .eq('revision_id', prevRevId)
    
    if (oldCyls && oldCyls.length > 0) {
      const newCyls = oldCyls.map(c => ({
        revision_id: newRev.id,
        station_no: c.station_no,
        cylinder_id: c.cylinder_id,
        action: 'unchanged',
        remarks: 'Copied from previous revision',
      }))
      await supabase.from('artwork_revision_cylinders').insert(newCyls)
    }
  }

  revalidatePath(`/jobs/${parsed.data.job_file_id}`)
  revalidatePath(`/jobs/${parsed.data.job_file_id}/artwork`)
  return { data: newRev }
}
