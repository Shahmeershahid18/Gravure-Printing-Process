import { createClient } from '@/utils/supabase/server'
import { SubstrateClient } from './client'

export default async function SubstratesPage() {
  const supabase = await createClient()
  
  const { data: batches } = await supabase
    .from('substrate_batches')
    .select('*, suppliers(name)')
    .order('received_date', { ascending: false })

  const { data: suppliers } = await supabase.from('suppliers').select('id, name').contains('type', ['substrate']).order('name')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Substrates Inventory</h1>
        <p className="text-muted-foreground">Manage substrate batches.</p>
      </div>
      <SubstrateClient initialData={batches || []} suppliers={suppliers || []} />
    </div>
  )
}
