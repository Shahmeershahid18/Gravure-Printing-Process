import { requireRole, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { MasterSection } from "@/components/masters/MasterSection"
import { SectionHeading } from "@/components/ui/page-header"

export const metadata = { title: "Cylinder life rules" }

export default async function LifeRulesPage() {
  const profile = await requireRole("admin", "planner")
  const supabase = await createClient()

  const [{ data: rules }, { data: customers }] = await Promise.all([
    supabase.from("cylinder_life_rules").select("*").order("priority"),
    supabase.from("customers").select("id, name").order("name"),
  ])

  return (
    <>
      <SectionHeading>Cylinder life rules</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Life limits vary, so they live in this table rather than in code. A
        cylinder&apos;s own override beats every rule here. Tune these against
        your own scrap history rather than leaving the seeded figures.
      </p>
      <MasterSection
        table="cylinder_life_rules"
        rows={rules ?? []}
        lookups={{
          customers: (customers ?? []).map((c) => ({ value: c.id, label: c.name })),
        }}
        canEdit={can.editLifeRules(profile.role)}
      />
    </>
  )
}
