'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CylinderEventSchema = z.object({
  cylinder_id: z.string().uuid(),
  event_type: z.enum(['engraved','chrome_plated','dechromed','re_engraved','cleaning','repair','inspection','issued_to_customer','received_from_customer','scrapped']),
  event_date: z.string(),
  meters_at_event: z.coerce.number().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid().optional().nullable(),
  cost: z.coerce.number().optional().nullable(),
  description: z.string().optional().nullable(),
})

export async function logCylinderEvent(data: z.infer<typeof CylinderEventSchema>) {
  const supabase = await createClient()

  const parsed = CylinderEventSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Get current meters from ledger
  let meters_at_event = parsed.data.meters_at_event
  if (meters_at_event === null || meters_at_event === undefined) {
    const { data: ledger } = await supabase
      .from('v_cylinder_ledger')
      .select('current_meters')
      .eq('id', parsed.data.cylinder_id)
      .single()
    meters_at_event = ledger?.current_meters || 0
  }

  const { data: event, error } = await supabase
    .from('cylinder_events')
    .insert({
      ...parsed.data,
      meters_at_event,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/cylinders/${parsed.data.cylinder_id}`)
  revalidatePath('/cylinders')
  return { data: event }
}
