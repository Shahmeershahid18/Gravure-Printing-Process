'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { enqueueSyncTask } from '@/lib/idb-queue'
import { SyncManager } from './SyncManager'
import { Switch } from '@/components/ui/switch'
import { QuickObservationDialog } from './QuickObservationDialog'
import { AlertCircle } from 'lucide-react'

type Tab = 'setup' | 'running' | 'close'

export function RunGrid({ run, initialStations, process, substrates }: any) {
  const [activeTab, setActiveTab] = useState<Tab>('running')
  const [stations, setStations] = useState<any[]>(initialStations)
  const [obsDialogOpen, setObsDialogOpen] = useState(false)
  const [obsTargetStation, setObsTargetStation] = useState<any>(null)

  // Debounced update handler
  const handleStationChange = useCallback((id: string, field: string, value: any) => {
    setStations(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    
    // Save locally to IndexedDB queue for background sync
    enqueueSyncTask('UPDATE_RUN_STATION', {
      id,
      updates: { [field]: value }
    })
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border shadow-sm rounded-xl overflow-hidden relative">
      <SyncManager />

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/50 h-[var(--row-h)]">
        <button 
          onClick={() => setActiveTab('setup')}
          className={`flex-1 text-xl font-bold transition-colors ${activeTab === 'setup' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Setup
        </button>
        <button 
          onClick={() => setActiveTab('running')}
          className={`flex-1 text-xl font-bold transition-colors ${activeTab === 'running' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Running
        </button>
        <button 
          onClick={() => setActiveTab('close')}
          className={`flex-1 text-xl font-bold transition-colors ${activeTab === 'close' ? 'bg-background text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Close
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-x-auto p-[var(--gap)]">
        <div className="min-w-max flex gap-[var(--gap)] h-full">
          {stations.map(station => (
            <div key={station.id} className="w-[320px] flex flex-col border border-border rounded-lg overflow-hidden bg-background">
              {/* Station Header */}
              <div className="h-[var(--row-h)] bg-muted border-b border-border flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-muted-foreground">Stn {station.station_no}</div>
                  <button 
                    onClick={() => { setObsTargetStation(station); setObsDialogOpen(true) }}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors ml-2"
                  >
                    <AlertCircle className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Idle</Label>
                  <Switch 
                    checked={station.is_idle} 
                    onCheckedChange={(c) => handleStationChange(station.id, 'is_idle', c)}
                  />
                </div>
              </div>

              {/* Station Body */}
              <div className={`flex-1 p-4 overflow-y-auto ${station.is_idle ? 'opacity-50 pointer-events-none' : ''}`}>
                {activeTab === 'setup' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-lg">Cylinder</Label>
                      <div className="h-[var(--tap)] border border-border rounded-md px-4 flex items-center bg-muted/50">
                        {station.cylinders?.cylinder_no || 'None selected'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Ink Product</Label>
                      <div className="h-[var(--tap)] border border-border rounded-md px-4 flex items-center bg-muted/50">
                        {station.ink_products?.ink_code || 'None selected'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Doctor Blade Type</Label>
                      <Input 
                        className="h-[var(--tap)] text-lg" 
                        value={station.doctor_blade_type || ''}
                        onChange={(e) => handleStationChange(station.id, 'doctor_blade_type', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Blade Angle</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg" 
                        value={station.doctor_blade_angle || ''}
                        onChange={(e) => handleStationChange(station.id, 'doctor_blade_angle', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'running' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-lg">Initial Viscosity (sec)</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg" 
                        value={station.initial_viscosity_sec || ''}
                        onChange={(e) => handleStationChange(station.id, 'initial_viscosity_sec', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Running Viscosity (sec)</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg border-primary" 
                        value={station.running_viscosity_sec || ''}
                        onChange={(e) => handleStationChange(station.id, 'running_viscosity_sec', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Dryer Temp (°C)</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg" 
                        value={station.dryer_temp_c || ''}
                        onChange={(e) => handleStationChange(station.id, 'dryer_temp_c', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Observation Note</Label>
                      <Input 
                        className="h-[var(--tap)] text-lg" 
                        value={station.observation || ''}
                        onChange={(e) => handleStationChange(station.id, 'observation', e.target.value)}
                        placeholder="Log any issues..."
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'close' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-lg font-bold">Meters Run</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-2xl font-bold bg-muted" 
                        value={station.meters_run || ''}
                        onChange={(e) => handleStationChange(station.id, 'meters_run', parseFloat(e.target.value))}
                      />
                      <p className="text-sm text-muted-foreground mt-1">Can be applied globally from the footer</p>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-lg">Ink Consumed (kg)</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg" 
                        value={station.ink_consumed_kg || ''}
                        onChange={(e) => handleStationChange(station.id, 'ink_consumed_kg', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg">Solvent Added (kg)</Label>
                      <Input 
                        type="number"
                        className="h-[var(--tap)] text-lg" 
                        value={station.solvent_added_kg || ''}
                        onChange={(e) => handleStationChange(station.id, 'solvent_added_kg', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Run Close */}
      <div className="border-t border-border bg-muted/30 p-[var(--gap)] shrink-0 flex items-center justify-between">
        <div className="flex gap-[var(--gap)] flex-1 max-w-3xl">
          <div className="space-y-1 flex-1">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Produced (Meters)</Label>
            <Input 
              type="number"
              className="h-[var(--tap)] text-xl font-bold bg-background" 
              placeholder="e.g. 15000"
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Waste (Meters)</Label>
            <Input 
              type="number"
              className="h-[var(--tap)] text-xl font-bold bg-background text-destructive" 
              placeholder="e.g. 500"
            />
          </div>
          <div className="flex items-end flex-none">
            <button className="h-[var(--tap)] px-6 border border-border bg-background hover:bg-muted font-bold rounded-md">
              Apply to all Stations
            </button>
          </div>
        </div>
        
        <div className="ml-8 flex gap-4">
          <button 
            onClick={() => { setObsTargetStation(null); setObsDialogOpen(true) }}
            className="h-[var(--tap)] px-6 text-destructive font-bold text-xl rounded-md border-2 border-destructive hover:bg-destructive/10 transition-colors"
          >
            Flag General Issue
          </button>
          <button className="h-[var(--tap)] px-12 bg-primary text-primary-foreground font-bold text-xl rounded-md hover:bg-primary/90 transition-transform active:scale-[0.98]">
            Close Run
          </button>
        </div>
      </div>

      <QuickObservationDialog 
        isOpen={obsDialogOpen} 
        onClose={() => setObsDialogOpen(false)} 
        run={run}
        station={obsTargetStation}
      />
    </div>
  )
}
