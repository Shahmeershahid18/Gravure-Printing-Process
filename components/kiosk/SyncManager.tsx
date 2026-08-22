'use client'

import { useEffect, useState } from 'react'
import { getSyncQueue, removeSyncTask } from '@/lib/idb-queue'
import { createClient } from '@/utils/supabase/client'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'

export function SyncManager() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueLength, setQueueLength] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Process queue
  useEffect(() => {
    let interval: NodeJS.Timeout

    const processQueue = async () => {
      if (!isOnline || isSyncing) return
      
      const queue = await getSyncQueue()
      setQueueLength(queue.length)
      
      if (queue.length === 0) return

      setIsSyncing(true)
      const supabase = createClient()

      for (const task of queue) {
        try {
          if (task.action === 'UPDATE_RUN_STATION') {
            const { error } = await supabase
              .from('run_stations')
              .update(task.payload.updates)
              .eq('id', task.payload.id)
            
            if (!error && task.id) {
              await removeSyncTask(task.id)
            }
          }
        } catch (e) {
          console.error('Sync failed for task', task, e)
          break // Stop processing on error to maintain order
        }
      }
      
      setIsSyncing(false)
      const newQueue = await getSyncQueue()
      setQueueLength(newQueue.length)
    }

    interval = setInterval(processQueue, 5000)
    return () => clearInterval(interval)
  }, [isOnline, isSyncing])

  if (isOnline && queueLength === 0) return null

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 z-50">
      {isOnline ? (
        <>
          <RefreshCw className={`w-4 h-4 text-primary ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Syncing {queueLength} items</span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Offline ({queueLength} unsaved)</span>
        </>
      )}
    </div>
  )
}
