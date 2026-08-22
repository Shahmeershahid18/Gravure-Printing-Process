"use client"

import Link from "next/link"
import { DataTable } from "@/components/ui/data-table"
import { Badge, humanise } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { pct, shortDate } from "@/lib/format"

export type JobRow = {
  id: string
  job_file_no: string
  job_no: string
  customer: string
  product_name: string
  structure: string
  no_of_colours: number
  machine: string
  revision: string
  shade_card: string
  status: string
  run_count: number
  avg_waste: number | null
  last_run: string | null
}

const statusTone = (s: string) =>
  s === "active" ? "ok" : s === "on_hold" ? "warn" : s === "archived" ? "neutral" : "info"

export function JobsTable({ rows, canCreate }: { rows: JobRow[]; canCreate: boolean }) {
  return (
    <DataTable<JobRow>
      data={rows}
      rowKey={(r) => r.id}
      filterPlaceholder="Filter by job number, product or customer…"
      emptyMessage="No job files yet. Create the first one, then cylinders and runs can hang off it."
      emptyAction={
        canCreate ? (
          <Link href="/jobs/new">
            <Button variant="primary">Create job file</Button>
          </Link>
        ) : undefined
      }
      columns={[
        {
          header: "Job file",
          accessorKey: "job_file_no",
          cell: (r) => (
            <Link href={`/jobs/${r.id}`} data-numeric="" className="font-semibold text-ink-900 hover:underline">
              {r.job_file_no}
            </Link>
          ),
        },
        { header: "Job no", accessorKey: "job_no", cell: (r) => <span data-numeric="">{r.job_no}</span> },
        { header: "Customer", accessorKey: "customer" },
        { header: "Product", accessorKey: "product_name" },
        { header: "Structure", accessorKey: "structure" },
        { header: "Colours", accessorKey: "no_of_colours", numeric: true, noFilter: true },
        { header: "Revision", accessorKey: "revision", cell: (r) => <span data-numeric="">{r.revision}</span> },
        { header: "Shade card", accessorKey: "shade_card", cell: (r) => <span data-numeric="">{r.shade_card}</span> },
        { header: "Runs", accessorKey: "run_count", numeric: true, noFilter: true },
        {
          header: "Avg waste",
          accessorKey: "avg_waste",
          numeric: true,
          noFilter: true,
          cell: (r) => (
            <span
              className={
                Number(r.avg_waste ?? 0) > 5 ? "font-semibold text-signal-critical" : ""
              }
            >
              {pct(r.avg_waste)}
            </span>
          ),
        },
        {
          header: "Last run",
          accessorKey: "last_run",
          noFilter: true,
          cell: (r) => <span data-numeric="">{shortDate(r.last_run)}</span>,
        },
        {
          header: "Status",
          accessorKey: "status",
          cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge>,
        },
      ]}
    />
  )
}
