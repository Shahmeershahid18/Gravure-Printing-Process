import { createClient } from '@/utils/supabase/server'
import { MachineClient } from './client'

export default async function MachinesPage() {
  const supabase = await createClient()
  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .order('code')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Machines</h1>
        <p className="text-muted-foreground">Manage your printing machines and their capabilities.</p>
      </div>
      <MachineClient initialData={machines || []} />
    </div>
  )
}
