import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function JobHeader({ job }: { job: any }) {
  if (!job) return null

  // Format active revision if present
  const activeRev = job.artwork_revisions?.find((r: any) => r.is_current)

  return (
    <Card className="mb-6 sticky top-0 z-10 shadow-sm border-b rounded-none sm:rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-3">
              <Link href={`/jobs/${job.id}`} className="hover:underline">
                {job.job_file_no}
              </Link>
              <span className="text-muted-foreground">·</span>
              <span>{job.job_no}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-normal">{job.customers?.name}</span>
              <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                {job.status}
              </Badge>
            </CardTitle>
            <CardDescription className="text-base mt-2 flex items-center gap-2">
              <span>{job.product_name}</span>
              <span>·</span>
              <span>{job.structure}</span>
              <span>·</span>
              <span>{activeRev?.revision_label || 'No Rev'}</span>
              {activeRev?.shade_card_no && (
                <>
                  <span>·</span>
                  <span>{activeRev.shade_card_no}</span>
                </>
              )}
              <span>·</span>
              <span>{job.no_of_colours} colours</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/jobs/${job.id}/issues`}>Problem History</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/jobs/${job.id}/artwork`}>Artwork History</Link>
            </Button>
            <Button>Start Next Run</Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
