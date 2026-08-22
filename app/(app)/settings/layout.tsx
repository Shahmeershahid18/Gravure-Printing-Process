import { requireRole } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { SettingsNav } from "@/components/shell/SettingsNav"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin", "planner")

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="The lookups every run depends on. Get these right and the operator never types a name twice."
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav isAdmin={profile.role === "admin"} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
