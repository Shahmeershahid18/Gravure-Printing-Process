"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { lockOperator, touchOperatorSession } from "@/lib/actions/kiosk-auth"
import { Button } from "@/components/ui/button"
import { Mark } from "@/components/brand/Logo"
import { ThemeCycle } from "@/components/theme/ThemeToggle"
import { KioskNotifications } from "@/components/kiosk/KioskNotifications"
import { cn } from "@/lib/utils"

const IDLE_MS = 30 * 60 * 1000 // matches PIN_TTL_SECONDS in kiosk-auth
const TOUCH_EVERY_MS = 5 * 60 * 1000

/**
 * The kiosk chrome: machine, operator, daylight mode, and the lock.
 *
 * Locking is not signing out. The Supabase machine session persists across
 * shifts so IT is never called to the press at 3am; only the operator's PIN
 * attribution clears (plan Section 8).
 */
export function KioskBar({
  machineCode,
  operatorName,
  title,
  userId,
}: {
  machineCode: string | null
  operatorName: string | null
  title: string
  /** The machine account. See KioskNotifications on why that is the scope. */
  userId: string
}) {
  const router = useRouter()
  const [daylight, setDaylight] = React.useState(false)
  const [clock, setClock] = React.useState<string>("")

  // Daylight mode -- Section 4.6. Remembered per tablet, since the tablet's
  // position by the window does not change between shifts.
  React.useEffect(() => {
    const saved = localStorage.getItem("gt-daylight") === "on"
    setDaylight(saved)
    document.documentElement.setAttribute("data-daylight", saved ? "on" : "off")
  }, [])

  const toggleDaylight = () => {
    const next = !daylight
    setDaylight(next)
    localStorage.setItem("gt-daylight", next ? "on" : "off")
    document.documentElement.setAttribute("data-daylight", next ? "on" : "off")
  }

  // Wall clock: the operator writes the shift book from this screen.
  React.useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      )
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Idle lock. Real activity pushes the cookie out; 30 minutes of nothing
  // drops back to the picker so the next operator is not attributed the wrong
  // rows.
  React.useEffect(() => {
    if (!operatorName) return
    let lastTouch = 0
    let idleTimer: ReturnType<typeof setTimeout>

    const resetIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(async () => {
        await lockOperator()
        router.replace("/kiosk/login")
        router.refresh()
      }, IDLE_MS)

      const now = Date.now()
      if (now - lastTouch > TOUCH_EVERY_MS) {
        lastTouch = now
        void touchOperatorSession()
      }
    }

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "focus"]
    events.forEach((e) => window.addEventListener(e, resetIdle))
    resetIdle()
    return () => {
      clearTimeout(idleTimer)
      events.forEach((e) => window.removeEventListener(e, resetIdle))
    }
  }, [operatorName, router])

  const lock = async () => {
    await lockOperator()
    router.replace("/kiosk/login")
    router.refresh()
  }

  return (
    <header
      className={cn(
        "flex h-[calc(var(--tap)+var(--gap))] shrink-0 items-center gap-[var(--gap)]",
        "border-b border-steel-200 bg-paper-000 px-[var(--gap)] sticky-bar"
      )}
    >
      <Mark size={32} />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[length:calc(var(--base)*1.05)] font-semibold text-ink-900">
          {title}
        </h1>
        {/* The title above already names the machine; repeating it here cost a
            line of the bar and told the operator nothing. */}
        <p className="truncate text-[length:calc(var(--base)*0.78)] text-ink-600">
          {!machineCode
            ? "Machine not assigned"
            : (operatorName ?? "Nobody signed in")}
        </p>
      </div>

      <span
        data-numeric=""
        className="hidden text-[length:calc(var(--base)*1.05)] text-ink-600 sm:block"
      >
        {clock}
      </span>

      <KioskNotifications userId={userId} />

      <ThemeCycle />

      <Button
        variant="outline"
        size="sm"
        onClick={toggleDaylight}
        aria-pressed={daylight}
        className="hidden sm:inline-flex"
      >
        {daylight ? "Daylight on" : "Daylight off"}
      </Button>

      {operatorName && (
        <Button variant="outline" size="sm" onClick={lock}>
          Lock
        </Button>
      )}
    </header>
  )
}
