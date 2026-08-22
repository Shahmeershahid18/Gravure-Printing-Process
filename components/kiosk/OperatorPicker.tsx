"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signInOperator } from "@/lib/actions/kiosk-auth"
import { Alert } from "@/components/ui/alert"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

export type OperatorTile = {
  id: string
  full_name: string
  employee_no: string | null
  has_pin: boolean
}

/**
 * The operator picker and PIN pad -- plan Section 8.
 *
 * The operator taps his tile and enters a 4 digit PIN. Attribution is by PIN,
 * not by cryptographic identity; that trade is stated plainly in the plan and
 * accepted, because machine operators will not manage individual passwords on
 * a shared tablet with wet hands.
 *
 * No icon without a text label on the kiosk -- Section 4.4, rule 2.
 */
export function OperatorPicker({
  operators,
  machineCode,
}: {
  operators: OperatorTile[]
  machineCode: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<OperatorTile | null>(null)
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = React.useCallback(
    async (value: string) => {
      if (!selected) return
      setBusy(true)
      const res = await signInOperator(selected.id, value)
      setBusy(false)
      if (res.ok) {
        router.replace("/kiosk")
        router.refresh()
      } else {
        setError(res.error)
        setPin("")
      }
    },
    [selected, router]
  )

  const press = (digit: string) => {
    if (!selected || busy) return
    setError(null)
    const next = pin + digit
    if (next.length > 4) return
    setPin(next)
    if (next.length === 4) void submit(next)
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-[var(--gap)] lg:grid-cols-2">
      {/* Left: who is running */}
      <section className="rounded-[var(--radius)] border border-steel-200 bg-paper-000">
        <div className="border-b border-steel-200 px-[var(--gap)] py-3">
          <h2 className="text-[length:calc(var(--base)*1.1)] font-semibold text-ink-900">
            Who is running?
          </h2>
          <p className="text-[length:calc(var(--base)*0.86)] text-ink-600">
            {machineCode ? `Operators assigned to ${machineCode}` : "Operators on this machine"}
          </p>
        </div>

        {operators.length === 0 ? (
          <EmptyState title="No operators are assigned to this machine yet. An admin adds them in Settings, Users." />
        ) : (
          <ul className="p-[var(--gap)] space-y-2">
            {operators.map((op) => {
              const active = selected?.id === op.id
              return (
                <li key={op.id}>
                  <button
                    type="button"
                    disabled={!op.has_pin}
                    onClick={() => {
                      setSelected(op)
                      setPin("")
                      setError(null)
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-[var(--tap)] w-full items-center gap-3 rounded-[var(--radius)] border px-4 text-left",
                      "text-[length:var(--base)] transition-colors disabled:opacity-50",
                      active
                        ? "border-ink-900 bg-ink-900 text-paper-000"
                        : "border-steel-200 bg-paper-000 text-ink-900 hover:bg-paper-100"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold",
                        active
                          ? "border-paper-000/40 bg-paper-000/10 text-paper-000"
                          : "border-steel-200 bg-paper-100 text-ink-600"
                      )}
                    >
                      {op.full_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{op.full_name}</span>
                      {op.employee_no && (
                        <span
                          data-numeric=""
                          className={cn(
                            "block truncate text-[length:calc(var(--base)*0.82)]",
                            active ? "text-paper-000/70" : "text-ink-600"
                          )}
                        >
                          {op.employee_no}
                        </span>
                      )}
                    </span>
                    {!op.has_pin && (
                      <span className="shrink-0 text-[length:calc(var(--base)*0.8)] text-signal-warn">
                        No PIN set
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Right: PIN pad */}
      <section className="rounded-[var(--radius)] border border-steel-200 bg-paper-000 p-[var(--gap)]">
        <div className="mb-6 min-h-24 text-center">
          {selected ? (
            <>
              <p className="text-[length:calc(var(--base)*1.1)] font-semibold text-ink-900">
                {selected.full_name}
              </p>
              <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
                Enter your 4 digit PIN
              </p>
              <div className="flex justify-center gap-3" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "block h-4 w-4 rounded-full border-2",
                      pin.length > i
                        ? "border-ink-900 bg-ink-900"
                        : "border-steel-400 bg-transparent"
                    )}
                  />
                ))}
              </div>
              <span className="sr-only" aria-live="polite">
                {pin.length} of 4 digits entered
              </span>
            </>
          ) : (
            <p className="pt-8 text-[length:calc(var(--base)*1.05)] text-ink-600">
              Tap your name on the left to begin.
            </p>
          )}
        </div>

        {error && (
          <Alert tone="critical" title="PIN not accepted" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="mx-auto grid max-w-xs grid-cols-3 gap-[var(--gap)]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PinKey key={d} label={d} onPress={() => press(d)} disabled={!selected || busy} />
          ))}
          <PinKey
            label="Clear"
            onPress={() => {
              setPin("")
              setError(null)
            }}
            disabled={!selected || busy}
            muted
          />
          <PinKey label="0" onPress={() => press("0")} disabled={!selected || busy} />
          <PinKey
            label="Delete"
            onPress={() => setPin((p) => p.slice(0, -1))}
            disabled={!selected || busy}
            muted
          />
        </div>

        {busy && (
          <p className="mt-4 text-center text-[length:calc(var(--base)*0.86)] text-ink-600">
            Checking…
          </p>
        )}
      </section>
    </div>
  )
}

function PinKey({
  label,
  onPress,
  disabled,
  muted,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        // 64px minimum on the kiosk -- Section 4.6.
        "h-[var(--tap)] rounded-[var(--radius)] border font-semibold transition-colors",
        "disabled:opacity-40",
        muted
          ? "border-steel-200 bg-paper-000 text-[length:calc(var(--base)*0.86)] text-ink-600 hover:bg-paper-100"
          : "border-steel-200 bg-paper-100 text-[length:calc(var(--base)*1.3)] text-ink-900 hover:bg-steel-200"
      )}
    >
      <span data-numeric={muted ? undefined : ""}>{label}</span>
    </button>
  )
}
