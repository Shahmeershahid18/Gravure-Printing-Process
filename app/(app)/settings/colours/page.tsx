import { createClient } from '@/utils/supabase/server'
import { ColourClient } from './client'

export default async function ColoursPage() {
  const supabase = await createClient()
  const { data: colours } = await supabase
    .from('colour_names')
    .select('*')
    .order('sort_order')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Colours</h1>
        <p className="text-muted-foreground">Manage the standard master list of colour names.</p>
      </div>
      <ColourClient initialData={colours || []} />
    </div>
  )
}
