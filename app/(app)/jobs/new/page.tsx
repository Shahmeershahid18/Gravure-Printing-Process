import { createClient } from '@/utils/supabase/server'
import { JobCreateWizard } from './client'

export default async function NewJobPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .order('name')

  const { data: machines } = await supabase
    .from('machines')
    .select('id, name, code')
    .eq('is_active', true)
    .order('code')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Job File</h1>
        <p className="text-muted-foreground mt-2">Initialize a new job and its first artwork revision.</p>
      </div>

      <JobCreateWizard customers={customers || []} machines={machines || []} />
    </div>
  )
}
