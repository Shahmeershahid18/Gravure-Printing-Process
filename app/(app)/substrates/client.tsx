'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveSubstrateBatch } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function SubstrateClient({ initialData, suppliers }: { initialData: any[], suppliers: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    supplier_id: '', material_type: '', thickness_micron: '', batch_no: '', width_mm: '', qty_kg: '', received_date: ''
  })

  const columns = [
    { header: 'Batch No', accessorKey: 'batch_no' as const },
    { header: 'Supplier', accessorKey: 'supplier_id' as const, cell: (r: any) => r.suppliers?.name },
    { header: 'Material', accessorKey: 'material_type' as const },
    { header: 'Thickness (µm)', accessorKey: 'thickness_micron' as const },
    { header: 'Width (mm)', accessorKey: 'width_mm' as const },
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
      await saveSubstrateBatch({
        ...formData,
        thickness_micron: Number(formData.thickness_micron),
        width_mm: formData.width_mm ? Number(formData.width_mm) : null,
        qty_kg: formData.qty_kg ? Number(formData.qty_kg) : null,
      })
      setIsEditing(false)
      setFormData({ supplier_id: '', material_type: '', thickness_micron: '', batch_no: '', width_mm: '', qty_kg: '', received_date: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Substrate Batch'}
        </Button>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-md space-y-4 bg-card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Supplier</label>
              <select required value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="mt-1 block w-full rounded-md border p-2">
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Batch No</label>
              <input required value={formData.batch_no} onChange={e => setFormData({...formData, batch_no: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Material Type (e.g. PET, BOPP)</label>
              <input required value={formData.material_type} onChange={e => setFormData({...formData, material_type: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Thickness (micron)</label>
              <input type="number" step="0.1" required value={formData.thickness_micron} onChange={e => setFormData({...formData, thickness_micron: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Width (mm)</label>
              <input type="number" step="0.1" value={formData.width_mm || ''} onChange={e => setFormData({...formData, width_mm: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
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
