'use client'

import { useCallback, useEffect, useState } from 'react'
import { BriefcaseBusiness, Loader2, Palette, Plus, Save } from 'lucide-react'

type Project = { id: string; name: string; description: string; brandKitId: string | null }
type BrandKit = {
  id: string
  name: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  fontPreference: string
  toneOfVoice: string
  audience: string
  productNotes: string
  usageNotes: string
}

const emptyKit = {
  name: '',
  logoUrl: '',
  primaryColor: '#22d3ee',
  secondaryColor: '#14b8a6',
  fontPreference: 'Inter',
  toneOfVoice: '',
  audience: '',
  productNotes: '',
  usageNotes: '',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [kits, setKits] = useState<BrandKit[]>([])
  const [kit, setKit] = useState(emptyKit)
  const [projectName, setProjectName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/creative-workspaces', { cache: 'no-store' })
    const data = await response.json()
    if (response.ok) {
      setProjects(data.projects ?? [])
      setKits(data.brandKits ?? [])
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function saveBrandKit() {
    if (!kit.name.trim()) return
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/creative-workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'brandKit', appSlug: 'amarktai-network', ...kit }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Brand kit saved.' : data.error || 'Brand kit could not be saved.')
    if (response.ok) {
      setKit(emptyKit)
      await load()
    }
    setBusy(false)
  }

  async function createProject() {
    if (!projectName.trim()) return
    setBusy(true)
    const response = await fetch('/api/admin/creative-workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'project', name: projectName, appSlug: 'amarktai-network' }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Project created.' : data.error || 'Project could not be created.')
    if (response.ok) {
      setProjectName('')
      await load()
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Projects" icon={<BriefcaseBusiness className="h-5 w-5" />}>
          <div className="flex gap-2">
            <input className="control" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Campaign or workspace name" />
            <button className="primary" disabled={busy || !projectName.trim()} onClick={() => void createProject()}><Plus className="h-4 w-4" />Create</button>
          </div>
          <div className="mt-4 grid gap-3">
            {projects.length === 0 && <Empty text="No projects yet. Create one to group brand context and generated work." />}
            {projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <h3 className="font-black text-white">{project.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{project.description || 'Ready for generated content.'}</p>
                <p className="mt-3 text-xs font-bold text-cyan-300">{project.brandKitId ? 'Brand kit linked' : 'No brand kit selected'}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Create a brand kit" icon={<Palette className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Brand name"><input className="control" value={kit.name} onChange={(event) => setKit({ ...kit, name: event.target.value })} /></Field>
            <Field label="Logo URL or artifact"><input className="control" value={kit.logoUrl} onChange={(event) => setKit({ ...kit, logoUrl: event.target.value })} /></Field>
            <Field label="Primary color"><input className="control" type="color" value={kit.primaryColor} onChange={(event) => setKit({ ...kit, primaryColor: event.target.value })} /></Field>
            <Field label="Secondary color"><input className="control" type="color" value={kit.secondaryColor} onChange={(event) => setKit({ ...kit, secondaryColor: event.target.value })} /></Field>
            <Field label="Font preference"><input className="control" value={kit.fontPreference} onChange={(event) => setKit({ ...kit, fontPreference: event.target.value })} /></Field>
            <Field label="Audience"><input className="control" value={kit.audience} onChange={(event) => setKit({ ...kit, audience: event.target.value })} /></Field>
          </div>
          <Field label="Tone of voice"><textarea className="control min-h-20" value={kit.toneOfVoice} onChange={(event) => setKit({ ...kit, toneOfVoice: event.target.value })} /></Field>
          <Field label="Product or service context"><textarea className="control min-h-20" value={kit.productNotes} onChange={(event) => setKit({ ...kit, productNotes: event.target.value })} /></Field>
          <Field label="Usage notes"><textarea className="control min-h-20" value={kit.usageNotes} onChange={(event) => setKit({ ...kit, usageNotes: event.target.value })} /></Field>
          <button className="primary mt-3" disabled={busy || !kit.name.trim()} onClick={() => void saveBrandKit()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save brand kit
          </button>
          {message && <p className="mt-3 text-sm text-cyan-200">{message}</p>}
        </Panel>
      </section>

      <Panel title="Brand kit library" icon={<Palette className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {kits.length === 0 && <Empty text="No brand kits saved yet." />}
          {kits.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl border border-white/10" style={{ background: `linear-gradient(135deg,${item.primaryColor},${item.secondaryColor})` }} />
                <div><h3 className="font-black text-white">{item.name}</h3><p className="text-xs text-slate-500">{item.fontPreference}</p></div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{item.toneOfVoice || 'No tone guidance recorded.'}</p>
              <p className="mt-2 text-xs text-slate-500">{item.audience || 'Audience not specified'}</p>
            </article>
          ))}
        </div>
      </Panel>
      <style jsx>{`.control{width:100%;border:1px solid rgb(51 65 85);border-radius:.75rem;background:#020617;padding:.7rem .8rem;color:white;outline:none}.primary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:.75rem;background:#67e8f9;padding:.7rem 1rem;font-size:.75rem;font-weight:900;color:#082f49}.primary:disabled{opacity:.4}`}</style>
    </div>
  )
}

function PageHeader() {
  return <header className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_42%)] p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Projects & Brand Kits</p><h1 className="mt-2 text-3xl font-black text-white">Keep every generation on brand.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Reusable context for text, images, video, music, avatars, and connected app work.</p></header>
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="mb-4 flex items-center gap-2 text-cyan-300">{icon}<h2 className="font-black text-white">{title}</h2></div>{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-3 block text-xs font-bold text-slate-400">{label}<span className="mt-2 block">{children}</span></label>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">{text}</div>
}
