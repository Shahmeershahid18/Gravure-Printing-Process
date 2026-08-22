import { createClient } from '@/utils/supabase/server'
import { InkClient } from './client'

export default async function InksPage() {
  const supabase = await createClient()
  
  const { data: batches } = await supabase
    .from('ink_batches')
    .select('*, ink_products(ink_code, colour_name)')
    .order('received_date', { ascending: false })

  const { data: products } = await supabase.from('ink_products').select('id, ink_code, colour_name').order('ink_code')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inks Inventory</h1>
        <p className="text-muted-foreground">Manage ink batches and products.</p>
      </div>
      <InkClient initialData={batches || []} products={products || []} />
    </div>
  )
}
