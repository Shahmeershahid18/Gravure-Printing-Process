import Link from "next/link"
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
 * requireSuperAdmin() calls notFound(), not redirect(). Every other visitor --
 * signed in as an admin, signed in as a viewer, or holding a stale session --
 * gets the same 404 the app returns for any path that was never routed. There
 * is nothing to distinguish "you may not" from "there is nothing here", which
 * is the whole requirement.
 *
 * The console is not exempt from the log it displays. Everything done here is
 * recorded like everything else, marked as coming from a hidden actor.
 */
export const metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
}

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSuperAdmin()

  return (
    <div data-shell="desktop" className="min-h-screen bg-paper-100">
      <ActivityTracker />

      <header className="border-b border-steel-200 bg-paper-000">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/control"
            className="text-[length:calc(var(--base)*1.05)] font-semibold tracking-tight text-ink-900"
          >
            Console
          </Link>
          <span className="hidden text-[length:calc(var(--base)*0.8)] text-steel-400 sm:inline">
            {profile.full_name} · hidden account
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-[length:calc(var(--base)*0.86)] text-ink-600 underline underline-offset-2 hover:text-ink-900"
            >
              Back to the app
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ControlNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
