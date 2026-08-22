import { notFound } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getRun } from "@/lib/queries/run"
import { addRunSubstrate, removeRunSubstrate } from "@/lib/actions/run-substrates"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { decimal, meters, kg } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Substrate" }

export default async function SubstratePage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const run = await getRun(runId)
  if (!run) notFound()

  const locked = Boolean(run.locked_at)
  const supabase = await createClient()

  const [{ data: rows }, { data: batches }] = await Promise.all([
    supabase
      .from("run_substrates")
      .select("*, substrate_batches(batch_no, material_type, thickness_micron, suppliers(name))")
      .eq("run_id", runId),
    supabase
      .from("substrate_batches")
      .select("id, batch_no, material_type, thickness_micron, suppliers(name)")
      .order("batch_no"),
  ])

  const used = rows ?? []

  return (
    <div className="space-y-[var(--gap)]">
      <section className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        <h3 className="border-b border-steel-200 px-[var(--gap)] py-2.5 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
          Reels on this run
        </h3>
        {used.length === 0 ? (
          <EmptyState title="No reel recorded yet. Add the batch that is on the machine below." />
        ) : (
          <ul className="divide-y divide-steel-200">
            {used.map((r) => {
              const b = one<{
                batch_no: string
                material_type: string
                thickness_micron: number
                suppliers: { name: string } | null
              }>(r.substrate_batches)
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-[var(--gap)] py-3"
                >
                  <div className="min-w-0">
                    <p data-numeric="" className="font-semibold text-ink-900">
                      {b?.batch_no}
                      {r.roll_no ? ` · Roll ${r.roll_no}` : ""}
                    </p>
                    <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
                      {b?.suppliers?.name} · {b?.material_type} {b?.thickness_micron}µ
                    </p>
                    <p
                      data-numeric=""
                      className="text-[length:calc(var(--base)*0.82)] text-steel-400"
                    >
                      {meters(r.meters_used)} m · {kg(r.kg_used)} kg
                      {r.dyne_at_machine ? ` · ${decimal(r.dyne_at_machine)} dyne at machine` : ""}
                    </p>
                    {r.observation && (
                      <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-900">
                        {r.observation}
                      </p>
                    )}
                  </div>
                  {!locked && (
                    <form action={removeRunSubstrate}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="runId" value={runId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!locked && (
        <form
          action={addRunSubstrate}
          className="rounded-[var(--radius)] border border-steel-200 bg-paper-000"
        >
          <h3 className="border-b border-steel-200 px-[var(--gap)] py-2.5 text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
            Add a reel
          </h3>
          <input type="hidden" name="runId" value={runId} />

          <div className="grid gap-[var(--gap)] p-[var(--gap)] sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
                Batch
              </span>
              <select
                name="substrate_batch_id"
                required
                className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)]"
              >
                <option value="">Pick the batch on the machine</option>
                {(batches ?? []).map((b) => {
                  const sup = one<{ name: string }>(b.suppliers)
                  return (
                    <option key={b.id} value={b.id}>
                      {b.batch_no} — {sup?.name} {b.material_type} {b.thickness_micron}µ
                    </option>
                  )
                })}
              </select>
            </label>

            <Text name="roll_no" label="Roll number" />
            <Num name="meters_used" label="Meters used" />
            <Num name="kg_used" label="Kg used" />
            <Num name="dyne_at_machine" label="Dyne at machine" />

            <label>
              <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
                Treated side
              </span>
              <select
                name="treatment_side"
                className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)]"
              >
                <option value="">Not checked</option>
                <option value="inside">Inside</option>
                <option value="outside">Outside</option>
                <option value="both">Both</option>
              </select>
            </label>

            <Text name="observation" label="Observation" className="sm:col-span-2 lg:col-span-3" />
          </div>

          <div className="flex justify-end border-t border-steel-200 p-[var(--gap)]">
            <Button type="submit" variant="primary">
              Add reel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Text({ name, label, className }: { name: string; label: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
        {label}
      </span>
      <input
        name={name}
        type="text"
        className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:var(--base)]"
      />
    </label>
  )
}

function Num({ name, label }: { name: string; label: string }) {
  return (
    <label>
      <span className="mb-1 block text-[length:calc(var(--base)*0.84)] font-semibold text-ink-600">
        {label}
      </span>
      <input
        name={name}
        type="number"
        step="any"
        inputMode="decimal"
        data-numeric=""
        className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-right text-[length:var(--base)]"
      />
    </label>
  )
}
