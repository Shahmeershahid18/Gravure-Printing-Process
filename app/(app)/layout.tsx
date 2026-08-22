import { requireProfile, roleLabel, initials } from "@/lib/auth"
import { Sidebar } from "@/components/shell/Sidebar"
import { AccountMenu } from "@/components/shell/AccountMenu"
import { GlobalSearch } from "@/components/shell/GlobalSearch"

/**
 * The desktop shell -- planners, supervisors, QC and management.
 *
 * Deliberately not the same layout as the kiosk. Building these as one
 * responsive layout is a trap: different users, different hardware, different
 * jobs (plan Section 9).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile()

  return (
    <div data-shell="desktop" className="flex h-screen w-full overflow-hidden bg-paper-100">
      <Sidebar role={profile.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-steel-200 bg-paper-000 px-3 sm:px-4">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <AccountMenu
              name={profile.full_name}
              email={profile.email}
              roleLabel={roleLabel(profile.role)}
              initials={initials(profile.full_name)}
              machineCode={profile.machine_code}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
