"use client"

import * as React from "react"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type Column<T> = {
  header: string
  /** Key used for sorting and for the default cell render. */
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  numeric?: boolean
  /** Excluded from the free-text filter. */
  noFilter?: boolean
  className?: string
}

/**
 * One table for the whole desktop shell. Filtering searches every column that
 * has not opted out, because a planner looking for "GR-2548" does not care
 * which column it lives in.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  filterPlaceholder = "Filter…",
  emptyMessage = "Nothing matches this filter. Clear it to see all rows.",
  emptyAction,
  rowKey,
  initialSort,
}: {
  columns: Column<T>[]
  data: T[]
  filterPlaceholder?: string
  emptyMessage?: string
  emptyAction?: React.ReactNode
  rowKey?: (row: T, index: number) => string
  initialSort?: { key: keyof T; dir: "asc" | "desc" }
}) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<{ key: keyof T; dir: "asc" | "desc" } | null>(
    initialSort ?? null
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    const keys = columns.filter((c) => c.accessorKey && !c.noFilter).map((c) => c.accessorKey!)
    return data.filter((row) =>
      keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
    )
  }, [data, query, columns])

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    return [...filtered].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av === bv) return 0
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "en", { numeric: true })
      return dir === "asc" ? cmp : -cmp
    })
  }, [filtered, sort])

  const toggleSort = (key: keyof T) =>
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
          className="max-w-xs"
        />
        <span data-numeric="" className="text-[length:calc(var(--base)*0.82)] text-ink-600">
          {sorted.length} of {data.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
          <EmptyState
            title={data.length === 0 ? emptyMessage : "Nothing matches this filter. Clear it to see all rows."}
            action={data.length === 0 ? emptyAction : undefined}
          />
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              {columns.map((c, i) => {
                const sortable = Boolean(c.accessorKey)
                // Both sides are undefined on an action column, and
                // `undefined === undefined` would mark it sorted with no sort
                // state to read.
                const isSorted = Boolean(sort && c.accessorKey && sort.key === c.accessorKey)
                return (
                  <TH key={i} numeric={c.numeric} className={c.className}
                      aria-sort={isSorted ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.accessorKey!)}
                        className={cn(
                          "inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink-900",
                          c.numeric && "flex-row-reverse"
                        )}
                      >
                        {c.header}
                        <span aria-hidden="true" className="text-steel-400">
                          {isSorted ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </TH>
                )
              })}
            </TR>
          </THead>
          <TBody>
            {sorted.map((row, i) => (
              <TR key={rowKey ? rowKey(row, i) : i} className="hover:bg-paper-100">
                {columns.map((c, j) => (
                  <TD key={j} numeric={c.numeric} className={c.className}>
                    {c.cell
                      ? c.cell(row)
                      : c.accessorKey
                        ? (String(row[c.accessorKey] ?? "—") || "—")
                        : null}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
