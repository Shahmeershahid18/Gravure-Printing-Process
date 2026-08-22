import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { getRun } from "@/lib/queries/run"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { Badge, runStatusTone, humanise } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { RunTabs } from "@/components/kiosk/RunTabs"

/**
 * Run entry, in three passes plus the close -- plan Section 2.1, step 6.
 * The header stays put so the operator never loses which run he is in when
 * the reel change interrupts him halfway through the second pass.
 */
export default async function RunLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  await requireRole("operator")
  if (!(await getActiveOperator())) redirect("/kiosk/login")

  const run = await getRun(runId)
  if (!run) notFound()

  const locked = Boolean(run.locked_at)

  return (
    <div className="flex min-h-full flex-col gap-[var(--gap)]">
      <header className="rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                data-numeric=""
                className="text-[length:calc(var(--base)*1.3)] font-semibold text-ink-900"
              >
                Run {run.run_no}
              </h2>
              <Badge tone={runStatusTone(run.status)}>{humanise(run.status)}</Badge>
              {locked && <Badge tone="neutral">Locked</Badge>}
            </div>
            <p data-numeric="" className="truncate text-[length:var(--base)] text-ink-900">
              {run.job?.job_file_no} · {run.job?.job_no}
            </p>
            <p className="truncate text-[length:calc(var(--base)*0.86)] text-ink-600">
              {run.job?.product_name}
              {run.job?.customer ? ` · ${run.job.customer}` : ""} · {run.job?.structure}
              {run.revision_label ? ` · ${run.revision_label}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[length:calc(var(--base)*0.76)] uppercase tracking-wide text-ink-600">
              Machine
            </p>
            <p
              data-numeric=""
              className="text-[length:calc(var(--base)*1.3)] font-semibold text-ink-900"
            >
              {run.machine?.code ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-[var(--gap)] flex flex-wrap items-center gap-[var(--gap)]">
          <RunTabs runId={runId} />
          <Link
            href="/kiosk"
            className="ml-auto flex h-[var(--tap)] items-center rounded-[var(--radius)] border border-steel-200 px-4 font-semibold text-ink-900 hover:bg-paper-100"
          >
            Machine home
          </Link>
        </div>
      </header>

      {locked && (
        <Alert tone="info" title="This run is locked">
          It closed more than 24 hours ago. A supervisor can reopen it from the
          desktop if something needs correcting.
        </Alert>
      )}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
