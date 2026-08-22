"use client"

import * as React from "react"
import { THEME_KEY, THEMES, themeLabel, isTheme, type Theme } from "@/lib/theme"
import { cn } from "@/lib/utils"

/**
 * Theme switching, applied to the live document rather than through a reload.
 *
 * Three sources can change the theme and all three are wired, so the answer is
 * the same everywhere without anyone refreshing:
 *
 *   - this control, on click;
 *   - the OS, while the choice is Auto (matchMedia);
 *   - another tab of the same app (the storage event).
 *
 * The 150ms colour transition is added only for the duration of a switch. Left
 * on permanently it would also animate the run grid's per-cell save states,
 * which on a tablet reads as lag -- plan Section 4.4, rule 8.
 */
function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (animate) {
    root.classList.add("theme-transition")
    window.setTimeout(() => root.classList.remove("theme-transition"), 200)
  }

  root.setAttribute("data-theme", dark ? "dark" : "light")
  root.style.colorScheme = dark ? "dark" : "light"
}

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    setThemeState(isTheme(stored) ? stored : "system")
    setReady(true)
  }, [])

  // Follow the OS live while the choice is Auto.
  React.useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => apply("system", true)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  // Follow the other tabs.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return
      const next = isTheme(e.newValue) ? e.newValue : "system"
      setThemeState(next)
      apply(next, true)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private browsing. The theme still applies for this page's lifetime.
    }
    apply(next, true)
  }, [])

  return { theme, setTheme, ready }
}

/**
 * Three explicit choices rather than a two-state switch.
 *
 * A plain toggle cannot express "follow the machine", and on a shared office
 * desktop that is the setting most people actually want. Every option carries
 * its word -- colour is never the only carrier of meaning (rule 4).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, ready } = useTheme()

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--radius)] border border-steel-200 bg-paper-100 p-0.5",
        className
      )}
    >
      {THEMES.map((t) => {
        const active = ready && theme === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={active}
            className={cn(
              "rounded-[calc(var(--radius)-1px)] px-2.5 py-1 text-[length:calc(var(--base)*0.8)]",
              "transition-colors",
              active
                ? "bg-paper-000 font-semibold text-ink-900 shadow-[var(--shadow-bar)]"
                : "text-ink-600 hover:text-ink-900"
            )}
          >
            {themeLabel[t]}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The kiosk variant: one big target that cycles, because the bar next to a
 * press has room for one more button and not for three.
 */
export function ThemeCycle({ className }: { className?: string }) {
  const { theme, setTheme, ready } = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn(
        "h-[var(--tap-sm)] shrink-0 rounded-[var(--radius)] border border-steel-200",
        "bg-paper-000 px-3 text-[length:calc(var(--base)*0.92)] font-semibold text-ink-900",
        "transition-colors hover:bg-paper-100",
        className
      )}
    >
      {ready ? themeLabel[theme] : "Theme"}
      <span className="sr-only">. Tap to switch to {themeLabel[next]}.</span>
    </button>
  )
}
