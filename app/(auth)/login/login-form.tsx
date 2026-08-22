"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { signIn, type AuthState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ui/field"
import { Alert } from "@/components/ui/alert"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" size="full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(signIn, {})

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-6"
    >
      {state.error && <Alert tone="critical" title="Cannot sign in">{state.error}</Alert>}

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton />
    </form>
  )
}
