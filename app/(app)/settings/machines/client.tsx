'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { saveMachine } from '@/lib/actions/masters'
import { Button } from '@/components/ui/button'

export function MachineClient({ initialData }: { initialData: any[] }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({
    code: '', name: '', stations: 8, max_web_width_mm: '', max_speed_mpm: '', dryer_zones: ''
  })

  const columns = [
    { header: 'Code', accessorKey: 'code' as const },
    { header: 'Name', accessorKey: 'name' as const },
    { header: 'Stations', accessorKey: 'stations' as const },
    { header: 'Web Width (mm)', accessorKey: 'max_web_width_mm' as const },
    { header: 'Max Speed (m/min)', accessorKey: 'max_speed_mpm' as const },
    { header: 'Dryer Zones', accessorKey: 'dryer_zones' as const },
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
      await saveMachine({
        ...formData,
        stations: Number(formData.stations),
        max_web_width_mm: formData.max_web_width_mm ? Number(formData.max_web_width_mm) : null,
        max_speed_mpm: formData.max_speed_mpm ? Number(formData.max_speed_mpm) : null,
        dryer_zones: formData.dryer_zones ? Number(formData.dryer_zones) : null,
      })
      setIsEditing(false)
      setFormData({ code: '', name: '', stations: 8, max_web_width_mm: '', max_speed_mpm: '', dryer_zones: '' })
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : 'Add Machine'}
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
              <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Stations</label>
              <input type="number" required value={formData.stations} onChange={e => setFormData({...formData, stations: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Web Width (mm)</label>
              <input type="number" value={formData.max_web_width_mm || ''} onChange={e => setFormData({...formData, max_web_width_mm: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Max Speed (mpm)</label>
              <input type="number" value={formData.max_speed_mpm || ''} onChange={e => setFormData({...formData, max_speed_mpm: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Dryer Zones</label>
              <input type="number" value={formData.dryer_zones || ''} onChange={e => setFormData({...formData, dryer_zones: e.target.value})} className="mt-1 block w-full rounded-md border p-2" />
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

      <DataTable columns={columns} data={initialData} searchKey="code" />
    </div>
  )
}
