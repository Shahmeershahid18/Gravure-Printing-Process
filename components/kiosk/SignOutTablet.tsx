"use client"

import * as React from "react"
import { useFormStatus } from "react-dom"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Alert } from "@/components/ui/alert"

/**
 * Sign the machine account itself out of the tablet.
 *
 * Deliberately not next to Lock in the kiosk bar. Locking is the every-shift
 * action and must stay one tap away; this ends the Supabase session, so the
 * tablet needs its email and password again -- which on a night shift means
 * calling IT to the press. Plan Section 8 keeps the machine session alive
 * across shifts precisely to avoid that, so the exit lives on the operator
 * picker (nobody is mid-run there) behind a confirmation that states the cost.
 *
 * It exists for the cases the plan does not cover: retiring a tablet, moving
 * one to another machine, or a device that has gone missing.
 */
export function SignOutTablet({
  machineCode,
  unfinishedRuns,
}: {
  machineCode: string | null
  unfinishedRuns: number
}) {
  const [open, setOpen] = React.useState(false)
  const label = machineCode ? `Sign out ${machineCode}` : "Sign out this tablet"

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Sign out this tablet
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        description="This is not the same as locking."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <form action={signOut}>
              <Submit label={label} />
            </form>
          </>
        }
      >
        <div className="space-y-[var(--gap)]">
          <p className="leading-relaxed text-ink-900">
            Signing out ends this tablet&rsquo;s session with the server. Getting
            back in needs the machine account&rsquo;s email address and password,
            which operators do not have.
          </p>
          <p className="leading-relaxed text-ink-600">
            To hand the tablet over at the end of a shift you do not need this —
            the tablet is already locked, and the next operator just taps their
            name and enters a PIN. Only sign out if this tablet is being retired,
            moved to another machine, or has left the building.
          </p>

          {unfinishedRuns > 0 && (
            <Alert tone="warn" title="Runs on this machine are still open">
              {unfinishedRuns === 1
                ? "One run has not been closed. "
                : `${unfinishedRuns} runs have not been closed. `}
              Anything not yet saved from this tablet will be lost. Close the run
              first, or ask a supervisor to close it from the office.
            </Alert>
          )}
        </div>
      </Dialog>
    </>
  )
}

/** Disabled while the action runs, so a slow network cannot double-submit. */
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Signing out…" : label}
    </Button>
  )
}
