/**
 * Notification vocabulary.
 *
 * Free of any server import, like lib/roles.ts, so the bell in the header and
 * the inbox page can both use it without dragging next/headers into the
 * browser bundle.
 *
 * The category list mirrors the `notification_category` enum in
 * 20260823210000_notifications.sql. If one gains a member the other must too --
 * the database is the source of truth for routing and defaults, this file is
 * the source of truth for what a person reads.
 */

import type { Tone } from "@/components/ui/badge"

export type NotificationCategory =
  | "run_planned"
  | "run_started"
  | "run_completed"
  | "run_aborted"
  | "run_locked"
  | "observation_raised"
  | "observation_critical"
  | "next_run_note"
  | "cylinder_wear"
  | "cylinder_condition"
  | "job_created"
  | "job_status"
  | "artwork_revision"
  | "artwork_approval"
  | "user_changed"
  | "broadcast"

export type NotificationSeverity = "info" | "success" | "warning" | "critical"

export type Notification = {
  id: string
  category: NotificationCategory
  severity: NotificationSeverity
  title: string
  body: string | null
  link_path: string | null
  entity_type: string | null
  entity_id: string | null
  actor_name: string | null
  created_at: string
  read_at: string | null
  archived_at: string | null
}

/** The columns the inbox needs. Never `select *` -- see the pin_hash lesson. */
export const NOTIFICATION_COLUMNS =
  "id, category, severity, title, body, link_path, entity_type, entity_id, actor_name, created_at, read_at, archived_at"

/**
 * Severity drives the badge, and the badge already carries a shape glyph
 * alongside its colour, so this stays a plain mapping -- rule 4 is handled one
 * level down rather than restated here.
 */
export function severityTone(severity: NotificationSeverity): Tone {
  switch (severity) {
    case "critical": return "critical"
    case "warning":  return "warn"
    case "success":  return "ok"
    default:         return "info"
  }
}

export function severityLabel(severity: NotificationSeverity): string {
  switch (severity) {
    case "critical": return "Critical"
    case "warning":  return "Attention"
    case "success":  return "Done"
    default:         return "Info"
  }
}

/**
 * Groups on the preferences screen. The floor does not think in sixteen event
 * types; it thinks in "the press", "quality", "the plant" and "the office".
 */
export const CATEGORY_GROUPS: { heading: string; categories: NotificationCategory[] }[] = [
  {
    heading: "On the press",
    categories: ["run_planned", "run_started", "run_completed", "run_aborted", "run_locked"],
  },
  {
    heading: "Quality",
    categories: ["observation_critical", "observation_raised", "next_run_note"],
  },
  {
    heading: "Plant",
    categories: ["cylinder_wear", "cylinder_condition"],
  },
  {
    heading: "Office",
    categories: ["job_created", "job_status", "artwork_revision", "artwork_approval", "user_changed"],
  },
  {
    heading: "Announcements",
    categories: ["broadcast"],
  },
]

/**
 * A short label for the notification row itself, distinct from the long label
 * on the preferences screen -- an inbox line has a title of its own and does
 * not need the category restated at full length beside it.
 */
export const CATEGORY_SHORT: Record<NotificationCategory, string> = {
  run_planned:          "Run planned",
  run_started:          "Run started",
  run_completed:        "Run completed",
  run_aborted:          "Run aborted",
  run_locked:           "Run locked",
  observation_raised:   "Issue",
  observation_critical: "Critical issue",
  next_run_note:        "Next run",
  cylinder_wear:        "Cylinder life",
  cylinder_condition:   "Cylinder",
  job_created:          "New job",
  job_status:           "Job status",
  artwork_revision:     "Artwork",
  artwork_approval:     "Approval",
  user_changed:         "Account",
  broadcast:            "Announcement",
}

export function categoryLabel(category: string): string {
  return CATEGORY_SHORT[category as NotificationCategory] ?? category.replace(/_/g, " ")
}

/**
 * "4 minutes ago". lib/format.ts has relativeDays, which is right for a
 * cylinder last used three weeks back and useless for a notification raised
 * during this shift -- everything today would read "today".
 */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"

  const secs = Math.round((Date.now() - d.getTime()) / 1000)
  if (secs < 45) return "just now"
  if (secs < 90) return "a minute ago"

  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} minutes ago`

  const hours = Math.round(mins / 60)
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`

  const days = Math.round(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`

  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
