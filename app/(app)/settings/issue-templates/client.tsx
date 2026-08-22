'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveIssueTemplate } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function IssueTemplateClient({ initialData }: { initialData: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    area: '', title: '', hint: '', is_active: true
  })

  const columns = [
    { header: 'Area', accessorKey: 'area' as const },
    { header: 'Title', accessorKey: 'title' as const },
    { header: 'Hint', accessorKey: 'hint' as const },
    { header: 'Active', accessorKey: 'is_active' as const, cell: (r: any) => r.is_active ? 'Yes' : 'No' },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (r: any) => (
        <button onClick={() => { setFormData(r); setIsEditing(true); }} className="text-blue-600 hover:underline">
          Edit
        </button>
      )
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveIssueTemplate({
        ...formData
      })
      setIsEditing(false)
      setFormData({ area: '', title: '', hint: '', is_active: true })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Template'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Area (e.g. registration, adhesion)</label>
              <input required value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Hint</label>
              <input value={formData.hint || ''} onChange={e => setFormData({...formData, hint: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.is_active !== false} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <DataTable columns={columns} data={initialData} searchKey="title" />
    </div>
  )
}
