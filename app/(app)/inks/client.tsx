'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveInkBatch } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function InkClient({ initialData, products }: { initialData: any[], products: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    ink_product_id: '', batch_no: '', mfg_date: '', received_date: '', qty_kg: '', supplier_lot: '', remarks: ''
  })

  const columns = [
    { header: 'Batch No', accessorKey: 'batch_no' as const },
    { header: 'Ink Code', accessorKey: 'ink_product_id' as const, cell: (r: any) => r.ink_products?.ink_code },
    { header: 'Colour', accessorKey: 'ink_product_id' as const, cell: (r: any) => r.ink_products?.colour_name },
    { header: 'Received', accessorKey: 'received_date' as const },
    { header: 'Qty (kg)', accessorKey: 'qty_kg' as const },
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
      await saveInkBatch({
        ...formData,
        qty_kg: formData.qty_kg ? Number(formData.qty_kg) : null,
      })
      setIsEditing(false)
      setFormData({ ink_product_id: '', batch_no: '', mfg_date: '', received_date: '', qty_kg: '', supplier_lot: '', remarks: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Ink Batch'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Ink Product</label>
              <select required value={formData.ink_product_id} onChange={e => setFormData({...formData, ink_product_id: e.target.value})} className="mt-1 block w-full rounded-md border p-2">
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.ink_code} - {p.colour_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Batch No</label>
              <input required value={formData.batch_no} onChange={e => setFormData({...formData, batch_no: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Received Date</label>
              <input type="date" value={formData.received_date || ''} onChange={e => setFormData({...formData, received_date: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Qty (kg)</label>
              <input type="number" step="0.001" value={formData.qty_kg || ''} onChange={e => setFormData({...formData, qty_kg: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <DataTable columns={columns} data={initialData} searchKey="batch_no" />
    </div>
  )
}
