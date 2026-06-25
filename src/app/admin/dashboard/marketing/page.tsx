'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { runMarketingWorkflow, type MarketingWorkflowResult } from '@/lib/dashboard-api'
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

type FormState = {
  websiteUrl: string
  campaignGoal: string
  targetAudience: string
  platforms: string[]
  contentTypes: string[]
  durationDays: number
  budgetTier: 'cheap' | 'balanced' | 'premium'
  qualityTier: 'basic' | 'standard' | 'high' | 'premium'
  approvalMode: 'auto' | 'manual_review'
}

const PLATFORM_OPTIONS = ['instagram', 'tiktok', 'youtube_shorts', 'facebook', 'linkedin', 'x', 'pinterest', 'generic']
const CONTENT_TYPE_OPTIONS = ['social_post', 'image', 'short_video', 'reel', 'caption', 'script', 'music', 'voiceover', 'avatar_presenter']

export default function MarketingPage() {
  const [form, setForm] = useState<FormState>({
    websiteUrl: '',
    campaignGoal: '',
    targetAudience: '',
    platforms: ['instagram'],
    contentTypes: ['social_post', 'image'],
    durationDays: 7,
    budgetTier: 'balanced',
    qualityTier: 'standard',
    approvalMode: 'manual_review',
  })
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<MarketingWorkflowResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepsOpen, setStepsOpen] = useState(false)

  function toggleMulti(key: 'platforms' | 'contentTypes', value: string) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.websiteUrl || !form.campaignGoal || form.platforms.length === 0 || form.contentTypes.length === 0) {
      setError('Website URL, campaign goal, at least one platform, and at least one content type are required.')
      return
    }
    setRunning(true)
    setError(null)
    setResult(null)
    // runMarketingWorkflow internally strips providerOverride/modelOverride/provider/model/endpoint
    const res = await runMarketingWorkflow({
      websiteUrl: form.websiteUrl,
      campaignGoal: form.campaignGoal,
      targetAudience: form.targetAudience || undefined,
      platforms: form.platforms,
      contentTypes: form.contentTypes,
      durationDays: form.durationDays,
      budgetTier: form.budgetTier,
      qualityTier: form.qualityTier,
      approvalMode: form.approvalMode,
    })
    setRunning(false)
    if (res.ok && res.data) {
      setResult(res.data)
    } else {
      setError(res.error ?? 'Workflow failed')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Marketing"
        title="Marketing Workflow"
        description="Enter your website and campaign goals. AmarktAI scrapes, analyzes, and generates campaign content automatically. No provider or model selection required."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <SectionCard title="Campaign Setup">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Website URL *">
              <input
                type="url"
                value={form.websiteUrl}
                onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://example.com"
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                required
              />
            </Field>

            <Field label="Campaign Goal *">
              <textarea
                value={form.campaignGoal}
                onChange={e => setForm(f => ({ ...f, campaignGoal: e.target.value }))}
                placeholder="Describe what this campaign should achieve…"
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                required
              />
            </Field>

            <Field label="Target Audience">
              <input
                type="text"
                value={form.targetAudience}
                onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                placeholder="e.g. young professionals aged 25-35"
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
              />
            </Field>

            <Field label="Platforms *">
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(p => (
                  <ToggleChip key={p} active={form.platforms.includes(p)} onClick={() => toggleMulti('platforms', p)} label={p} />
                ))}
              </div>
            </Field>

            <Field label="Content Types *">
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPE_OPTIONS.map(c => (
                  <ToggleChip key={c} active={form.contentTypes.includes(c)} onClick={() => toggleMulti('contentTypes', c)} label={c.replace(/_/g, ' ')} />
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duration (days)">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.durationDays}
                  onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/40"
                />
              </Field>
              <Field label="Budget Tier">
                <select value={form.budgetTier} onChange={e => setForm(f => ({ ...f, budgetTier: e.target.value as FormState['budgetTier'] }))} className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/40">
                  <option value="cheap">Cheap</option>
                  <option value="balanced">Balanced</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
              <Field label="Quality Tier">
                <select value={form.qualityTier} onChange={e => setForm(f => ({ ...f, qualityTier: e.target.value as FormState['qualityTier'] }))} className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/40">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
              <Field label="Approval Mode">
                <select value={form.approvalMode} onChange={e => setForm(f => ({ ...f, approvalMode: e.target.value as FormState['approvalMode'] }))} className="w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/40">
                  <option value="manual_review">Manual Review</option>
                  <option value="auto">Auto</option>
                </select>
              </Field>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
              {running ? 'Running workflow…' : 'Run Marketing Workflow'}
            </button>
          </form>
        </SectionCard>

        <div className="space-y-4">
          {running && (
            <SectionCard title="Workflow Running">
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <p className="text-sm text-slate-400">Scraping, analyzing, and generating content…</p>
              </div>
            </SectionCard>
          )}

          {result && (
            <>
              <SectionCard title="Workflow Complete">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="font-black text-emerald-300">Campaign created</p>
                </div>
                <p className="text-xs text-slate-500">Campaign ID: <span className="font-mono text-slate-300">{result.campaignId}</span></p>
                {result.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</div>
                    ))}
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-red-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{String(err)}</div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={`Steps (${result.steps.length})`}
                action={
                  <button onClick={() => setStepsOpen(v => !v)} className="text-slate-400 hover:text-slate-200">
                    {stepsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                }
              >
                {stepsOpen
                  ? result.steps.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 py-1 text-xs">
                        <span className="text-slate-400">{s.step}</span>
                        <StatusBadge status={['done', 'success'].includes(s.status) ? 'healthy' : s.status === 'skipped' ? 'unknown' : 'warning'} label={s.status} />
                      </div>
                    ))
                  : <p className="text-xs text-slate-500">Click to expand</p>
                }
              </SectionCard>

              <SectionCard title={`Assets (${result.assets.length})`}>
                <p className="text-xs text-slate-400">{result.assets.length === 0 ? 'No assets generated yet.' : `${result.assets.length} asset(s) created. View in Assets.`}</p>
              </SectionCard>
            </>
          )}

          {!running && !result && (
            <SectionCard>
              <EmptyState title="No results yet" description="Fill in the form and run the workflow to see results here." />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
        active ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}
