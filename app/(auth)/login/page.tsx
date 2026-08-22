import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionProfile, landingFor } from "@/lib/auth"
import { Wordmark } from "@/components/brand/Logo"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  // Already signed in: go where this role belongs rather than showing a form
  // that would immediately bounce.
  const profile = await getSessionProfile()
  if (profile) redirect(landingFor(profile.role))

  return (
    <main className="flex min-h-screen flex-col bg-paper-100">
      <div className="flex items-center justify-between p-4">
        <Link href="/" aria-label="Intaglio home">
          <Wordmark
            size={26}
            nameClassName="text-[length:calc(var(--base)*1.05)]"
          />
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-[length:calc(var(--base)*1.6)] font-semibold tracking-tight text-ink-900">
            Sign in
          </h1>
          <p className="mt-1.5 mb-8 text-[length:calc(var(--base)*0.95)] text-ink-600">
            Use the account your supervisor set up for you.
          </p>

          <LoginForm />
        </div>
      </div>

      {/* Nothing here describes how sign-in works, which accounts exist, or
          what lives behind it. An unauthenticated page is read by everyone. */}
      <div className="p-4" />
    </main>
  )
}
