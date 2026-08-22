import { createClient } from '@/utils/supabase/server'
import { CylindersTable } from './cylinders-table'
import { Button } from '@/components/ui/button'

export default async function CylindersPage() {
  const supabase = await createClient()

  const { data: cylinders } = await supabase
    .from('v_cylinder_ledger')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cylinders</h1>
          <p className="text-muted-foreground mt-2">Manage physical inventory and track cylinder wear.</p>
        </div>
        <Button>Add Cylinder</Button>
      </div>

      <CylindersTable data={cylinders || []} />
    </div>
  )
}
