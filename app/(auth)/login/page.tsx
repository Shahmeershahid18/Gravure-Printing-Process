import { redirect } from "next/navigation"
import { getSessionProfile, landingFor } from "@/lib/auth"
import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in · GravureTrace" }

export default async function LoginPage() {
  // Already signed in: go where this role belongs rather than showing a form
  // that would immediately bounce.
  const profile = await getSessionProfile()
  if (profile) redirect(landingFor(profile.role))

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-100 p-4">
      <div className="w-full max-w-sm">
        {/* The wordmark is the only place the product names itself. */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-ink-900"
            >
              <span className="flex gap-[2px]">
                <span className="block h-3.5 w-[3px] bg-stn-cyan" />
                <span className="block h-3.5 w-[3px] bg-stn-magenta" />
                <span className="block h-3.5 w-[3px] bg-stn-yellow" />
              </span>
            </span>
            <span className="text-[length:calc(var(--base)*1.3)] font-semibold tracking-tight text-ink-900">
              GravureTrace
            </span>
          </div>
          <p className="mt-2 text-[length:calc(var(--base)*0.92)] text-ink-600">
            Gravure print traceability. Sign in to continue.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-[length:calc(var(--base)*0.82)] text-steel-400">
          Machine tablets sign in once with their machine account. Operators
          identify themselves with a PIN afterwards.
        </p>
      </div>
    </main>
  )
}
