"use client"

import { Button } from "@/components/ui/button"

/** The briefing goes to A4 for the floor -- plan Section 10.2. */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      Print
    </Button>
  )
}
