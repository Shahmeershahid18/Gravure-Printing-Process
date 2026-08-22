"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { createObservation } from "@/lib/actions/observations"
import { Switch } from "@/components/ui/switch"
import { Alert } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const AREAS = [
  "registration", "ink", "substrate", "cylinder", "machine",
  "drying", "tension", "static", "adhesion", "doctor_blade", "other",
] as const

const SEVERITIES = ["minor", "major", "critical"] as const

/**
 * Quick observation, three taps -- plan Section 10.4. Target: 15 seconds.
 *
 *   1. Tap the issue button on a station row or the run header
 *   2. Pick an area chip, then a title from issue_templates
 *   3. Optional photo, one line of action taken, and the next-run toggle
 *
 * The operator will log nothing if it takes a form, so severity, timestamps
 * and every foreign key are inferred server-side rather than asked for.
 */
export function QuickObservationDialog({
  open,
  onClose,
  templates,
  jobFileId,
  runId,
  runStationId,
  stationNo,
  cylinderId,
  inkBatchId,
  substrateBatchId,

}: {
  open: boolean
  onClose: () => void
  templates: { id: string; area: string; title: string; hint: string | null }[]
  jobFileId: string
  runId?: string | null
  runStationId?: string | null
  stationNo?: number | null
  cylinderId?: string | null
  inkBatchId?: string | null
  substrateBatchId?: string | null

}) {
  const router = useRouter()
  const [area, setArea] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState("")
  const [customTitle, setCustomTitle] = React.useState(false)
  const [severity, setSeverity] = React.useState<string>("minor")
  const [action, setAction] = React.useState("")
  const [checkNext, setCheckNext] = React.useState(false)
  const [photo, setPhoto] = React.useState<{ file: Blob; preview: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = React.useCallback(() => {
    setArea(null); setTitle(""); setCustomTitle(false); setSeverity("minor")
    setAction(""); setCheckNext(false); setError(null)
    setPhoto((p) => { if (p) URL.revokeObjectURL(p.preview); return null })
  }, [])

  React.useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const titlesForArea = templates.filter((t) => t.area === area)

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto((p) => {
      if (p) URL.revokeObjectURL(p.preview)
      return { file: compressed, preview: URL.createObjectURL(compressed) }
    })
  }

  const submit = async () => {
    if (!area) return setError("Pick the area first so this can be grouped.")
    if (!title.trim()) return setError("Pick or type a title.")

    setBusy(true)
    setError(null)

    let photo_urls: string[] = []
    if (photo) {
      try {
        const supabase = createClient()
        const path = `${jobFileId}/${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage
          .from("observation_photos")
          .upload(path, photo.file, { contentType: "image/jpeg", upsert: false })
        if (!upErr) {
          const { data } = supabase.storage.from("observation_photos").getPublicUrl(path)
          photo_urls = [data.publicUrl]
        }
        // A failed photo upload must never lose the observation itself. The
        // words are the valuable part; the picture is a bonus.
      } catch {
        /* keep going without the photo */
      }
    }

    const res = await createObservation({
      job_file_id: jobFileId,
      run_id: runId ?? null,
      run_station_id: runStationId ?? null,
      cylinder_id: cylinderId ?? null,
      ink_batch_id: inkBatchId ?? null,
      substrate_batch_id: substrateBatchId ?? null,
      area,
      severity,
      title: title.trim(),
      description: action.trim() || title.trim(),
      action_taken: action.trim() || null,
      next_run_note: checkNext ? action.trim() || title.trim() : null,
      photo_urls,
    })

    setBusy(false)
    if (!res.ok) return setError(res.error)
    onClose()
    router.refresh()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-[var(--gap)]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log an issue"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[var(--radius)] border border-steel-200 bg-paper-000"
      >
        <div className="border-b border-steel-200 px-[var(--gap)] py-3">
          <h2 className="text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
            Log an issue
          </h2>
          <p className="text-[length:calc(var(--base)*0.84)] text-ink-600">
            {stationNo ? `Station ${stationNo}` : "This run"} · everything else is
            filled in for you
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-[var(--gap)] overflow-y-auto p-[var(--gap)]">
          {error && <Alert tone="critical" title="Not logged yet">{error}</Alert>}

          {/* 1. Area */}
          <Step n={1} label="Where is it?">
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <Chip
                  key={a}
                  selected={area === a}
                  onClick={() => { setArea(a); setTitle(""); setCustomTitle(false) }}
                >
                  {a.replace(/_/g, " ")}
                </Chip>
              ))}
            </div>
          </Step>

          {/* 2. Title from the template library */}
          {area && (
            <Step n={2} label="What happened?">
              <div className="flex flex-wrap gap-2">
                {titlesForArea.map((t) => (
                  <Chip
                    key={t.id}
                    selected={!customTitle && title === t.title}
                    onClick={() => { setTitle(t.title); setCustomTitle(false) }}
                    title={t.hint ?? undefined}
                  >
                    {t.title}
                  </Chip>
                ))}
                <Chip
                  selected={customTitle}
                  onClick={() => { setCustomTitle(true); setTitle("") }}
                >
                  Something else
                </Chip>
              </div>
              {titlesForArea.length === 0 && !customTitle && (
                <p className="mt-2 text-[length:calc(var(--base)*0.84)] text-ink-600">
                  No templates for this area yet. Tap “Something else” and type it.
                </p>
              )}
              {customTitle && (
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short description, e.g. drift at high speed"
                  aria-label="Issue title"
                  className="mt-2 h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 px-3 text-[length:var(--base)]"
                />
              )}
            </Step>
          )}

          {/* 3. The rest is optional */}
          {title && (
            <Step n={3} label="What did you do about it?">
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. dropped infeed 12 to 9.5, held steady"
                aria-label="Action taken"
                className="h-[var(--tap)] w-full rounded-[var(--radius)] border border-steel-200 px-3 text-[length:var(--base)]"
              />

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[length:calc(var(--base)*0.84)] text-ink-600">
                    Severity
                  </span>
                  {SEVERITIES.map((s) => (
                    <Chip key={s} selected={severity === s} onClick={() => setSeverity(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>

              <label className="mt-3 flex items-center gap-3 rounded-[var(--radius)] border border-steel-200 p-3">
                <Switch
                  checked={checkNext}
                  onCheckedChange={setCheckNext}
                  aria-label="Check this next run"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink-900">
                    Check this next run
                  </span>
                  <span className="block text-[length:calc(var(--base)*0.82)] text-ink-600">
                    Puts this on the briefing before the next run of this job. A
                    supervisor clears it, not the grid.
                  </span>
                </span>
              </label>

              <div className="mt-3">
                <label className="inline-flex h-[var(--tap)] cursor-pointer items-center rounded-[var(--radius)] border border-steel-200 px-4 font-semibold text-ink-900 hover:bg-paper-100">
                  {photo ? "Retake photo" : "Add photo"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPickPhoto}
                    className="sr-only"
                  />
                </label>
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.preview}
                    alt="Photo of the issue"
                    className="mt-2 max-h-40 rounded-[var(--radius)] border border-steel-200"
                  />
                )}
              </div>
            </Step>
          )}
        </div>

        <div className="flex gap-[var(--gap)] border-t border-steel-200 p-[var(--gap)]">
          <button
            type="button"
            onClick={onClose}
            className="h-[var(--tap)] flex-1 rounded-[var(--radius)] border border-steel-200 font-semibold text-ink-900 hover:bg-paper-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !area || !title.trim()}
            className="h-[var(--tap)] flex-[2] rounded-[var(--radius)] bg-ink-900 font-semibold text-paper-000 hover:bg-ink-600 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Log issue"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[length:calc(var(--base)*0.82)] font-semibold uppercase tracking-wide text-ink-600">
        <span
          data-numeric=""
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-steel-200"
        >
          {n}
        </span>
        {label}
      </h3>
      {children}
    </section>
  )
}

function Chip({
  selected,
  onClick,
  children,
  title,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={cn(
        "h-[calc(var(--tap)*0.85)] rounded-[var(--radius)] border px-3 text-[length:calc(var(--base)*0.9)] font-semibold capitalize transition-colors",
        selected
          ? "border-ink-900 bg-ink-900 text-paper-000"
          : "border-steel-200 bg-paper-000 text-ink-900 hover:bg-paper-100"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Compress client side to max 1600px and roughly 200KB before upload -- plan
 * Section 13. At 100 runs a month with two photos each that stays under 500MB
 * a year, which is the difference between a storage line item and a problem.
 */
async function compressImage(file: File): Promise<Blob> {
  const MAX = 1600
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    for (const quality of [0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", quality)
      )
      if (blob && blob.size <= 220_000) return blob
      if (blob && quality === 0.4) return blob
    }
  } catch {
    /* fall through to the original */
  }
  return file
}
