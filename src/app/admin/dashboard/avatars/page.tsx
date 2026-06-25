'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Monitor, Plus, RefreshCw } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

const AVATAR_STYLES = [
  'realistic_human', 'anime', 'semi_realistic', '3d_character', 'cartoon',
  'children_cartoon', 'fantasy_character', 'brand_mascot', 'product_presenter',
  'customer_service_agent', 'teacher_tutor', 'story_character', 'ai_friend', 'creator_avatar',
]
const AVATAR_MODES = [
  'portrait', 'full_body', 'talking_head', 'image_avatar', 'video_avatar',
  'animated_avatar', 'cartoon_character', 'brand_character',
]
const AGE_CATEGORIES = ['adult', 'ageless', 'mascot', 'child_character']
const VOICE_MODES = ['none', 'generated_voice', 'cloned_voice']

interface AvatarRecord {
  id: string
  promptSummary: string
  status: string
  approvalStatus: string
  resultUrl: string | null
  generationMode: string
  runtimeSelectedProvider: string
  createdAt: string
}

type FormState = {
  avatarName: string
  style: string
  mode: string
  ageCategory: string
  appearance: string
  voiceMode: string
  consentConfirmed: boolean
  budget: string
}

const DEFAULT_FORM: FormState = {
  avatarName: '', style: 'realistic_human', mode: 'portrait',
  ageCategory: 'adult', appearance: '', voiceMode: 'none',
  consentConfirmed: false, budget: 'balanced',
}

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState<AvatarRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genResult, setGenResult] = useState<{ assetId: string; resultUrl: string | null; status: string } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/avatars?appSlug=dashboard', { cache: 'no-store' })
      const data = await res.json() as { avatars?: AvatarRecord[]; error?: string }
      setAvatars(data.avatars ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load avatars')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function generate() {
    if (!form.avatarName.trim()) { setGenError('Avatar name is required'); return }
    if (!form.appearance.trim()) { setGenError('Appearance description is required'); return }
    if (form.voiceMode === 'cloned_voice' && !form.consentConfirmed) {
      setGenError('Voice cloning requires consent confirmation')
      return
    }
    setGenerating(true)
    setGenError(null)
    setGenResult(null)
    try {
      const payload: Record<string, unknown> = {
        avatarName: form.avatarName.trim(),
        style: form.style,
        mode: form.mode,
        ageCategory: form.ageCategory,
        appearance: form.appearance.trim(),
        budget: form.budget,
        appSlug: 'dashboard',
        // No provider/model/providerOverride/modelOverride/endpoint
      }
      if (form.voiceMode !== 'none') {
        payload.voice = {
          voiceMode: form.voiceMode,
          consentConfirmed: form.voiceMode === 'cloned_voice' ? form.consentConfirmed : undefined,
        }
      }
      const res = await fetch('/api/admin/avatars/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { assetId?: string; status?: string; resultUrl?: string | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setGenResult({ assetId: data.assetId ?? '', resultUrl: data.resultUrl ?? null, status: data.status ?? 'processing' })
      setShowForm(false)
      await load()
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Avatars"
        title="Avatar Library"
        description="Create and manage AI avatar presenters. Voice cloning requires explicit consent. No provider or model selection — runtime decides."
        badge={
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={() => { setShowForm(v => !v); setGenError(null) }} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
              <Plus className="h-3.5 w-3.5" /> Create Avatar
            </button>
          </div>
        }
      />

      {genResult && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3">
          <p className="text-sm font-black text-emerald-300">Avatar generation started</p>
          <p className="text-xs text-emerald-200/70">Asset ID: {genResult.assetId} · Status: {genResult.status}</p>
          {genResult.resultUrl && <a href={genResult.resultUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-cyan-400">View result →</a>}
        </div>
      )}

      {showForm && (
        <SectionCard title="Create Avatar">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Avatar Name *">
                <input value={form.avatarName} onChange={e => setForm(f => ({ ...f, avatarName: e.target.value }))} className="field" placeholder="e.g. Brand Ambassador Maya" />
              </FormField>
              <FormField label="Age Category">
                <select value={form.ageCategory} onChange={e => setForm(f => ({ ...f, ageCategory: e.target.value }))} className="field">
                  {AGE_CATEGORIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </FormField>
              <FormField label="Style">
                <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))} className="field">
                  {AVATAR_STYLES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Mode">
                <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className="field">
                  {AVATAR_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Appearance Description *">
              <textarea value={form.appearance} onChange={e => setForm(f => ({ ...f, appearance: e.target.value }))} rows={3} className="field resize-none" placeholder="A confident professional woman with warm smile, dark hair, business casual attire…" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Voice Mode">
                <select value={form.voiceMode} onChange={e => setForm(f => ({ ...f, voiceMode: e.target.value }))} className="field">
                  {VOICE_MODES.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Budget">
                <select value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="field">
                  <option value="cheap">Cheap</option>
                  <option value="balanced">Balanced</option>
                  <option value="premium">Premium</option>
                </select>
              </FormField>
            </div>

            {form.voiceMode === 'cloned_voice' && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 space-y-3">
                <p className="text-xs font-bold text-amber-300">Voice cloning consent required</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consentConfirmed} onChange={e => setForm(f => ({ ...f, consentConfirmed: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-amber-400" />
                  <span className="text-sm text-slate-300">I confirm I have explicit consent from the voice owner to clone their voice, and I will not use it to impersonate anyone without rights.</span>
                </label>
              </div>
            )}

            {genError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {genError}
              </div>
            )}

            <button onClick={generate} disabled={generating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Generate Avatar'}
            </button>
          </div>
        </SectionCard>
      )}

      {loading && <LoadingState label="Loading avatars…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {!loading && !error && (
        <SectionCard title={`Avatars (${avatars.length})`}>
          {avatars.length === 0 ? (
            <EmptyState
              icon={<Monitor className="h-10 w-10" />}
              title="No avatars yet"
              description="Create your first AI avatar presenter."
              action={<button onClick={() => setShowForm(true)} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300">Create Avatar</button>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {avatars.map(a => (
                <div key={a.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                  {a.resultUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={a.resultUrl} alt={a.promptSummary || 'Avatar'} className="mb-2 w-full rounded-lg object-cover" style={{ maxHeight: 180 }} />
                  )}
                  <p className="font-bold text-slate-200 text-sm">{a.promptSummary || 'Avatar'}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <StatusBadge status={a.status === 'completed' ? 'healthy' : a.status === 'failed' ? 'critical' : 'pending'} label={a.status} />
                    {a.runtimeSelectedProvider && <span className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-400">{a.runtimeSelectedProvider}</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <style jsx>{`
        .field { width: 100%; background: rgba(15,23,42,0.6); border: 1px solid rgba(51,65,85,0.6); border-radius: 0.625rem; color: #e2e8f0; font-size: 0.875rem; padding: 0.5rem 0.75rem; outline: none; }
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
