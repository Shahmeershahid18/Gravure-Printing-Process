'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveColourName } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function ColourClient({ initialData }: { initialData: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [oldName, setOldName] = useState<string | undefined>()
  const [formData, setFormData] = useState<any>({
    name: '', sort_order: 100, is_active: true
  })

  const columns = [
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Sort Order', accessorKey: 'sort_order' as const },
    { header: 'Active', accessorKey: 'is_active' as const, cell: (r: any) => r.is_active ? 'Yes' : 'No' },
    {
      header: 'Actions',
      accessorKey: 'name' as const,
      cell: (r: any) => (
        <button onClick={() => { setFormData(r); setOldName(r.name); setIsEditing(true); }} className="text-blue-600 hover:underline">
          Edit
        </button>
      )
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveColourName({
        ...formData,
        sort_order: Number(formData.sort_order)
      }, oldName)
      setIsEditing(false)
      setOldName(undefined)
      setFormData({ name: '', sort_order: 100, is_active: true })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setIsEditing(!isEditing); setOldName(undefined); setFormData({ name: '', sort_order: 100, is_active: true })}}>
          {isEditing ? 'Cancel' : 'Add Colour'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Sort Order</label>
              <input type="number" required value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
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

      <DataTable columns={columns} data={initialData} searchKey="name" />
    </div>
  )
}
