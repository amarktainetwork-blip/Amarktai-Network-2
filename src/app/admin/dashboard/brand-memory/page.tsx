'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Plus, RefreshCw, Save, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

interface BrandMemory {
  id: string
  brandName: string
  description: string
  audience: string
  voice: string
  tone: string
  visualStyle?: string
  colors: { primary: string; secondary: string; accent: string; background: string; text: string }
  rules: { dos: string[]; donts: string[]; contentGuidelines: string[]; toneGuidelines: string[] }
  products: string[]
  services: string[]
  referenceMaterial: string[]
  updatedAt: string
}

type EditForm = {
  brandName: string
  description: string
  audience: string
  voice: string
  tone: string
  visualStyle: string
  products: string
  services: string
  dos: string
  donts: string
  contentGuidelines: string
  toneGuidelines: string
  referenceMaterial: string
  colors: string
}

const EMPTY_FORM: EditForm = {
  brandName: '', description: '', audience: '', voice: '', tone: '',
  visualStyle: '', products: '', services: '', dos: '', donts: '',
  contentGuidelines: '', toneGuidelines: '', referenceMaterial: '', colors: '',
}

export default function BrandMemoryPage() {
  const [brands, setBrands] = useState<BrandMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // brand id or 'new'
  const [form, setForm] = useState<EditForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/brand-memory?appSlug=dashboard', { cache: 'no-store' })
      const data = await res.json() as { brands?: BrandMemory[]; error?: string }
      setBrands(data.brands ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brand memory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function startNew() {
    setForm(EMPTY_FORM)
    setEditing('new')
    setSaveError(null)
  }

  function startEdit(b: BrandMemory) {
    setForm({
      brandName: b.brandName,
      description: b.description,
      audience: b.audience,
      voice: b.voice,
      tone: b.tone,
      visualStyle: b.visualStyle ?? '',
      products: b.products.join(', '),
      services: b.services.join(', '),
      dos: b.rules.dos.join('\n'),
      donts: b.rules.donts.join('\n'),
      contentGuidelines: b.rules.contentGuidelines.join('\n'),
      toneGuidelines: b.rules.toneGuidelines.join('\n'),
      referenceMaterial: b.referenceMaterial.join('\n'),
      colors: Object.values(b.colors).filter(Boolean).join(', '),
    })
    setEditing(b.id)
    setSaveError(null)
  }

  async function save() {
    if (!form.brandName.trim()) { setSaveError('Brand name is required'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        id: editing !== 'new' ? editing : undefined,
        appSlug: 'dashboard',
        brandName: form.brandName.trim(),
        description: form.description,
        audience: form.audience,
        voice: form.voice,
        tone: form.tone,
        visualStyle: form.visualStyle,
        products: form.products.split(',').map(s => s.trim()).filter(Boolean),
        services: form.services.split(',').map(s => s.trim()).filter(Boolean),
        rules: {
          dos: form.dos.split('\n').map(s => s.trim()).filter(Boolean),
          donts: form.donts.split('\n').map(s => s.trim()).filter(Boolean),
          contentGuidelines: form.contentGuidelines.split('\n').map(s => s.trim()).filter(Boolean),
          toneGuidelines: form.toneGuidelines.split('\n').map(s => s.trim()).filter(Boolean),
        },
        referenceMaterial: form.referenceMaterial.split('\n').map(s => s.trim()).filter(Boolean),
        colors: { primary: '', secondary: '', accent: '', background: '', text: '' },
      }
      const res = await fetch('/api/admin/brand-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setEditing(null)
      await load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Brand Memory"
        title="Brand Memory"
        description="Persistent brand identity, guidelines, and voice. Used by marketing workflows and agents."
        badge={
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={startNew} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
              <Plus className="h-3.5 w-3.5" /> New Brand
            </button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading brand memory…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {editing && (
        <SectionCard title={editing === 'new' ? 'New Brand Profile' : 'Edit Brand Profile'}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Brand Name *">
                <input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} className="field" placeholder="AmarktAI" />
              </FormField>
              <FormField label="Category / Industry">
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="field" placeholder="AI Marketing Platform" />
              </FormField>
            </div>
            <FormField label="Target Audience">
              <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} className="field" placeholder="Marketing managers, content creators…" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Voice / Tone of Voice">
                <input value={form.voice} onChange={e => setForm(f => ({ ...f, voice: e.target.value }))} className="field" placeholder="Professional, friendly, confident" />
              </FormField>
              <FormField label="Visual Style">
                <input value={form.visualStyle} onChange={e => setForm(f => ({ ...f, visualStyle: e.target.value }))} className="field" placeholder="Modern, clean, blue/cyan palette" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Products (comma-separated)">
                <input value={form.products} onChange={e => setForm(f => ({ ...f, products: e.target.value }))} className="field" placeholder="AI campaigns, content generation…" />
              </FormField>
              <FormField label="Services (comma-separated)">
                <input value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} className="field" placeholder="Marketing automation, RAG search…" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Content DOs (one per line)">
                <textarea value={form.dos} onChange={e => setForm(f => ({ ...f, dos: e.target.value }))} className="field resize-none" rows={3} placeholder="Use clear CTAs&#10;Highlight benefits&#10;Use brand colors" />
              </FormField>
              <FormField label="Content DON'Ts (one per line)">
                <textarea value={form.donts} onChange={e => setForm(f => ({ ...f, donts: e.target.value }))} className="field resize-none" rows={3} placeholder="Avoid jargon&#10;Never make false claims&#10;No clickbait" />
              </FormField>
            </div>
            <FormField label="Content Guidelines (one per line)">
              <textarea value={form.contentGuidelines} onChange={e => setForm(f => ({ ...f, contentGuidelines: e.target.value }))} className="field resize-none" rows={3} placeholder="Posts must include hashtags&#10;Always include CTA&#10;Max 280 chars for X" />
            </FormField>
            <FormField label="Source URLs / Reference Material (one per line)">
              <textarea value={form.referenceMaterial} onChange={e => setForm(f => ({ ...f, referenceMaterial: e.target.value }))} className="field resize-none" rows={3} placeholder="https://example.com/about&#10;https://example.com/products" />
            </FormField>

            {saveError && <p className="text-xs text-red-300">{saveError}</p>}
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save Brand'}
              </button>
              <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {!loading && !error && !editing && (
        <SectionCard title={`Brand Profiles (${brands.length})`}>
          {brands.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="No brand profiles yet"
              description="Create a brand profile or run the Marketing Workflow to extract brand identity automatically."
              action={
                <button onClick={startNew} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
                  Create Brand Profile
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {brands.map(b => (
                <div key={b.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-200">{b.brandName}</p>
                      {b.description && <p className="text-xs text-slate-400">{b.description}</p>}
                      {b.audience && <p className="mt-1 text-xs text-slate-500">Audience: {b.audience}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {b.products.slice(0, 3).map(p => (
                          <span key={p} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{p}</span>
                        ))}
                        {b.services.slice(0, 2).map(s => (
                          <span key={s} className="rounded border border-cyan-800/40 bg-cyan-900/20 px-1.5 py-0.5 text-[10px] text-cyan-400">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="active" label="active" />
                      <button onClick={() => startEdit(b)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200">
                        Edit
                      </button>
                    </div>
                  </div>
                  {b.voice && <p className="mt-2 text-xs text-slate-500">Voice: {b.voice} · Tone: {b.tone}</p>}
                  {b.rules.dos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {b.rules.dos.slice(0, 2).map(d => (
                        <span key={d} className="rounded bg-emerald-900/20 px-1.5 py-0.5 text-[10px] text-emerald-400">✓ {d}</span>
                      ))}
                      {b.rules.donts.slice(0, 2).map(d => (
                        <span key={d} className="rounded bg-red-900/20 px-1.5 py-0.5 text-[10px] text-red-400">✗ {d}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <style jsx>{`
        .field { width: 100%; background: rgba(15,23,42,0.6); border: 1px solid rgba(51,65,85,0.6); border-radius: 0.625rem; color: #e2e8f0; font-size: 0.875rem; padding: 0.625rem 0.75rem; outline: none; }
        .field:focus { border-color: rgba(34,211,238,0.4); }
        .field option { background: #0f172a; }
      `}</style>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  )
}
