'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveCustomer } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function CustomerClient({ initialData }: { initialData: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    code: '', name: '', contact_name: '', contact_email: '', notes: ''
  })

  const columns = [
    { header: 'Code', accessorKey: 'code' as const },
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Contact Name', accessorKey: 'contact_name' as const },
    { header: 'Contact Email', accessorKey: 'contact_email' as const },
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
      await saveCustomer({
        ...formData,
      })
      setIsEditing(false)
      setFormData({ code: '', name: '', contact_name: '', contact_email: '', notes: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Customer'}
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
            <div>
              <label className="block text-sm font-medium">Contact Name</label>
              <input value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Contact Email</label>
              <input type="email" value={formData.contact_email || ''} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
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
