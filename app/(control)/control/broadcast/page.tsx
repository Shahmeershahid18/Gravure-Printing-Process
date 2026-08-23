import { requireSuperAdmin } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { BroadcastForm } from "@/components/control/BroadcastForm"

export const metadata = { title: "Not found" }

export default async function BroadcastPage() {
  await requireSuperAdmin()

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Announce"
        subtitle="Put a message in people's notifications. It arrives the same way a run or an issue does, and it is attributed to whoever sends it."
      />
      <BroadcastForm />
    </div>
  )
}
