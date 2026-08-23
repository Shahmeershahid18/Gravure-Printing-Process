"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const CATEGORIES = [
  { value: "", label: "Every kind" },
  { value: "auth", label: "Sign in and out" },
  { value: "page", label: "Pages opened" },
  { value: "data", label: "Records changed" },
  { value: "admin", label: "Privileged actions" },
  { value: "security", label: "Refusals and failures" },
]

const WINDOWS = [
  { value: "", label: "All time" },
  { value: "hour", label: "Last hour" },
  { value: "day", label: "Last 24 hours" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
]

/**
 * Writes the filters into the URL and lets the server re-render.
 *
 * The free-text box is the exception: it debounces, because a query per
 * keystroke against a table that will hold hundreds of thousands of rows is a
 * self-inflicted load test.
 */
export function ActivityFilters({
  users,
}: {
  users: { id: string; name: string; role: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const [query, setQuery] = React.useState(params.get("q") ?? "")

  const push = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      // Any filter change invalidates the page number; page 4 of the old
      // result set is meaningless in the new one and usually empty.
      next.delete("page")
      const qs = next.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [params, pathname, router]
  )

  React.useEffect(() => {
    const current = params.get("q") ?? ""
    if (query === current) return
    const t = setTimeout(() => push({ q: query || null }), 350)
    return () => clearTimeout(t)
  }, [query, params, push])

  const select =
    "h-[var(--tap-sm)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2 text-[length:calc(var(--base)*0.86)] text-ink-900"

  const hasFilters = ["actor", "category", "event", "q", "window"].some((k) => params.get(k))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search names, summaries and paths…"
        aria-label="Search activity"
        className="h-[var(--tap-sm)] w-full sm:w-64"
      />

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
        aria-label="Filter by kind"
        value={params.get("category") ?? ""}
        onChange={(e) => push({ category: e.target.value || null })}
        className={select}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by time"
        value={params.get("window") ?? ""}
        onChange={(e) => push({ window: e.target.value || null })}
        className={select}
      >
        {WINDOWS.map((w) => (
          <option key={w.value} value={w.value}>
            {w.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("")
            router.push(pathname)
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
