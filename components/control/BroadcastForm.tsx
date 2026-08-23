"use client"

import * as React from "react"
import { Card, CardBody, CardFooter } from "@/components/ui/card"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ROLES, roleLabel, type Role } from "@/lib/roles"
import { broadcast } from "@/lib/actions/notifications"
import type { NotificationSeverity } from "@/lib/notifications"
import { cn } from "@/lib/utils"

const SEVERITIES: { value: NotificationSeverity; label: string; hint: string }[] = [
  { value: "info", label: "Information", hint: "Sits in the list like anything else." },
  { value: "success", label: "Good news", hint: "Marked as done." },
  { value: "warning", label: "Attention", hint: "Marked for attention." },
  {
    value: "critical",
    label: "Critical",
    hint: "Pulled to the top of the tablet list, above everything unread.",
  },
]

/**
 * Sending an announcement is not undoable -- a notification already read
 * cannot be unread -- so this confirms before it sends, and says how many
 * inboxes it is about to land in.
 */
export function BroadcastForm() {
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [severity, setSeverity] = React.useState<NotificationSeverity>("info")
  const [roles, setRoles] = React.useState<Role[]>([])
  const [link, setLink] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null)

  const toggleRole = (r: Role) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))

  const send = async () => {
    setBusy(true)
    setResult(null)

    const res = await broadcast({
      title,
      body,
      roles: roles.length ? roles : undefined,
      severity,
      link: link || undefined,
    })

    setBusy(false)
    setConfirming(false)

    if (!res.ok) {
      setResult({ ok: false, message: res.error ?? "The announcement was not sent." })
      return
    }

    setResult({
      ok: true,
      message:
        res.sent === 0
          ? "Nobody received this. Every account in the chosen roles has that notification kind turned off, or there are none."
          : `Sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}.`,
    })
    setTitle("")
    setBody("")
    setLink("")
    setRoles([])
  }

  const audience = roles.length === 0 ? "everyone" : roles.map(roleLabel).join(", ")

  return (
    <div className="space-y-4">
      {result && (
        <Alert tone={result.ok ? "ok" : "critical"}>{result.message}</Alert>
      )}

      <Card>
        <CardBody className="space-y-4">
          <div>
            <label
              htmlFor="b-title"
              className="mb-1 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900"
            >
              Title
            </label>
            <Input
              id="b-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Press G-02 down for maintenance on Thursday"
            />
            <p className="mt-1 text-[length:calc(var(--base)*0.8)] text-steel-400">
              This is the whole message on a tablet at a glance. Say the thing,
              not the category.
            </p>
          </div>

          <div>
            <label
              htmlFor="b-body"
              className="mb-1 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900"
            >
              Message
            </label>
            <Textarea
              id="b-body"
              value={body}
              rows={4}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Any run planned for G-02 on Thursday should be moved to G-01 or G-03. Talk to the planner before rescheduling."
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900">
              Who hears it
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setRoles([])}
                aria-pressed={roles.length === 0}
                className={chip(roles.length === 0)}
              >
                Everyone
              </button>
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  aria-pressed={roles.includes(r)}
                  className={chip(roles.includes(r))}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[length:calc(var(--base)*0.8)] text-steel-400">
              Anyone who has turned announcements off does not receive it, whatever
              is chosen here.
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900">
              How loud
            </span>
            <div className="space-y-1.5">
              {SEVERITIES.map((s) => (
                <label key={s.value} className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="severity"
                    value={s.value}
                    checked={severity === s.value}
                    onChange={() => setSeverity(s.value)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-[length:calc(var(--base)*0.9)] text-ink-900">
                      {s.label}
                    </span>
                    <span className="block text-[length:calc(var(--base)*0.8)] text-steel-400">
                      {s.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="b-link"
              className="mb-1 block text-[length:calc(var(--base)*0.86)] font-semibold text-ink-900"
            >
              Where it takes them <span className="font-normal text-steel-400">optional</span>
            </label>
            <Input
              id="b-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/jobs/…"
            />
          </div>
        </CardBody>

        <CardFooter>
          <span className="mr-auto text-[length:calc(var(--base)*0.82)] text-ink-600">
            Going to <strong className="text-ink-900">{audience}</strong>
            {severity !== "info" && (
              <>
                {" · "}
                <Badge tone={severity === "critical" ? "critical" : severity === "warning" ? "warn" : "ok"}>
                  {SEVERITIES.find((s) => s.value === severity)?.label}
                </Badge>
              </>
            )}
          </span>

          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                Back
              </Button>
              <Button variant="primary" onClick={() => void send()} disabled={busy}>
                {busy ? "Sending…" : `Yes, send to ${audience}`}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              disabled={!title.trim() || busy}
              onClick={() => setConfirming(true)}
            >
              Send announcement
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

function chip(active: boolean): string {
  return cn(
    "min-h-[var(--tap-sm)] rounded-[var(--radius)] border px-3",
    "text-[length:calc(var(--base)*0.86)] font-semibold transition-colors",
    active
      ? "border-ink-900 bg-ink-900 text-paper-000"
      : "border-steel-200 bg-paper-000 text-ink-600 hover:bg-paper-100"
  )
}
