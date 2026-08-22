'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { loginOperator } from '@/lib/actions/kiosk-auth'
import { useRouter } from 'next/navigation'

export default function KioskLogin() {
  const [operators, setOperators] = useState<{id: string, full_name: string}[]>([])
  const [selectedOp, setSelectedOp] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'operator')
        .eq('is_active', true)
      if (data) setOperators(data)
    }
    load()
  }, [])

  const handlePin = async (digit: string) => {
    if (!selectedOp) return
    setError('')
    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      const res = await loginOperator(selectedOp, newPin)
      if (res.success) {
        router.push('/') // Navigate back to machine home or redirect
        router.refresh()
      } else {
        setError('Invalid PIN')
        setPin('')
      }
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex w-full max-w-4xl gap-16 bg-card p-12 rounded-xl shadow-lg border border-border">
        {/* Left: Select Operator */}
        <div className="flex-1 space-y-6 border-r border-border pr-8">
          <h2 className="text-3xl font-bold">Who is running?</h2>
          <div className="grid grid-cols-1 gap-4">
            {operators.map(op => (
              <button
                key={op.id}
                onClick={() => { setSelectedOp(op.id); setPin(''); setError('') }}
                className={`h-[var(--tap)] text-xl rounded-md border text-left px-6 ${
                  selectedOp === op.id 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : 'border-border bg-background'
                }`}
              >
                {op.full_name}
              </button>
            ))}
            {operators.length === 0 && (
              <div className="text-muted-foreground p-4 bg-muted rounded-md text-center">
                No operators found. Check database.
              </div>
            )}
          </div>
        </div>

        {/* Right: PIN Pad */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          <div className="text-center h-20 flex flex-col justify-end">
            {selectedOp ? (
              <>
                <div className="text-xl font-medium mb-4">Enter PIN</div>
                <div className="flex gap-4 justify-center">
                  {[0,1,2,3].map(i => (
                    <div 
                      key={i} 
                      className={`w-6 h-6 rounded-full border-2 ${
                        pin.length > i ? 'bg-primary border-primary' : 'border-border'
                      }`} 
                    />
                  ))}
                </div>
                {error && <div className="text-destructive mt-4 font-medium">{error}</div>}
              </>
            ) : (
              <div className="text-xl text-muted-foreground">Select your name first</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6,7,8,9].map(d => (
              <button
                key={d}
                disabled={!selectedOp}
                onClick={() => handlePin(d.toString())}
                className="w-20 h-20 rounded-full bg-secondary text-2xl font-bold hover:bg-border active:scale-95 transition-all disabled:opacity-50"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              disabled={!selectedOp}
              onClick={() => handlePin('0')}
              className="w-20 h-20 rounded-full bg-secondary text-2xl font-bold hover:bg-border active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <button
              disabled={!selectedOp}
              onClick={() => setPin(pin.slice(0,-1))}
              className="w-20 h-20 rounded-full text-lg font-bold text-muted-foreground hover:bg-secondary active:scale-95 disabled:opacity-50"
            >
              DEL
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
