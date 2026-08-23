import Link from "next/link"
import { ShieldIcon, ExternalLinkIcon } from "lucide-react"
import { requireSuperAdmin } from "@/lib/auth"
import { ControlNav } from "@/components/control/ControlNav"
import { ActivityTracker } from "@/components/activity/ActivityTracker"

/**
 * The console shell.
 *
 * A third shell rather than a section of the desktop one, for the same reason
 * the kiosk is not a responsive breakpoint: different audience, different job.
 * Practically it also means no part of the console can be reached by a URL
 * that happens to render inside the ordinary layout, and the ordinary layout's
 * navigation never has to know this exists.
 *
 * The header is inverted -- ink, not paper. That is the one deliberate visual
 * break from the rest of the product, and it is doing a job rather than
 * decorating: this account also holds an ordinary admin role and works in the
 * ordinary shell, so it needs to be able to tell at a glance which of the two
 * it is looking at before it deletes somebody. Everything below the header
 * stays in the house style, because the tables here are read the same way the
 * tables everywhere else are.
 *
 * requireSuperAdmin() calls notFound(), not redirect(). Every other visitor --
 * an admin, a viewer, a stale session -- gets the same 404 the app returns for
 * any path that was never routed. Nothing distinguishes "you may not" from
 * "there is nothing here", which is the whole requirement.
 */
export const metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
}

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSuperAdmin()

  return (
    <div data-shell="desktop" className="flex h-screen w-full flex-col overflow-hidden bg-paper-100">
      <ActivityTracker />

      <header className="flex h-14 shrink-0 items-center gap-3 bg-ink-900 px-3 text-paper-000 sm:px-4">
        <Link href="/control" className="flex items-center gap-2">
          <ShieldIcon aria-hidden="true" className="h-4 w-4" />
          <span className="text-[length:calc(var(--base)*1.05)] font-semibold tracking-tight">
            Console
          </span>
        </Link>

        <span
          className="hidden rounded-[var(--radius)] border border-paper-000/25 px-2 py-0.5 text-[length:calc(var(--base)*0.72)] font-semibold uppercase tracking-wide text-paper-000/70 sm:inline"
          title="This account is absent from every other person's view of the system."
        >
          Hidden
        </span>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[length:calc(var(--base)*0.82)] text-paper-000/70 md:inline">
            {profile.full_name}
          </span>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-[var(--radius)] border border-paper-000/25 px-2.5 py-1 text-[length:calc(var(--base)*0.82)] text-paper-000 transition-colors hover:bg-paper-000/10"
          >
            <ExternalLinkIcon aria-hidden="true" className="h-3.5 w-3.5" />
            The app
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Rail collapses above the content on narrow screens rather than
            becoming a drawer: five items fit, and a drawer on a monitoring
            screen is one more tap between noticing something and acting. */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-steel-200 bg-paper-000 lg:block">
          <ControlNav />
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="border-b border-steel-200 bg-paper-000 lg:hidden">
            <ControlNav />
          </div>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
