"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function AuditFilters({
  tables,
  users,
}: {
  tables: string[]
  users: { id: string; name: string; role: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const push = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete("page")
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const select =
    "h-[var(--tap-sm)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:calc(var(--base)*0.86)] text-ink-900"

  const hasFilters = ["table", "actor", "action"].some((k) => params.get(k))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter by table"
        value={params.get("table") ?? ""}
        onChange={(e) => push({ table: e.target.value || null })}
        className={cn(select, "max-w-[14rem]")}
      >
        <option value="">Every table</option>
        {tables.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by person"
        value={params.get("actor") ?? ""}
        onChange={(e) => push({ actor: e.target.value || null })}
        className={cn(select, "max-w-[14rem]")}
      >
        <option value="">Everyone</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by action"
        value={params.get("action") ?? ""}
        onChange={(e) => push({ action: e.target.value || null })}
        className={select}
      >
        <option value="">Every action</option>
        <option value="INSERT">Created</option>
        <option value="UPDATE">Changed</option>
        <option value="DELETE">Deleted</option>
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
