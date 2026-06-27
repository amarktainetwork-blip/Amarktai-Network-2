'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'

const capabilityGroups = ['text', 'image', 'video', 'music', 'voice', 'avatar', 'research', 'automation'] as const

export default function AddAppFlow() {
  const [name, setName] = useState('')
  const [type, setType] = useState('general')
  const [description, setDescription] = useState('')
  const [memoryScope, setMemoryScope] = useState('app')
  const [storageScope, setStorageScope] = useState('app-artifacts')
  const [capabilities, setCapabilities] = useState<string[]>(['text', 'research'])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setMessage('')
    const appSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    try {
      const response = await fetch('/api/admin/app-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          appSlug,
          appName: name.trim(),
          appType: type,
          enabledCapabilities: JSON.stringify(capabilities),
          memoryNamespace: memoryScope,
          retrievalNamespace: memoryScope === 'none' ? '' : `${appSlug}-rag`,
          storageScope,
          description,
        }),
      })
      const data = await response.json().catch(() => ({}))
      setMessage(response.ok ? `App profile saved: ${appSlug}` : data.error ?? 'App profile save failed.')
      if (response.ok) {
        setName('')
        setDescription('')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'App profile save failed.')
    } finally {
      setBusy(false)
    }
  }

  function toggleCapability(value: string) {
    setCapabilities((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  return (
    <section id="add-app" className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Add App</p>
      <h2 className="mt-2 text-lg font-black text-white">Create connected app profile</h2>
      <form onSubmit={submit} className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="App name">
          <input value={name} onChange={(event) => setName(event.target.value)} required className="dashboard-input" />
        </Field>
        <Field label="App type / template">
          <select value={type} onChange={(event) => setType(event.target.value)} className="dashboard-input">
            <option value="general">General App</option>
            <option value="marketing">Marketing App</option>
            <option value="creator">Creator App</option>
            <option value="research">Research App</option>
            <option value="business">Business App</option>
          </select>
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="dashboard-input min-h-24 resize-y" />
        </Field>
        <div className="grid gap-3">
          <Field label="Memory scope">
            <select value={memoryScope} onChange={(event) => setMemoryScope(event.target.value)} className="dashboard-input">
              <option value="app">App scoped</option>
              <option value="workspace">Workspace scoped</option>
              <option value="brand">Brand scoped</option>
              <option value="none">No memory</option>
            </select>
          </Field>
          <Field label="Storage / artifact scope">
            <select value={storageScope} onChange={(event) => setStorageScope(event.target.value)} className="dashboard-input">
              <option value="app-artifacts">App artifacts</option>
              <option value="workspace-artifacts">Workspace artifacts</option>
              <option value="brand-assets">Brand assets</option>
            </select>
          </Field>
        </div>
        <div className="lg:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Allowed capability categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {capabilityGroups.map((item) => (
              <label key={item} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-300">
                <input type="checkbox" checked={capabilities.includes(item)} onChange={() => toggleCapability(item)} />
                {item}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={busy || !name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save app profile
          </button>
          {message && <p className="text-sm font-bold text-slate-400">{message}</p>}
        </div>
      </form>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span><span className="mt-1.5 block">{children}</span></label>
}
