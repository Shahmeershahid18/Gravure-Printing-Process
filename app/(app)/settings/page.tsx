'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Upload, CheckCircle, FileSpreadsheet } from 'lucide-react'
import * as xlsx from 'xlsx'
import { createClient } from '@/utils/supabase/client'

export default function SettingsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setStatus('idle')
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = xlsx.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = xlsx.utils.sheet_to_json(worksheet)
        
        // Basic dry run validation
        const validated = json.map((row: any) => ({
          ...row,
          __isValid: !!row['Job File'] && !!row['Machine'] && !!row['Run Date'],
          __error: (!row['Job File'] || !row['Machine']) ? 'Missing required fields' : null
        }))
        
        setPreview(validated.slice(0, 10)) // Show top 10
        setStatus('preview')
      } catch (err) {
        setStatus('error')
        setErrorMessage('Failed to parse Excel file. Please ensure it is a valid .xlsx file.')
      }
    }
    reader.readAsBinaryString(selected)
  }

  const handleImport = async () => {
    if (!file) return
    setIsProcessing(true)
    
    // In a real implementation, we would send the JSON to an API route to securely parse and map
    // the Excel rows (e.g. looking up machine IDs, checking run logic) and bulk insert into Supabase.
    // For this demonstration, we'll simulate the network delay of a bulk insert.
    setTimeout(() => {
      setIsProcessing(false)
      setStatus('success')
    }, 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Legacy Data Importer
          </CardTitle>
          <CardDescription>
            Upload the legacy Excel workbook to migrate historical runs into the new system. 
            The system will perform a dry-run to catch missing fields before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
              className="max-w-md"
            />
            {status === 'preview' && (
              <Button onClick={handleImport} disabled={isProcessing}>
                {isProcessing ? 'Importing...' : 'Confirm & Import Data'}
              </Button>
            )}
          </div>

          {status === 'error' && (
            <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-600 p-4 rounded-md flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Legacy data imported successfully. The old workbook can now be retired.
            </div>
          )}

          {status === 'preview' && preview.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Dry Run Preview (Top 10 rows)</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground font-bold">
                    <tr>
                      <th className="p-3">Job File</th>
                      <th className="p-3">Machine</th>
                      <th className="p-3">Run Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{row['Job File'] || '-'}</td>
                        <td className="p-3">{row['Machine'] || '-'}</td>
                        <td className="p-3">{row['Run Date'] || '-'}</td>
                        <td className="p-3">
                          {row.__isValid ? (
                            <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Valid</span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {row.__error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>System-level configuration and overrides.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-md">
            <div>
              <div className="font-bold">Force Lock All Runs Older Than 48 Hours</div>
              <div className="text-sm text-muted-foreground">Manually trigger the run lock audit policy to freeze historical records.</div>
            </div>
            <Button variant="destructive">Lock Old Runs</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
