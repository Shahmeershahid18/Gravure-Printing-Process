import { createClient } from '@/utils/supabase/server'
import { IssueTemplateClient } from './client'

export default async function IssueTemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('issue_templates')
    .select('*')
    .order('area')

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Issue Templates</h1>
        <p className="text-muted-foreground">Manage the standard list of common issues for operators to select.</p>
      </div>
      <IssueTemplateClient initialData={templates || []} />
    </div>
  )
}
