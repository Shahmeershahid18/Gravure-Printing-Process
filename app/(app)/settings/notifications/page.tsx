import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { SectionHeading } from "@/components/ui/page-header"
import { RoutingTable, type RoutingRow } from "./routing-table"
import { BroadcastForm } from "@/components/control/BroadcastForm"

export const metadata = { title: "Notifications" }

/**
 * Who hears what, and the one place a person can put something in someone
 * else's notifications.
 *
 * Routing is admin-controlled and per-role; the per-person switches live at
 * /notifications/preferences, which every role can reach. Both matter: an
 * admin deciding QC does not need to hear about planned runs is an
 * organisational choice, and a QC inspector muting cylinder alerts is a
 * personal one. Neither can override the other into silence -- a category has
 * to be routed to your role *and* left on by you.
 */
export default async function NotificationSettingsPage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data } = await supabase
    .from("notification_types")
    .select("category, label, description, default_roles, default_enabled, sort_order")
    .order("sort_order")

  const rows: RoutingRow[] = (data ?? []).map((t) => ({
    category: t.category as string,
    label: t.label as string,
    description: t.description as string,
    roles: (t.default_roles ?? []) as string[],
    defaultEnabled: t.default_enabled as boolean,
  }))

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading>Who hears what</SectionHeading>
        <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
          Each kind of event goes to the roles ticked here. People can turn any
          of them off for themselves, but they cannot turn on something their
          role is not sent — so removing a role here is the way to stop a whole
          category reaching them.
        </p>
        <RoutingTable rows={rows} />
      </div>

      <div>
        <SectionHeading>Send an announcement</SectionHeading>
        <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
          Lands in people&apos;s notifications alongside runs and issues, and on
          the tablet alongside everything else the press has been told. It is
          attributed to you and recorded.
        </p>
        <BroadcastForm />
      </div>
    </div>
  )
}
