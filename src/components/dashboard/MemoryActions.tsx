'use client'

import { useState } from 'react'
import { Download, Loader2, Trash2 } from 'lucide-react'

export default function MemoryActions({ appSlugs }: { appSlugs: string[] }) {
  const [busy, setBusy] = useState<'export' | 'clear' | null>(null)
  const [message, setMessage] = useState('')
  const targets = appSlugs.length ? appSlugs : ['workspace']

  async function exportMemory() {
    setBusy('export')
    const exports = await Promise.all(targets.map(async (appSlug) => {
      const response = await fetch(`/api/admin/memory/manage?appSlug=${encodeURIComponent(appSlug)}`, { method: 'POST' })
      return response.json()
    }))
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), apps: exports }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `amarktai-memory-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Memory export downloaded.')
    setBusy(null)
  }

  async function clearMemory() {
    if (!window.confirm('Delete all saved memory? This cannot be undone.')) return
    setBusy('clear')
    const results = await Promise.all(targets.map((appSlug) => fetch(`/api/admin/memory/manage?appSlug=${encodeURIComponent(appSlug)}`, { method: 'DELETE' })))
    const success = results.every((response) => response.ok)
    setMessage(success ? 'Saved memory deleted. Refreshing…' : 'Some memory could not be deleted.')
    setBusy(null)
    if (success) window.location.reload()
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <button onClick={exportMemory} disabled={busy !== null} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 text-left disabled:opacity-50">
        <span className="flex items-center gap-2 font-black text-white">{busy === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-cyan-300" />} Export memory</span>
        <span className="mt-2 block text-sm leading-6 text-slate-400">Download remembered context as JSON.</span>
      </button>
      <button onClick={clearMemory} disabled={busy !== null} className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-left disabled:opacity-50">
        <span className="flex items-center gap-2 font-black text-red-200">{busy === 'clear' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete all memory</span>
        <span className="mt-2 block text-sm leading-6 text-slate-400">Protected destructive action with confirmation.</span>
      </button>
      {message && <p className="text-sm font-semibold text-cyan-200 md:col-span-2">{message}</p>}
    </section>
  )
}
