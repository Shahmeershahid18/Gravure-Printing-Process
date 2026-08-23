"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInbox } from "@/components/notifications/useInbox"
import { relativeTime, severityLabel, severityTone } from "@/lib/notifications"

/**
 * Notifications on the tablet.
 *
 * The same data as the desktop bell, presented for a different situation. The
 * operator is standing at a press with gloves on and does not want an inbox;
 * they want to know whether anything has been said that changes what they are
 * about to do. So:
 *
 *   * A full-width sheet, not a 24rem dropdown pinned to a 16px icon.
 *   * Touch targets at --tap, which is 64px in this shell.
 *   * Critical items are pulled to the top regardless of age. On the desktop
 *     strict reverse-chronological is right because the reader is scanning; at
 *     the press, "the artwork was rejected" outranks "a run was planned" even
 *     if it arrived first.
 *   * Nothing pops up unbidden. An interstitial over the station grid during a
 *     make-ready is how an operator learns to dismiss things without reading
 *     them, and the one that matters is the one they dismiss.
 *
 * The tablet is signed in as the machine account, so this is the machine's
 * inbox. That is the correct scope: what reaches this press is what the people
 * working this press need, and the PIN attribution on top of it decides who is
 * accountable for the work, not who is addressed.
 */
export function KioskNotifications({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const { rows, unread, markRead, markAllRead, seen } = useInbox(userId, 25)

  React.useEffect(() => {
    if (open) seen()
  }, [open, seen])

  const sorted = React.useMemo(() => {
    const weight = (s: string) => (s === "critical" ? 0 : s === "warning" ? 1 : 2)
    return [...rows].sort((a, b) => {
      const unreadDiff = Number(a.read_at !== null) - Number(b.read_at !== null)
      if (unreadDiff !== 0) return unreadDiff
      const sev = weight(a.severity) - weight(b.severity)
      if (sev !== 0) return sev
      return b.created_at.localeCompare(a.created_at)
    })
  }, [rows])

  return (
    <>
      <Button
        variant={unread > 0 ? "primary" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
      >
        Messages{unread > 0 ? ` (${unread > 9 ? "9+" : unread})` : ""}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-ink-900/40"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Messages"
            className="flex h-full w-full max-w-xl flex-col border-l border-steel-200 bg-paper-000"
          >
            <div className="flex shrink-0 items-center gap-[var(--gap)] border-b border-steel-200 px-[var(--gap)] py-3">
              <h2 className="flex-1 text-[length:calc(var(--base)*1.1)] font-semibold text-ink-900">
                Messages
              </h2>
              {unread > 0 && (
                <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
                  Mark all read
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {sorted.length === 0 ? (
                <p className="px-[var(--gap)] py-10 text-center text-[length:var(--base)] text-ink-600">
                  No messages. Anything the office needs this machine to know
                  will appear here.
                </p>
              ) : (
                sorted.map((n) => {
                  const isUnread = n.read_at === null
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        void markRead([n.id])
                        if (n.link_path) {
                          setOpen(false)
                          router.push(n.link_path)
                        }
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 border-b border-steel-200",
                        "px-[var(--gap)] py-3 text-left transition-colors",
                        "min-h-[var(--tap)] hover:bg-paper-100",
                        isUnread && "bg-accent-bg/40"
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        {n.severity !== "info" && (
                          <Badge tone={severityTone(n.severity)}>
                            {severityLabel(n.severity)}
                          </Badge>
                        )}
                        <span
                          className={cn(
                            "text-[length:var(--base)] text-ink-900",
                            isUnread ? "font-semibold" : "font-normal"
                          )}
                        >
                          {n.title}
                        </span>
                      </span>
                      {n.body && (
                        <span className="text-[length:calc(var(--base)*0.9)] text-ink-600">
                          {n.body}
                        </span>
                      )}
                      <span className="text-[length:calc(var(--base)*0.8)] text-steel-400">
                        {relativeTime(n.created_at)}
                        {isUnread ? " · New" : ""}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
