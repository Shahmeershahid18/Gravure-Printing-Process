import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { MasterSection } from "@/components/masters/MasterSection"

export const metadata = { title: "Inks" }

export default async function InksPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: products }, { data: batches }, { data: suppliers }] = await Promise.all([
    supabase.from("ink_products").select("*").order("ink_code"),
    supabase.from("ink_batches").select("*").order("batch_no"),
    supabase.from("suppliers").select("id, name").order("name"),
  ])

  const supplierOptions = (suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))
  const productOptions = (products ?? []).map((p) => ({
    value: p.id,
    label: `${p.ink_code} — ${p.colour_name}`,
  }))

  return (
    <>
      <PageHeader
        title="Inks"
        subtitle="Products and the batches that run against them. A station records which batch it ran, so a viscosity complaint traces back to one."
      />

      <section className="mb-8">
        <SectionHeading>Ink products</SectionHeading>
        <MasterSection
          table="ink_products"
          rows={products ?? []}
          lookups={{ suppliers: supplierOptions }}
          canEdit={can.editBatches(profile.role)}
        />
      </section>

      <section>
        <SectionHeading>Ink batches</SectionHeading>
        <MasterSection
          table="ink_batches"
          rows={batches ?? []}
          lookups={{ inkProducts: productOptions, suppliers: supplierOptions }}
          canEdit={can.editBatches(profile.role)}
        />
      </section>
    </>
  )
}
