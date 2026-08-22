import { PageHeader, SectionHeading } from "@/components/ui/page-header"
import { Card, CardHeader, CardBody } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { Input, Textarea, Select } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"
import { Stat } from "@/components/ui/stat"
import { WearBar } from "@/components/cylinder/WearGauge"
import { StationRail } from "@/components/run/StationRail"

export const metadata = { title: "Design tokens" }

const NEUTRALS = [
  ["--ink-900", "Primary text, kiosk surfaces"],
  ["--ink-600", "Secondary text"],
  ["--steel-400", "Tertiary text, disabled"],
  ["--steel-200", "Hairlines, borders"],
  ["--paper-100", "App background"],
  ["--paper-000", "Cards, grid rows"],
]

const SIGNALS = [
  ["--signal-ok", "OK"],
  ["--signal-warn", "Check"],
  ["--signal-critical", "Stop"],
  ["--signal-info", "Note"],
]

const STATIONS = [
  ["--stn-cyan", "Cyan"],
  ["--stn-magenta", "Magenta"],
  ["--stn-yellow", "Yellow"],
  ["--stn-black", "Black"],
  ["--stn-ground", "Ground"],
  ["--stn-white", "White"],
  ["--stn-self1", "Self 1"],
  ["--stn-self2", "Self 2"],
]

const DEMO_STATIONS = [
  { station_no: 1, colour_name: "Cyan", cylinder_id: "x", running_viscosity_sec: 18, meters_run: 1000 },
  { station_no: 2, colour_name: "Magenta", cylinder_id: "x", running_viscosity_sec: 18, meters_run: 1000 },
  { station_no: 3, colour_name: "Yellow" },
  { station_no: 4, colour_name: "Black", previous_issue_note: "Doctor blade lines from 65k m" },
  { station_no: 5, colour_name: "Ground" },
  { station_no: 6, colour_name: "Self Colour 1", previous_issue_note: "Viscosity drift after 2 hrs" },
  { station_no: 7, colour_name: "Self Colour 2", is_idle: true },
  { station_no: 8, colour_name: "White", is_idle: true },
]

/**
 * The token showcase from Phase 0.
 *
 * It exists so the rules in plan Section 4 are checkable rather than
 * aspirational: if a screen drifts off these tokens, the drift is visible here
 * side by side.
 */
export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-5xl p-8" data-shell="desktop">
      <PageHeader
        title="Design tokens"
        subtitle="Six neutrals, four signals, eight data swatches. The chrome is achromatic and the only saturated colour on screen is data colour."
      />

      <section className="mb-8">
        <SectionHeading>Neutrals</SectionHeading>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-steel-200 sm:grid-cols-3">
          {NEUTRALS.map(([token, use]) => (
            <div key={token} className="bg-paper-000 p-3">
              <div
                className="mb-2 h-12 rounded-[var(--radius)] border border-steel-200"
                style={{ background: `var(${token})` }}
              />
              <p data-numeric="" className="text-[length:calc(var(--base)*0.82)] text-ink-900">
                {token}
              </p>
              <p className="text-[length:calc(var(--base)*0.78)] text-ink-600">{use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHeading>Signals</SectionHeading>
        <p className="mb-3 text-[length:calc(var(--base)*0.86)] text-ink-600">
          Every status colour is paired with a word or a shape. Colour is never
          the only carrier of meaning.
        </p>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-steel-200 sm:grid-cols-4">
          {SIGNALS.map(([token, word]) => (
            <div key={token} className="bg-paper-000 p-3">
              <div
                className="mb-2 h-12 rounded-[var(--radius)]"
                style={{ background: `var(${token})` }}
              />
              <p data-numeric="" className="text-[length:calc(var(--base)*0.82)] text-ink-900">
                {token}
              </p>
              <p className="text-[length:calc(var(--base)*0.78)] text-ink-600">{word}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="ok">Complete</Badge>
          <Badge tone="warn">Previous issue</Badge>
          <Badge tone="critical">Rejected</Badge>
          <Badge tone="info">Scheduled</Badge>
          <Badge tone="neutral">Idle</Badge>
        </div>
      </section>

      <section className="mb-8">
        <SectionHeading>Station swatches</SectionHeading>
        <p className="mb-3 text-[length:calc(var(--base)*0.86)] text-ink-600">
          The real inks, used only as swatches. The yellow swatch never carries
          text.
        </p>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-steel-200 bg-steel-200 sm:grid-cols-4 lg:grid-cols-8">
          {STATIONS.map(([token, name]) => (
            <div key={token} className="bg-paper-000 p-3">
              <div
                className="mb-2 h-12 rounded-[var(--radius)] border border-steel-200"
                style={{ background: `var(${token})` }}
              />
              <p className="text-[length:calc(var(--base)*0.78)] text-ink-900">{name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionHeading>Type</SectionHeading>
        <Card>
          <CardBody className="space-y-3">
            <p className="text-[length:calc(var(--base)*1.6)] font-semibold">
              IBM Plex Sans, semibold — page titles
            </p>
            <p className="text-[length:var(--base)]">
              IBM Plex Sans, regular — body text at the base size
            </p>
            <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
              IBM Plex Sans, regular, small — secondary text
            </p>
            <p className="text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-steel-400">
              Uppercase label — section headings
            </p>
            <div className="border-t border-steel-200 pt-3">
              <p data-numeric="" className="text-[length:calc(var(--base)*1.2)]">
                842,000 / 1,000,000 m
              </p>
              <p data-numeric="" className="text-[length:calc(var(--base)*1.2)]">
                118,400 / 1,000,000 m
              </p>
              <p className="mt-1 text-[length:calc(var(--base)*0.82)] text-ink-600">
                IBM Plex Mono, tabular figures. On the grid the operator scans a
                column for the one value that differs from the other seven, and
                proportional digits break that scan.
              </p>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading>Controls</SectionHeading>
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Close run</Button>
              <Button variant="outline">Save changes</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="link">Learn more</Button>
              <Button variant="danger">Delete run</Button>
              <Button variant="outline" disabled>Disabled</Button>
            </div>
            <p className="text-[length:calc(var(--base)*0.82)] text-ink-600">
              Exactly one filled button per screen. Everything else is outline,
              ghost or text.
            </p>

            <div className="grid gap-4 border-t border-steel-200 pt-4 sm:grid-cols-3">
              <Field label="Job number" htmlFor="s-1" required hint="Your own number.">
                <Input id="s-1" placeholder="GR-2548" />
              </Field>
              <Field label="Viscosity" htmlFor="s-2">
                <Input id="s-2" numeric defaultValue="18.5" />
              </Field>
              <Field label="Result" htmlFor="s-3">
                <Select id="s-3">
                  <option>OK</option>
                  <option>OK with issues</option>
                  <option>Rejected</option>
                </Select>
              </Field>
              <Field label="Remarks" htmlFor="s-4" className="sm:col-span-3">
                <Textarea id="s-4" placeholder="What the next shift should know" />
              </Field>
              <Field label="Meters" htmlFor="s-5" error="Meters must be entered before closing the run.">
                <Input id="s-5" numeric aria-invalid />
              </Field>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading>Messages</SectionHeading>
        <div className="space-y-3">
          <Alert tone="critical" title="Machine change">
            Last run was on G-02, this run is on G-01. Tension and dryer settings
            below may not transfer.
          </Alert>
          <Alert tone="warn" title="Cylinder alert">
            C-104 is at 84% of its surface life and marked worn.
          </Alert>
          <Alert tone="ok" title="Run closed">
            Produced 62,000 m with 3.4% waste by meters.
          </Alert>
          <Alert tone="info" title="No history for this job yet">
            This job has no completed run to learn from.
          </Alert>
        </div>
      </section>

      <section className="mb-8">
        <SectionHeading>Data display</SectionHeading>
        <div className="mb-4 grid gap-4 sm:grid-cols-4">
          <Stat label="Runs this week" value={14} hint="9 completed" />
          <Stat label="Average waste" value="4.2%" tone="warn" hint="By meters" />
          <Stat label="Cylinders near life" value={3} tone="critical" hint="1 past 95%" />
          <Stat label="Open notes" value={0} tone="ok" hint="All cleared" />
        </div>

        <Card className="mb-4">
          <CardHeader title="Cylinder wear" description="Surface meters, not lifetime meters." />
          <CardBody className="space-y-4">
            <WearBar used={310_000} limit={1_000_000} />
            <WearBar used={842_000} limit={1_000_000} />
            <WearBar used={981_000} limit={1_000_000} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Empty state" />
          <EmptyState
            title="No runs today. Tap Start next run to begin."
            action={<Button variant="primary">Start next run</Button>}
          />
        </Card>
      </section>

      <section className="mb-8">
        <SectionHeading>The station rail</SectionHeading>
        <p className="mb-3 max-w-2xl text-[length:calc(var(--base)*0.86)] text-ink-600">
          Eight segments down the left edge, one per print unit, in the same
          order as the physical machine. It comes from the machine rather than
          from a design system, and on the kiosk it doubles as navigation.
        </p>
        <div className="max-w-md">
          <StationRail stations={DEMO_STATIONS} />
        </div>
      </section>

      <section>
        <SectionHeading>Density</SectionHeading>
        <p className="mb-3 text-[length:calc(var(--base)*0.86)] text-ink-600">
          One component library, two densities, switched by a root variable. The
          same button renders at 40px on the desktop and 64px on the kiosk from
          a single source.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-shell="desktop" className="rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-4">
            <p className="mb-2 text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-steel-400">
              Desktop · 40px targets
            </p>
            <Button variant="primary" size="full">Acknowledge and start run</Button>
          </div>
          <div data-shell="kiosk" className="rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-4">
            <p className="mb-2 text-[length:calc(var(--base)*0.78)] uppercase tracking-wide text-steel-400">
              Kiosk · 64px targets
            </p>
            <Button variant="primary" size="full">Acknowledge and start run</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
