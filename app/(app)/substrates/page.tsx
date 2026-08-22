import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { MasterSection } from "@/components/masters/MasterSection"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge, humanise } from "@/components/ui/badge"
import Link from "next/link"
import { relativeDays } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Substrates" }

export default async function SubstratesPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: batches }, { data: suppliers }, { data: issues }] = await Promise.all([
    supabase.from("substrate_batches").select("*").order("batch_no"),
    supabase.from("suppliers").select("id, name").order("name"),
    supabase
      .from("observations")
      .select("id, title, area, severity, observed_at, substrate_batch_id, job_file_id, substrate_batches(batch_no, material_type, suppliers(name))")
      .not("substrate_batch_id", "is", null)
      .order("observed_at", { ascending: false })
      .limit(50),
  ])

  // The watchlist is the point of this page: which reels have caused trouble.
  const counts = new Map<string, { batch: string; supplier: string; material: string; count: number }>()
  for (const o of issues ?? []) {
    const b = one<{
      batch_no: string
      material_type: string
      suppliers: { name: string } | null
    }>(o.substrate_batches)
    if (!b || !o.substrate_batch_id) continue
    const e = counts.get(o.substrate_batch_id) ?? {
      batch: b.batch_no,
      supplier: b.suppliers?.name ?? "—",
      material: b.material_type,
      count: 0,
    }
    e.count++
    counts.set(o.substrate_batch_id, e)
  }
  const watchlist = [...counts.values()].sort((a, b) => b.count - a.count)

  return (
    <>
      <PageHeader
        title="Substrates"
        subtitle="Every reel that runs is recorded against its batch, which is what makes “show me every problem ever caused by this supplier's PET” answerable."
      />

      {watchlist.length > 0 && (
        <section className="mb-8">
          <SectionHeading>Watchlist</SectionHeading>
          <Card>
            <ul className="divide-y divide-steel-200">
              {watchlist.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p data-numeric="" className="font-semibold text-ink-900">{w.batch}</p>
                    <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                      {w.supplier} · {w.material}
                    </p>
                  </div>
                  <span data-numeric="" className="shrink-0 font-semibold text-signal-warn">
                    {w.count} issue{w.count === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="mb-8">
        <SectionHeading>Batches</SectionHeading>
        <MasterSection
          table="substrate_batches"
          rows={batches ?? []}
          lookups={{ suppliers: (suppliers ?? []).map((s) => ({ value: s.id, label: s.name })) }}
          canEdit={can.editBatches(profile.role)}
        />
      </section>

      <section>
        <SectionHeading>Recent substrate issues</SectionHeading>
        <Card>
          {(issues ?? []).length === 0 ? (
            <EmptyState title="No substrate issues logged. Reels that cause trouble appear here automatically." />
          ) : (
            <ul className="divide-y divide-steel-200">
              {(issues ?? []).map((o) => {
                const b = one<{ batch_no: string }>(o.substrate_batches)
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{o.title}</p>
                      <p className="text-[length:calc(var(--base)*0.82)] text-steel-400">
                        <span data-numeric="">{b?.batch_no}</span> · {humanise(o.area)} ·{" "}
                        {relativeDays(o.observed_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={o.severity === "critical" ? "critical" : o.severity === "major" ? "warn" : "neutral"}>
                        {humanise(o.severity)}
                      </Badge>
                      <Link
                        href={`/jobs/${o.job_file_id}/issues`}
                        className="text-[length:calc(var(--base)*0.84)] text-ink-600 hover:text-ink-900 hover:underline"
                      >
                        Job
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>
    </>
  )
}
