'use client'

import { useState } from 'react'
import { createArtworkRevision } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function ArtworkRevisionForm({ jobFileId }: { jobFileId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      job_file_id: jobFileId,
      artwork_no: formData.get('artwork_no') as string || null,
      shade_card_no: formData.get('shade_card_no') as string || null,
      change_summary: formData.get('change_summary') as string,
    }

    const result = await createArtworkRevision(data as any)
    if (result.error) {
      setError(result.error)
    } else {
      // clear form
      (e.target as HTMLFormElement).reset()
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Revision</CardTitle>
        <CardDescription>
          This will bump the revision number and copy all cylinders from the current revision.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">{error}</div>}
          
          <div className="space-y-2">
            <Label htmlFor="change_summary">Change Summary</Label>
            <Textarea 
              id="change_summary" 
              name="change_summary" 
              required 
              placeholder="What changed in this revision?" 
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shade_card_no">Shade Card No</Label>
            <Input id="shade_card_no" name="shade_card_no" placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artwork_no">Artwork No</Label>
            <Input id="artwork_no" name="artwork_no" placeholder="Optional" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Revision
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
