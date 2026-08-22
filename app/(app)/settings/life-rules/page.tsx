import { createClient } from '@/utils/supabase/server'
import { LifeRuleClient } from './client'

export default async function LifeRulesPage() {
  const supabase = await createClient()
  const { data: rules } = await supabase
    .from('cylinder_life_rules')
    .select('*, customers(name)')
    .order('priority')

  const { data: customers } = await supabase.from('customers').select('id, name').order('name')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cylinder Life Rules</h1>
        <p className="text-muted-foreground">Manage limits for cylinder wear based on LPI and customer overrides.</p>
      </div>
      <LifeRuleClient initialData={rules || []} customers={customers || []} />
    </div>
  )
}
