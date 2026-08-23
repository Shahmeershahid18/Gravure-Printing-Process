import Link from "next/link"
import { requireProfile } from "@/lib/auth"
import { PageHeader } from "@/components/ui/page-header"
import { buttonVariants } from "@/components/ui/button"
import { NotificationInbox } from "@/components/notifications/NotificationInbox"

export const metadata = { title: "Notifications" }

export default async function NotificationsPage() {
  const profile = await requireProfile()

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="What changed while you were looking somewhere else. Opening one takes you to the run, issue or cylinder it is about."
        action={
          <Link
            href="/notifications/preferences"
            className={buttonVariants({ variant: "outline" })}
          >
            Choose what you hear
          </Link>
        }
      />
      <NotificationInbox userId={profile.id} />
    </div>
  )
}
