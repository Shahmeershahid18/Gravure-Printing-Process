import { createClient } from '@/utils/supabase/server'
import { SupplierClient } from './client'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <p className="text-muted-foreground">Manage vendors for substrate, ink, and cylinders.</p>
      </div>
      <SupplierClient initialData={suppliers || []} />
    </div>
  )
}
