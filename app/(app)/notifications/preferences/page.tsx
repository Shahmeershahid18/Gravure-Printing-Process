import Link from "next/link"
import { requireProfile, roleLabel } from "@/lib/auth"
import { getPreferences } from "@/lib/actions/notifications"
import { PageHeader } from "@/components/ui/page-header"
import { buttonVariants } from "@/components/ui/button"
import { PreferencesForm } from "./preferences-form"

export const metadata = { title: "Notification preferences" }

export default async function PreferencesPage() {
  const profile = await requireProfile()
  const rows = await getPreferences()

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Notifications", href: "/notifications" }, { label: "Preferences" }]}
        title="Choose what you hear"
        subtitle={`These are your settings, not your role's. You are signed in as ${roleLabel(
          profile.role
        )}, and each kind below is sent to a set of roles an admin controls.`}
        action={
          <Link href="/notifications" className={buttonVariants({ variant: "outline" })}>
            Back to notifications
          </Link>
        }
      />
      <PreferencesForm rows={rows} />
    </div>
  )
}
