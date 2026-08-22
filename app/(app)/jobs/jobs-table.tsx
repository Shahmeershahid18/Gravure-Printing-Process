"use client"

import { DataTable } from '@/components/ui/data-table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export function JobsTable({ data }: { data: any[] }) {
  return (
    <DataTable
      columns={[
        {
          header: 'Job File',
          accessorKey: 'job_file_no',
          cell: (row) => (
            <Link href={`/jobs/${row.id}`} className="font-medium hover:underline text-primary">
              {row.job_file_no}
            </Link>
          )
        },
        { header: 'Job No', accessorKey: 'job_no' },
        { header: 'Customer', accessorKey: 'customer' },
        { header: 'Product', accessorKey: 'product_name' },
        { header: 'Structure', accessorKey: 'structure' },
        { header: 'Current Rev', accessorKey: 'revision' },
        { header: 'Shade Card', accessorKey: 'shade_card' },
        {
          header: 'Status',
          accessorKey: 'status',
          cell: (row) => (
            <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
              {row.status}
            </Badge>
          )
        }
      ]}
      data={data}
      searchKey="product_name"
    />
  )
}
