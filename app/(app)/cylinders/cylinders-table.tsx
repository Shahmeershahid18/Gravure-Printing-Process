"use client"

import { DataTable } from '@/components/ui/data-table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export function CylindersTable({ data }: { data: any[] }) {
  return (
    <DataTable
      columns={[
        {
          header: 'Cylinder No',
          accessorKey: 'cylinder_no',
          cell: (row) => (
            <Link href={`/cylinders/${row.id}`} className="font-medium hover:underline text-primary">
              {row.cylinder_no}
            </Link>
          )
        },
        { header: 'Colour', accessorKey: 'colour_name' },
        { 
          header: 'Ownership', 
          accessorKey: 'ownership',
          cell: (row) => (
            <span className="capitalize">{row.ownership}</span>
          )
        },
        { 
          header: 'Status', 
          accessorKey: 'status',
          cell: (row) => (
            <Badge variant={row.status === 'in_store' ? 'default' : 'secondary'}>
              {row.status.replace('_', ' ')}
            </Badge>
          )
        },
        { header: 'Condition', accessorKey: 'condition' },
        { 
          header: 'Wear', 
          accessorKey: 'wear_percentage',
          cell: (row) => {
            const wear = row.wear_percentage || 0
            let color = 'bg-emerald-500'
            if (wear > 80) color = 'bg-destructive'
            else if (wear > 60) color = 'bg-amber-500'

            return (
              <div className="w-full flex items-center gap-3 min-w-[120px]">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${color}`} 
                    style={{ width: `${Math.min(wear, 100)}%` }} 
                  />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {Math.round(wear)}%
                </span>
              </div>
            )
          }
        }
      ]}
      data={data}
      searchKey="cylinder_no"
    />
  )
}
