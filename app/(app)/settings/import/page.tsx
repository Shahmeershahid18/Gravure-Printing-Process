import { requireRole } from "@/lib/auth"
import { SectionHeading } from "@/components/ui/page-header"
import { ExcelImporter } from "./excel-importer"

export const metadata = { title: "Import from Excel" }

export default async function ImportPage() {
  await requireRole("admin", "planner")

  return (
    <>
      <SectionHeading>Import from Excel</SectionHeading>
      <p className="mb-4 text-[length:calc(var(--base)*0.86)] text-ink-600">
        Import the legacy workbook one sheet at a time, in dependency order.
        Every import previews first: nothing is written until the preview looks
        right, and rows that fail validation are listed rather than skipped
        silently.
      </p>
      <ExcelImporter />
    </>
  )
}
