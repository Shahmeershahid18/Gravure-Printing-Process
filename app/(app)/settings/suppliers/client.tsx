'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveSupplier } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function SupplierClient({ initialData }: { initialData: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    code: '', name: '', type: [], notes: ''
  })

  const columns = [
    { header: 'Code', accessorKey: 'code' as const },
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Type', accessorKey: 'type' as const, cell: (r: any) => r.type?.join(', ') || '' },
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
      await saveSupplier({
        ...formData,
        type: typeof formData.type === 'string' ? formData.type.split(',').map((s: string) => s.trim()) : formData.type
      })
      setIsEditing(false)
      setFormData({ code: '', name: '', type: [], notes: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Supplier'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Code</label>
              <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Type (comma separated, e.g. substrate, ink)</label>
              <input value={typeof formData.type === 'string' ? formData.type : (formData.type?.join(', ') || '')} onChange={e => setFormData({...formData, type: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Notes</label>
              <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <DataTable columns={columns} data={initialData} searchKey="name" />
    </div>
  )
}
