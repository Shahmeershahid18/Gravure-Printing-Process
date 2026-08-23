"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { num } from "@/lib/format"
import { pruneActivity } from "@/lib/actions/control"

const WINDOWS = [30, 90, 180, 365]

/**
 * Cutting the log back.
 *
 * Deleting audit history is the most destructive thing this console can do and
 * the one act it cannot record honestly -- the record of the deletion outlives
 * only because it is written after. So it confirms, it names the number of
 * days rather than a vague "old entries", and the change records are a
 * separate opt-in from the activity stream, because those two have different
 * reasons to exist and wiping the second by accident while tidying the first
 * would destroy the trail a supervisor relies on.
 */
export function RetentionControl() {
  const router = useRouter()
  const [days, setDays] = React.useState(180)
  const [includeAudit, setIncludeAudit] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null)

  const run = async () => {
    setBusy(true)
    setResult(null)
    const res = await pruneActivity(days, includeAudit)
    setBusy(false)
    setConfirming(false)

    if (!res.ok) {
      setResult({ ok: false, message: res.error ?? "Nothing was removed." })
      return
    }
    setResult({
      ok: true,
      message: `Removed ${num(res.deleted ?? 0)} activity entries${
        includeAudit ? ` and ${num(res.auditDeleted ?? 0)} change records` : ""
      }.`,
    })
    router.refresh()
  }

  return (
    <Card>
      <CardHeader
        title="Retention"
        description="Nothing prunes itself. Both logs grow until they are cut back here."
      />
      <CardBody className="space-y-4">
        {result && <Alert tone={result.ok ? "ok" : "critical"}>{result.message}</Alert>}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[length:calc(var(--base)*0.86)] text-ink-600">Keep the last</span>
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={days === w}
              onClick={() => {
                setDays(w)
                setConfirming(false)
              }}
              className={
                days === w
                  ? "min-h-[var(--tap-sm)] rounded-[var(--radius)] border border-ink-900 bg-ink-900 px-3 text-[length:calc(var(--base)*0.86)] font-semibold text-paper-000"
                  : "min-h-[var(--tap-sm)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-3 text-[length:calc(var(--base)*0.86)] text-ink-600 hover:bg-paper-100"
              }
            >
              {w} days
            </button>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-steel-200 pt-3">
          <div className="min-w-0">
            <div className="text-[length:calc(var(--base)*0.9)] font-semibold text-ink-900">
              Also remove change records
            </div>
            <p className="mt-0.5 text-[length:calc(var(--base)*0.82)] text-ink-600">
              The before-and-after history on Changes, which supervisors read
              when investigating a reject. Left off, only the activity stream is
              cut.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-[length:calc(var(--base)*0.8)] text-ink-600">
              {includeAudit ? "Yes" : "No"}
            </span>
            <Switch
              checked={includeAudit}
              onCheckedChange={(v) => {
                setIncludeAudit(v)
                setConfirming(false)
              }}
              aria-label="Also remove change records"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void run()} disabled={busy}>
                {busy
                  ? "Removing…"
                  : `Permanently remove everything older than ${days} days`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Prune the log
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
