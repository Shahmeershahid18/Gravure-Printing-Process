'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { enqueueSyncTask } from '@/lib/idb-queue'

type QuickObservationDialogProps = {
  isOpen: boolean
  onClose: () => void
  run: any
  station?: any
}

const AREAS = ['cylinder', 'ink', 'substrate', 'machine', 'registration', 'drying', 'tension', 'static', 'adhesion', 'doctor_blade', 'other']

export function QuickObservationDialog({ isOpen, onClose, run, station }: QuickObservationDialogProps) {
  const [step, setStep] = useState(1)
  const [area, setArea] = useState<string>('')
  const [templates, setTemplates] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [checkNextRun, setCheckNextRun] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setArea('')
      setTitle('')
      setDescription('')
      setActionTaken('')
      setCheckNextRun(false)
      setPhotoDataUrl(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (area) {
      const loadTemplates = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('issue_templates').select('*').eq('area', area).eq('is_active', true)
        setTemplates(data || [])
      }
      loadTemplates()
    }
  }, [area])

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        // compress to ~80% jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setPhotoDataUrl(dataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    const observation = {
      job_file_id: run.job_file_id,
      run_id: run.id,
      run_station_id: station?.id,
      cylinder_id: station?.cylinder_id,
      ink_batch_id: station?.ink_batch_id,
      machine_id: run.machine_id,
      area,
      title,
      description,
      action_taken: actionTaken || null,
      next_run_note: checkNextRun ? (actionTaken ? `${title}: ${actionTaken}` : title) : null,
      photo_base64: photoDataUrl // This will be handled by the sync queue
    }

    enqueueSyncTask('ADD_OBSERVATION', observation)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col" data-shell="kiosk">
        <DialogHeader>
          <DialogTitle className="text-3xl">Flag Issue {station ? `- Station ${station.station_no}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">1. Select Area</h3>
              <div className="grid grid-cols-4 gap-4">
                {AREAS.map(a => (
                  <button
                    key={a}
                    onClick={() => { setArea(a); setStep(2) }}
                    className="h-[var(--tap)] rounded-xl border-2 border-border bg-muted/50 text-xl font-bold capitalize hover:bg-muted active:scale-95 transition-all"
                  >
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <h3 className="text-2xl font-bold">2. Select Issue</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTitle(t.title)
                      setDescription(t.description)
                      setStep(3)
                    }}
                    className="p-6 rounded-xl border-2 border-border bg-muted/50 text-left hover:bg-muted active:scale-95 transition-all flex flex-col gap-2"
                  >
                    <span className="text-xl font-bold">{t.title}</span>
                    <span className="text-muted-foreground">{t.description}</span>
                  </button>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-2 p-8 text-center text-muted-foreground bg-muted rounded-xl">
                    No predefined templates for this area.
                  </div>
                )}
                <button
                  onClick={() => {
                    setTitle('Other')
                    setDescription('Custom issue logged')
                    setStep(3)
                  }}
                  className="p-6 rounded-xl border-2 border-dashed border-border text-left hover:bg-muted active:scale-95 transition-all flex flex-col gap-2"
                >
                  <span className="text-xl font-bold text-muted-foreground">Custom Issue...</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 py-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <div>
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="text-muted-foreground">{area.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xl font-bold">Action Taken (Optional)</Label>
                <Input 
                  className="h-[var(--tap)] text-xl"
                  placeholder="What did you do to fix it?"
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                />
              </div>

              <div className="flex gap-8">
                <div className="flex-1 space-y-4">
                  <Label className="text-xl font-bold">Photo Attachment</Label>
                  {photoDataUrl ? (
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border">
                      <img src={photoDataUrl} alt="Captured" className="w-full h-full object-contain" />
                      <button 
                        onClick={() => setPhotoDataUrl(null)}
                        className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80"
                      >
                        <X className="w-8 h-8" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Camera className="w-16 h-16" />
                      <span className="text-xl font-bold">Tap to take photo</span>
                    </button>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handlePhotoCapture}
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <Label className="text-xl font-bold">Next Run Note</Label>
                  <div 
                    onClick={() => setCheckNextRun(!checkNextRun)}
                    className={`p-6 border-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                      checkNextRun ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    <div>
                      <div className="text-xl font-bold">Check this next run</div>
                      <div className="text-muted-foreground mt-1">Alerts operator before the next run starts</div>
                    </div>
                    <Switch checked={checkNextRun} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 3 && (
          <div className="pt-6 border-t mt-auto">
            <Button size="lg" className="w-full h-[var(--tap)] text-2xl font-bold" onClick={handleSubmit}>
              Log Issue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
