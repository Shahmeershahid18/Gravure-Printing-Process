import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader } from "@/components/ui/page-header"
import { Stat } from "@/components/ui/stat"
import { CylindersBoard, type CylinderRow } from "./cylinders-board"

export const metadata = { title: "Cylinders" }

/**
 * The cylinder master and wear board.
 *
 * Wear reads surface meters, never lifetime meters. A cylinder re-engraved at
 * 900,000 m is a fresh printing surface on an old base, and alerting on the
 * lifetime figure would pull a perfectly good cylinder off the press
 * (plan Section 7.2).
 */
export default async function CylindersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const [{ data: summary }, { data: customers }, { data: suppliers }] = await Promise.all([
    supabase
      .from("v_cylinder_summary")
      .select("*")
      .order("life_used_pct", { ascending: false }),
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ])

  const rows: CylinderRow[] = (summary ?? []).map((c) => ({
    id: c.id,
    cylinder_no: c.cylinder_no,
    colour_name: c.colour_name,
    ownership: c.ownership,
    status: c.status,
    condition: c.condition,
    customer_name: c.customer_name,
    screen_lpi: c.screen_lpi,
    surface_meters: Number(c.surface_meters ?? 0),
    lifetime_meters: Number(c.lifetime_meters ?? 0),
    life_limit_meters: Number(c.life_limit_meters ?? 0),
    life_used_pct: Number(c.life_used_pct ?? 0),
    surface_since: c.surface_since,
    run_count: Number(c.run_count ?? 0),
    job_count: Number(c.job_count ?? 0),
    last_used_on: c.last_used_on,
    last_cleaning: c.last_cleaning,
    major_issue_count: Number(c.major_issue_count ?? 0),
  }))

  // Cylinders off the press cannot be pulled off it, so they are excluded from
  // the alert counts even though they still appear in the list.
  const onFloor = rows.filter(
    (c) => !["with_customer", "at_engraver", "scrapped"].includes(c.status)
  )
  const critical = onFloor.filter((c) => c.life_used_pct >= 95)
  const warning = onFloor.filter((c) => c.life_used_pct >= 80 && c.life_used_pct < 95)
  const damaged = onFloor.filter((c) => ["worn", "damaged"].includes(c.condition))

  return (
    <>
      <PageHeader
        title="Cylinders"
        subtitle="Surface meters decide when a cylinder comes off the machine. Lifetime meters answer cost and base fatigue."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="On the floor" value={onFloor.length} hint={`${rows.length} registered in total`} />
        <Stat
          label="Past 95% life"
          value={critical.length}
          tone={critical.length > 0 ? "critical" : "ok"}
          hint="Replace now"
        />
        <Stat
          label="Past 80% life"
          value={warning.length}
          tone={warning.length > 0 ? "warn" : "ok"}
          hint="Plan replacement"
        />
        <Stat
          label="Worn or damaged"
          value={damaged.length}
          tone={damaged.length > 0 ? "warn" : "ok"}
          hint="By recorded condition"
        />
      </div>

      <CylindersBoard
        rows={rows}
        canEdit={can.editCylinders(profile.role)}
        customers={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
        suppliers={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
      />
    </>
  )
}
