"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type Hit = { kind: string; id: string; label: string; sublabel: string }

const HREF: Record<string, (id: string) => string> = {
  job_file: (id) => `/jobs/${id}`,
  cylinder: (id) => `/cylinders/${id}`,
  ink_batch: (id) => `/inks?batch=${id}`,
  substrate_batch: (id) => `/substrates?batch=${id}`,
}

const KIND_LABEL: Record<string, string> = {
  job_file: "Job file",
  cylinder: "Cylinder",
  ink_batch: "Ink batch",
  substrate_batch: "Substrate batch",
}

/**
 * One search box for job numbers, cylinder numbers and batch codes, because
 * the person holding a reel does not know which table their code lives in.
 * Backed by fn_global_search (plan Section 7.7).
 */
export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [hits, setHits] = React.useState<Hit[]>([])
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setHits([])
      return
    }
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.rpc("fn_global_search", { q: term })
      if (cancelled) return
      setHits((data as Hit[]) ?? [])
      setActive(0)
      setOpen(true)
      setBusy(false)
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
      setBusy(false)
    }
  }, [q])

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const go = (hit: Hit) => {
    const href = HREF[hit.kind]?.(hit.id)
    if (!href) return
    setOpen(false)
    setQ("")
    router.push(href)
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || hits.length === 0) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, hits.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === "Enter") {
            e.preventDefault()
            go(hits[active])
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        placeholder="Search job, cylinder or batch number…"
        aria-label="Search job, cylinder or batch number"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
      />

      {open && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-[var(--radius)] border border-steel-200 bg-paper-000 sticky-bar"
        >
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[length:calc(var(--base)*0.86)] text-ink-600">
              {busy ? "Searching…" : `Nothing matches "${q.trim()}". Try a job number, cylinder number or batch code.`}
            </p>
          ) : (
            hits.map((h, i) => (
              <button
                key={`${h.kind}-${h.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-steel-200 px-3 py-2 text-left last:border-0",
                  i === active ? "bg-paper-100" : "bg-transparent"
                )}
              >
                <span className="min-w-0">
                  <span data-numeric="" className="block truncate text-ink-900">
                    {h.label}
                  </span>
                  <span className="block truncate text-[length:calc(var(--base)*0.8)] text-ink-600">
                    {h.sublabel}
                  </span>
                </span>
                <span className="shrink-0 text-[length:calc(var(--base)*0.72)] uppercase tracking-wide text-steel-400">
                  {KIND_LABEL[h.kind] ?? h.kind}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
