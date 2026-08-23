import { requireRole } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import { getActiveOperator } from "@/lib/actions/kiosk-auth"
import { KioskBar } from "@/components/kiosk/KioskBar"
import { SyncManager } from "@/components/kiosk/SyncManager"
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh"
import { ActivityTracker } from "@/components/activity/ActivityTracker"

/**
 * The kiosk shell -- tablet, clamped near a press, gloves on.
 *
 * Large targets, no sidebar, no dense tables, one task per screen. The density
 * switch on data-shell does the work; there is no second component library
 * (plan Sections 4.2 and 9).
 */
export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  // The tablet is signed in as the machine account, which carries role
  // 'operator' and a default_machine_id set by IT at install.
  const profile = await requireRole("operator")
  const operator = await getActiveOperator()

  let machineCode = profile.machine_code
  if (!machineCode && profile.default_machine_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("machines")
      .select("code")
      .eq("id", profile.default_machine_id)
      .maybeSingle()
    machineCode = data?.code ?? null
  }

  return (
    <div
      data-shell="kiosk"
      className="flex h-screen w-full flex-col overflow-hidden bg-paper-100"
    >
      <KioskBar
        machineCode={machineCode}
        operatorName={operator?.name ?? null}
        title={machineCode ? `Machine ${machineCode}` : "Intaglio"}
        userId={profile.id}
      />
      <ActivityTracker />
      <SyncManager />
      {/* The tablet is the one screen most likely to be looking at a run a
          supervisor is correcting from the office at the same moment. */}
      <RealtimeRefresh />
      <main className="min-h-0 flex-1 overflow-y-auto p-[var(--gap)]">{children}</main>
    </div>
  )
}
