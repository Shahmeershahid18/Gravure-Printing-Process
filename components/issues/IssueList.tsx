import Link from "next/link"
import { Badge, severityTone, humanise } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { clearNextRunNote } from "@/lib/actions/observations"
import { dateTime, relativeDays } from "@/lib/format"

export type IssueRow = {
  id: string
  title: string
  area: string
  severity: string
  description: string | null
  action_taken: string | null
  next_run_note: string | null
  next_run_note_cleared_at: string | null
  observed_at: string
  is_resolved: boolean
  photo_urls: string[] | null
  job_file_id: string
  run_id: string | null
  job_file_no?: string | null
  machine_code?: string | null
  run_no?: number | null
  station_no?: number | null
  reporter?: string | null
}

/**
 * One issue list for the job view and the cross-job explorer.
 *
 * Open next-run notes sort to the top because they are the only rows that
 * block something: everything else is history.
 */
export function IssueList({
  issues,
  canClear,
  showJob = false,
  emptyMessage,
}: {
  issues: IssueRow[]
  canClear: boolean
  showJob?: boolean
  emptyMessage: string
}) {
  if (issues.length === 0) {
    return (
      <Card>
        <EmptyState title={emptyMessage} />
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y divide-steel-200">
        {issues.map((o) => {
          const open = Boolean(o.next_run_note && !o.next_run_note_cleared_at)
          return (
            <li key={o.id} className={open ? "bg-signal-warn-bg" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{o.title}</span>
                    <Badge tone={severityTone(o.severity)}>{humanise(o.severity)}</Badge>
                    {o.is_resolved && <Badge tone="ok">Resolved</Badge>}
                    {open && <Badge tone="warn">Check next run</Badge>}
                  </div>

                  <p className="mt-0.5 text-[length:calc(var(--base)*0.8)] text-steel-400">
                    {humanise(o.area)}
                    {showJob && o.job_file_no && (
                      <>
                        {" · "}
                        <Link
                          href={`/jobs/${o.job_file_id}`}
                          data-numeric=""
                          className="hover:text-ink-900 hover:underline"
                        >
                          {o.job_file_no}
                        </Link>
                      </>
                    )}
                    {o.run_no != null && o.run_id && (
                      <>
                        {" · "}
                        <Link href={`/runs/${o.run_id}`} className="hover:text-ink-900 hover:underline">
                          Run {o.run_no}
                        </Link>
                      </>
                    )}
                    {o.station_no != null && ` · Station ${o.station_no}`}
                    {o.machine_code && ` · ${o.machine_code}`}
                    {" · "}
                    {dateTime(o.observed_at)} ({relativeDays(o.observed_at)})
                    {o.reporter && ` · ${o.reporter}`}
                  </p>

                  {o.description && o.description !== o.title && (
                    <p className="mt-1.5 text-[length:calc(var(--base)*0.92)] text-ink-900">
                      {o.description}
                    </p>
                  )}
                  {o.action_taken && (
                    <p className="mt-1 text-[length:calc(var(--base)*0.86)] text-ink-600">
                      <span className="font-semibold">Action:</span> {o.action_taken}
                    </p>
                  )}
                  {o.next_run_note && (
                    <p className="mt-2 rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 py-2 text-[length:calc(var(--base)*0.86)]">
                      <span className="font-semibold text-signal-warn">
                        {o.next_run_note_cleared_at ? "Was flagged: " : "Check next run: "}
                      </span>
                      {o.next_run_note}
                    </p>
                  )}

                  {o.photo_urls && o.photo_urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.photo_urls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                          {/* Storage serves these already compressed to ~200KB
                              client side, so the optimiser has nothing to add
                              and would only add a server round trip. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u}
                            alt={`Photo ${i + 1} of ${o.title}`}
                            className="h-20 rounded-[var(--radius)] border border-steel-200"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {open && canClear && (
                  <form action={clearNextRunNote} className="shrink-0">
                    <input type="hidden" name="observationId" value={o.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Clear note
                    </Button>
                  </form>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
