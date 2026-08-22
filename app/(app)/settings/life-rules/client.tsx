'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveCylinderLifeRule } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function LifeRuleClient({ initialData, customers }: { initialData: any[], customers: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    customer_id: '', screen_lpi_min: '', screen_lpi_max: '', limit_meters: '', priority: 100, notes: ''
  })

  const columns = [
    { header: 'Priority', accessorKey: 'priority' as const },
    { header: 'Customer', accessorKey: 'customer_id' as const, cell: (r: any) => r.customers?.name || 'All Customers' },
    { header: 'LPI Min', accessorKey: 'screen_lpi_min' as const },
    { header: 'LPI Max', accessorKey: 'screen_lpi_max' as const },
    { header: 'Limit (meters)', accessorKey: 'limit_meters' as const },
    { header: 'Notes', accessorKey: 'notes' as const },
    {
      header: 'Actions',
      accessorKey: 'id' as const,
      cell: (r: any) => (
        <button onClick={() => { setFormData({
          ...r,
          customer_id: r.customer_id || '',
          screen_lpi_min: r.screen_lpi_min || '',
          screen_lpi_max: r.screen_lpi_max || '',
          notes: r.notes || ''
        }); setIsEditing(true); }} className="text-blue-600 hover:underline">
          Edit
        </button>
      )
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveCylinderLifeRule({
        ...formData,
        customer_id: formData.customer_id || null,
        screen_lpi_min: formData.screen_lpi_min ? Number(formData.screen_lpi_min) : null,
        screen_lpi_max: formData.screen_lpi_max ? Number(formData.screen_lpi_max) : null,
        limit_meters: Number(formData.limit_meters),
        priority: Number(formData.priority)
      })
      setIsEditing(false)
      setFormData({ customer_id: '', screen_lpi_min: '', screen_lpi_max: '', limit_meters: '', priority: 100, notes: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Rule'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Customer Override</label>
              <select value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="mt-1 block w-full rounded-md border p-2">
                <option value="">-- Apply to all customers --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Priority (lower wins)</label>
              <input type="number" required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Min LPI</label>
              <input type="number" value={formData.screen_lpi_min} onChange={e => setFormData({...formData, screen_lpi_min: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Max LPI</label>
              <input type="number" value={formData.screen_lpi_max} onChange={e => setFormData({...formData, screen_lpi_max: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Life Limit (meters)</label>
              <input type="number" required value={formData.limit_meters} onChange={e => setFormData({...formData, limit_meters: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Notes</label>
              <input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <DataTable columns={columns} data={initialData} searchKey="notes" />
    </div>
  )
}
