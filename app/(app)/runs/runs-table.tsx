"use client"

import Link from "next/link"
import { DataTable } from "@/components/ui/data-table"
import { Badge, runStatusTone, runResultTone, humanise } from "@/components/ui/badge"
import { meters, pct, decimal, shortDate } from "@/lib/format"

export type RunRow = {
  id: string
  run_no: number
  run_date: string
  shift: string | null
  status: string
  result: string | null
  machine: string
  job_file_id: string
  job_file_no: string
  job_no: string
  product_name: string
  customer: string
  produced_qty_m: number | null
  waste_pct_m: number | null
  avg_speed_mpm: number | null
  locked: boolean
}

export function RunsTable({ rows }: { rows: RunRow[] }) {
  return (
    <DataTable<RunRow>
      data={rows}
      rowKey={(r) => r.id}
      filterPlaceholder="Filter by job, product, customer or machine…"
      emptyMessage="No runs recorded yet. They appear here as soon as an operator acknowledges a briefing."
      initialSort={{ key: "run_date", dir: "desc" }}
      columns={[
        {
          header: "Run",
          accessorKey: "run_no",
          numeric: true,
          cell: (r) => (
            <Link href={`/runs/${r.id}`} data-numeric="" className="font-semibold text-ink-900 hover:underline">
              {r.run_no}
            </Link>
          ),
        },
        {
          header: "Job file",
          accessorKey: "job_file_no",
          cell: (r) => (
            <Link href={`/jobs/${r.job_file_id}`} data-numeric="" className="text-ink-900 hover:underline">
              {r.job_file_no}
            </Link>
          ),
        },
        { header: "Job no", accessorKey: "job_no", cell: (r) => <span data-numeric="">{r.job_no}</span> },
        { header: "Product", accessorKey: "product_name" },
        { header: "Customer", accessorKey: "customer" },
        {
          header: "Machine",
          accessorKey: "machine",
          cell: (r) => <span data-numeric="">{r.machine}</span>,
        },
        {
          header: "Date",
          accessorKey: "run_date",
          cell: (r) => <span data-numeric="">{shortDate(r.run_date)}</span>,
        },
        {
          header: "Produced",
          accessorKey: "produced_qty_m",
          numeric: true,
          noFilter: true,
          cell: (r) => `${meters(r.produced_qty_m)} m`,
        },
        {
          header: "Waste",
          accessorKey: "waste_pct_m",
          numeric: true,
          noFilter: true,
          cell: (r) => (
            <span
              className={
                Number(r.waste_pct_m ?? 0) > 5
                  ? "font-semibold text-signal-critical"
                  : Number(r.waste_pct_m ?? 0) > 4
                    ? "font-semibold text-signal-warn"
                    : ""
              }
            >
              {pct(r.waste_pct_m)}
            </span>
          ),
        },
        {
          header: "Speed",
          accessorKey: "avg_speed_mpm",
          numeric: true,
          noFilter: true,
          cell: (r) => `${decimal(r.avg_speed_mpm, 0)} m/min`,
        },
        {
          header: "Status",
          accessorKey: "status",
          cell: (r) => (
            <span className="flex flex-wrap items-center gap-1">
              <Badge tone={runStatusTone(r.status)}>{humanise(r.status)}</Badge>
              {r.result && <Badge tone={runResultTone(r.result)}>{humanise(r.result)}</Badge>}
              {r.locked && <Badge tone="neutral">Locked</Badge>}
            </span>
          ),
        },
      ]}
    />
  )
}
