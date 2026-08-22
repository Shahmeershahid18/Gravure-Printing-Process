'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJobFile } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export function JobCreateWizard({ customers, machines }: { customers: any[], machines: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      customer_id: formData.get('customer_id') as string,
      job_no: formData.get('job_no') as string,
      product_name: formData.get('product_name') as string,
      structure: formData.get('structure') as string,
      no_of_colours: parseInt(formData.get('no_of_colours') as string, 10),
      default_machine_id: formData.get('default_machine_id') as string || null,
      reel_width_mm: formData.get('reel_width_mm') ? parseFloat(formData.get('reel_width_mm') as string) : null,
      repeat_length_mm: formData.get('repeat_length_mm') ? parseFloat(formData.get('repeat_length_mm') as string) : null,
      ups: formData.get('ups') ? parseInt(formData.get('ups') as string, 10) : null,
      notes: formData.get('notes') as string || null,
    }

    const result = await createJobFile(data as any)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.data) {
      router.push(`/jobs/${result.data.id}`)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {error && <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select name="customer_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_no">Job No (Legacy/ERP Ref)</Label>
              <Input id="job_no" name="job_no" required placeholder="e.g. GR-2548" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name</Label>
              <Input id="product_name" name="product_name" required placeholder="e.g. Biscuit wrapper" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="structure">Structure</Label>
              <Input id="structure" name="structure" required placeholder="e.g. PET 12 / MBOPP 20" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="no_of_colours">No of Colours</Label>
              <Input id="no_of_colours" name="no_of_colours" type="number" min="1" max="8" required defaultValue="8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_machine_id">Default Machine</Label>
              <Select name="default_machine_id">
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ups">Ups</Label>
              <Input id="ups" name="ups" type="number" min="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reel_width_mm">Reel Width (mm)</Label>
              <Input id="reel_width_mm" name="reel_width_mm" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat_length_mm">Repeat Length (mm)</Label>
              <Input id="repeat_length_mm" name="repeat_length_mm" type="number" step="0.01" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Optional notes" />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" variant="outline" className="mr-2" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Job File
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
