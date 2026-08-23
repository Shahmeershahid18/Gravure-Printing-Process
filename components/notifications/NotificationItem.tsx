"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  categoryLabel,
  relativeTime,
  severityLabel,
  severityTone,
  type Notification,
} from "@/lib/notifications"

/**
 * One line in the bell and one row on the inbox page, from one component.
 *
 * Unread is marked three ways, on purpose: a filled marker on the left, a
 * heavier title, and the word "New" in the meta line. Colour alone would fail
 * rule 4, and weight alone disappears in a list where several rows are unread.
 */
export function NotificationItem({
  notification: n,
  onOpen,
  onToggleRead,
  onArchive,
  compact = false,
}: {
  notification: Notification
  onOpen?: () => void
  onToggleRead?: () => void
  onArchive?: () => void
  compact?: boolean
}) {
  const unread = n.read_at === null

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "mt-[0.45em] block h-1.5 w-1.5 shrink-0 rounded-full",
          unread ? "bg-accent" : "bg-transparent"
        )}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[length:calc(var(--base)*0.92)] text-ink-900",
            unread ? "font-semibold" : "font-normal"
          )}
        >
          {n.title}
        </span>

        {n.body && (
          <span
            className={cn(
              "mt-0.5 block text-[length:calc(var(--base)*0.84)] text-ink-600",
              compact && "line-clamp-2"
            )}
          >
            {n.body}
          </span>
        )}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:calc(var(--base)*0.78)] text-steel-400">
          {n.severity !== "info" && (
            <Badge tone={severityTone(n.severity)} className="py-0">
              {severityLabel(n.severity)}
            </Badge>
          )}
          <span className="text-ink-600">{categoryLabel(n.category)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={n.created_at}>{relativeTime(n.created_at)}</time>
          {n.actor_name && (
            <>
              <span aria-hidden="true">·</span>
              <span>{n.actor_name}</span>
            </>
          )}
          {unread && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-ink-600">New</span>
            </>
          )}
        </span>
      </span>
    </>
  )

  const rowClass = cn(
    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
    "hover:bg-paper-100",
    unread && "bg-accent-bg/40"
  )

  return (
    <div className={cn("group relative border-b border-steel-200 last:border-b-0")}>
      {n.link_path ? (
        <Link href={n.link_path} onClick={onOpen} className={rowClass}>
          {body}
        </Link>
      ) : (
        <div className={cn(rowClass, "cursor-default")}>{body}</div>
      )}

      {/* Row actions. Present in the DOM rather than revealed on hover only:
          the inbox is reachable from a tablet, where there is no hover. */}
      {(onToggleRead || onArchive) && !compact && (
        <div className="flex items-center gap-3 px-3 pb-2.5 pl-8">
          {onToggleRead && (
            <button
              type="button"
              onClick={onToggleRead}
              className="text-[length:calc(var(--base)*0.78)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              {unread ? "Mark read" : "Mark unread"}
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="text-[length:calc(var(--base)*0.78)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
