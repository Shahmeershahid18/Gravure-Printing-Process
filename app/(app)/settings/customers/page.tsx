import { createClient } from '@/utils/supabase/server'
import { CustomerClient } from './client'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('name')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground">Manage customers for job files.</p>
      </div>
      <CustomerClient initialData={customers || []} />
    </div>
  )
}
