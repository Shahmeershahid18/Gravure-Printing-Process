import Link from "next/link"
import { notFound } from "next/navigation"
import { requireProfile, can } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardBody } from "@/components/ui/card"
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table"
import { Badge, conditionTone, severityTone, humanise } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataPoint } from "@/components/ui/field"
import { WearBar, wearWord } from "@/components/cylinder/WearGauge"
import { Alert } from "@/components/ui/alert"
import { CylinderEventForm } from "./event-form"
import { meters, decimal, shortDate, relativeDays } from "@/lib/format"
import { one } from "@/lib/rel"

export const metadata = { title: "Cylinder" }

/**
 * The cylinder lifetime page -- plan Section 10.5.
 *
 * Both meter counts are shown, with the re-engrave date marked in the ledger,
 * so nobody is confused about why the surface figure dropped while the
 * lifetime figure kept climbing.
 */
export default async function CylinderPage({
  params,
}: {
  params: Promise<{ cylinderId: string }>
}) {
  const { cylinderId } = await params
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data: c } = await supabase
    .from("v_cylinder_summary")
    .select("*")
    .eq("id", cylinderId)
    .maybeSingle()

  if (!c) notFound()

  const [{ data: detail }, { data: history }, { data: events }, { data: issues }, { data: suppliers }] =
    await Promise.all([
      supabase
        .from("cylinders")
        .select("*, suppliers(name), customers(name)")
        .eq("id", cylinderId)
        .maybeSingle(),
      supabase
        .from("v_cylinder_run_history")
        .select("*")
        .eq("cylinder_id", cylinderId)
        .order("run_date", { ascending: false }),
      supabase
        .from("cylinder_events")
        .select("*, suppliers(name)")
        .eq("cylinder_id", cylinderId)
        .order("event_date", { ascending: false }),
      supabase
        .from("observations")
        .select("id, title, area, severity, observed_at, job_file_id, run_id, description")
        .eq("cylinder_id", cylinderId)
        .order("observed_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").order("name"),
    ])

  const surfacePct = Number(c.life_used_pct ?? 0)
  const excluded = ["with_customer", "at_engraver", "scrapped"].includes(c.status)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Cylinders", href: "/cylinders" }, { label: c.cylinder_no }]}
        title={c.cylinder_no}
        subtitle={
          <>
            {c.colour_name ?? "No colour recorded"} ·{" "}
            {c.ownership === "customer"
              ? `Customer owned${c.customer_name ? ` (${c.customer_name})` : ""}`
              : "Company owned"}
            {detail?.engraving_date ? ` · Engraved ${shortDate(detail.engraving_date)}` : ""}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={conditionTone(c.condition)}>{humanise(c.condition)}</Badge>
        <Badge tone="neutral" glyph={false}>{humanise(c.status)}</Badge>
        {c.screen_lpi && <Badge tone="info" glyph={false}>{c.screen_lpi} LPI</Badge>}
      </div>

      {excluded && (
        <Alert tone="info" title="Excluded from wear alerts" className="mb-6">
          This cylinder is {humanise(c.status).toLowerCase()}, so it is not on a
          press to be pulled off one. Its meters still accrue when it runs.
        </Alert>
      )}

      {!excluded && surfacePct >= 80 && (
        <Alert
          tone={surfacePct >= 95 ? "critical" : "warn"}
          title={wearWord(surfacePct)}
          className="mb-6"
        >
          The printing surface has run {meters(c.surface_meters)} m of its{" "}
          {meters(c.life_limit_meters)} m limit. Re-engraving resets this figure;
          the lifetime total keeps climbing for costing and base fatigue.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-[length:calc(var(--base)*0.8)] font-semibold uppercase tracking-wide text-ink-600">
                    Surface life
                  </h2>
                  <span className="text-[length:calc(var(--base)*0.82)] text-steel-400">
                    {c.surface_since
                      ? `Since the surface was restored on ${shortDate(c.surface_since)}`
                      : "No engrave event recorded, so opening meters count toward the surface"}
                  </span>
                </div>
                <WearBar
                  used={Number(c.surface_meters ?? 0)}
                  limit={Number(c.life_limit_meters ?? 0)}
                  pctUsed={surfacePct}
                />
              </div>

              <div className="grid gap-4 border-t border-steel-200 pt-4 sm:grid-cols-4">
                <DataPoint label="Lifetime meters" value={`${meters(c.lifetime_meters)} m`} />
                <DataPoint label="Opening at import" value={`${meters(detail?.opening_meters)} m`} />
                <DataPoint label="Runs" value={c.run_count} />
                <DataPoint label="Jobs" value={c.job_count} />
                <DataPoint label="Last used" value={shortDate(c.last_used_on)} />
                <DataPoint label="Last cleaning" value={shortDate(c.last_cleaning)} />
                <DataPoint label="Last repair" value={shortDate(c.last_repair)} />
                <DataPoint label="Major issues" value={c.major_issue_count} />
              </div>
            </CardBody>
          </Card>

          <section>
            <SectionHeading>Running history</SectionHeading>
            {(history ?? []).length === 0 ? (
              <Card>
                <EmptyState title="This cylinder has not run yet. Meters accrue only through the station grid, never by typing a cumulative." />
              </Card>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Job file</TH>
                    <TH>Job no</TH>
                    <TH>Machine</TH>
                    <TH numeric>Run</TH>
                    <TH>Date</TH>
                    <TH numeric>This run</TH>
                    <TH numeric>Cumulative</TH>
                    <TH>Note</TH>
                  </TR>
                </THead>
                <TBody>
                  {(history ?? []).map((h, i) => (
                    <TR key={`${h.run_id}-${i}`}>
                      <TD>
                        <Link href={`/jobs/${h.job_file_id}`} data-numeric="" className="text-ink-900 hover:underline">
                          {h.job_file_no}
                        </Link>
                      </TD>
                      <TD><span data-numeric="">{h.job_no}</span></TD>
                      <TD><span data-numeric="">{h.machine_code}</span></TD>
                      <TD numeric>
                        <Link href={`/runs/${h.run_id}`} data-numeric="" className="text-ink-900 hover:underline">
                          {h.run_no}
                        </Link>
                      </TD>
                      <TD><span data-numeric="">{shortDate(h.run_date)}</span></TD>
                      <TD numeric>{meters(h.this_run_meters)}</TD>
                      <TD numeric>{meters(h.cumulative_meters)}</TD>
                      <TD className="max-w-64 text-[length:calc(var(--base)*0.86)]">
                        {h.observation ?? "—"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            <p className="mt-2 text-[length:calc(var(--base)*0.82)] text-steel-400">
              Cumulative includes the opening balance of {meters(detail?.opening_meters)} m
              carried over at import.
            </p>
          </section>

          <section>
            <SectionHeading>Linked issues</SectionHeading>
            {(issues ?? []).length === 0 ? (
              <Card>
                <EmptyState title="Nothing has been blamed on this cylinder." />
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-steel-200">
                  {(issues ?? []).map((o) => (
                    <li key={o.id} className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{o.title}</span>
                        <Badge tone={severityTone(o.severity)}>{humanise(o.severity)}</Badge>
                        <span className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                          {humanise(o.area)} · {relativeDays(o.observed_at)}
                        </span>
                      </div>
                      {o.description && (
                        <p className="mt-1 text-[length:calc(var(--base)*0.9)] text-ink-600">
                          {o.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeading>Specification</SectionHeading>
            <Card>
              <CardBody className="space-y-3">
                <DataPoint label="Base number" value={detail?.base_no} />
                <DataPoint label="Circumference" value={detail?.circumference_mm ? `${decimal(detail.circumference_mm)} mm` : null} />
                <DataPoint label="Face width" value={detail?.face_width_mm ? `${decimal(detail.face_width_mm)} mm` : null} />
                <DataPoint label="Screen" value={c.screen_lpi ? `${c.screen_lpi} LPI` : null} />
                <DataPoint label="Stylus angle" value={detail?.stylus_angle ? `${decimal(detail.stylus_angle)}°` : null} />
                <DataPoint label="Cell depth" value={detail?.cell_depth_micron ? `${decimal(detail.cell_depth_micron)} µ` : null} />
                <DataPoint label="Engraver" value={one<{ name: string }>(detail?.suppliers)?.name} numeric={false} />
                <DataPoint label="Location" value={detail?.location} numeric={false} />
                <DataPoint
                  label="Life limit"
                  value={`${meters(c.life_limit_meters)} m${detail?.life_limit_override ? " (override)" : " (by rule)"}`}
                />
                {detail?.notes && (
                  <div className="border-t border-steel-200 pt-3">
                    <p className="text-[length:calc(var(--base)*0.86)] text-ink-900">{detail.notes}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <SectionHeading>Service events</SectionHeading>
            <Card>
              {(events ?? []).length === 0 ? (
                <EmptyState title="No events recorded. Log the engrave date so surface life has a start point." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {(events ?? []).map((e) => {
                    const restores = ["engraved", "re_engraved", "chrome_plated"].includes(e.event_type)
                    return (
                      <li
                        key={e.id}
                        className={restores ? "bg-signal-info-bg p-3" : "p-3"}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold text-ink-900">
                            {humanise(e.event_type)}
                          </span>
                          <span data-numeric="" className="text-[length:calc(var(--base)*0.8)] text-ink-600">
                            {shortDate(e.event_date)}
                          </span>
                        </div>
                        <p data-numeric="" className="text-[length:calc(var(--base)*0.82)] text-ink-600">
                          at {meters(e.meters_at_event)} m
                          {one<{ name: string }>(e.suppliers)?.name
                            ? ` · ${(e.suppliers as { name: string }).name}`
                            : ""}
                          {e.cost ? ` · ${e.currency ?? "PKR"} ${decimal(e.cost, 0)}` : ""}
                        </p>
                        {restores && (
                          <p className="text-[length:calc(var(--base)*0.78)] text-signal-info">
                            Surface life reset from here
                          </p>
                        )}
                        {e.description && (
                          <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-900">
                            {e.description}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            {can.editCylinders(profile.role) && (
              <div className="mt-4">
                <CylinderEventForm
                  cylinderId={cylinderId}
                  currentMeters={Number(c.lifetime_meters ?? 0)}
                  suppliers={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
