"use client"

import { useRouter } from "next/navigation"
import { Select } from "@/components/ui/input"

/**
 * Which machine the next run goes on.
 *
 * Jobs move between machines, so the briefing has to be told which one, or the
 * settings it shows are from a press with different tensions.
 */
export function MachinePicker({
  jobFileId,
  machines,
  selected,
}: {
  jobFileId: string
  machines: { id: string; code: string }[]
  selected: string
}) {
  const router = useRouter()

  return (
    <Select
      value={selected}
      aria-label="Machine for the next run"
      className="w-40"
      onChange={(e) => router.push(`/jobs/${jobFileId}/briefing?machine=${e.target.value}`)}
    >
      {machines.map((m) => (
        <option key={m.id} value={m.id}>
          {m.code}
        </option>
      ))}
    </Select>
  )
}
