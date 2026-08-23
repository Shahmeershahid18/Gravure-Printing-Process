"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Segmented } from "@/components/ui/segmented"
import { useInbox } from "./useInbox"
import { NotificationItem } from "./NotificationItem"
import { CATEGORY_SHORT, type NotificationCategory } from "@/lib/notifications"

const PAGE = 50

/**
 * The inbox page.
 *
 * Client-rendered rather than server-rendered, unlike every other list in this
 * product, and for one reason: it shares the live socket the bell already
 * holds. A server-rendered inbox would show a count in the header that
 * disagreed with the list beneath it for as long as the page sat open, which
 * is exactly the screen someone leaves open.
 */
export function NotificationInbox({ userId }: { userId: string }) {
  const router = useRouter()
  // Opens on All, not Unread. The segmented control carries the unread count
  // beside it, so nothing is hidden by this -- but landing on an empty screen
  // because you happen to be caught up reads as a broken page.
  const [filter, setFilter] = React.useState<"all" | "unread">("all")
  const [category, setCategory] = React.useState<NotificationCategory | "">("")
  const [limit, setLimit] = React.useState(PAGE)

  // Every mutation goes through the store rather than a second client of its
  // own, so the bell in the header above this list always shows the same
  // count as the list itself.
  const { rows, unread, loading, markRead, markUnread, markAllRead, archive, clearRead } =
    useInbox(userId, limit)

  const visible = React.useMemo(
    () =>
      rows.filter(
        (n) =>
          (filter === "all" || n.read_at === null) &&
          (category === "" || n.category === category)
      ),
    [rows, filter, category]
  )

  // Only the categories actually present, so the filter never offers a choice
  // that returns nothing.
  const categories = React.useMemo(() => {
    const present = new Set(rows.map((r) => r.category))
    return (Object.keys(CATEGORY_SHORT) as NotificationCategory[]).filter((c) =>
      present.has(c)
    )
  }, [rows])

  const toggleRead = (id: string, isUnread: boolean) =>
    isUnread ? markRead([id]) : markUnread(id)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: unread > 0 ? `Unread (${unread})` : "Unread" },
          ]}
        />

        {categories.length > 1 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NotificationCategory | "")}
            aria-label="Filter by kind"
            className={cn(
              "h-[var(--tap-sm)] rounded-[var(--radius)] border border-steel-200 bg-paper-000 px-2",
              "text-[length:calc(var(--base)*0.86)] text-ink-900"
            )}
          >
            <option value="">Every kind</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_SHORT[c]}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await clearRead()
              router.refresh()
            }}
          >
            Clear read
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="px-4 py-10 text-center text-[length:calc(var(--base)*0.9)] text-ink-600">
            Loading…
          </p>
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              filter === "unread"
                ? "Nothing unread. Switch to All to see everything you have been told."
                : "No notifications yet. Runs, issues, cylinder alerts and artwork approvals arrive here as they happen."
            }
          />
        ) : (
          visible.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onOpen={() => {
                void markRead([n.id])
                router.refresh()
              }}
              onToggleRead={() => void toggleRead(n.id, n.read_at === null)}
              onArchive={() => void archive(n.id)}
            />
          ))
        )}
      </Card>

      {/* Only offered when the page is full, since a shorter list is already
          everything there is. */}
      {!loading && rows.length >= limit && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
            Show older
          </Button>
        </div>
      )}
    </div>
  )
}
