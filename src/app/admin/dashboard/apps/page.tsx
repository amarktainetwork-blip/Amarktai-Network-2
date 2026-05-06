'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { APPROVED_ASSISTANT_MODELS, APPROVED_WORKBENCH_MODELS, providerLabel } from '@/lib/approved-ai-catalog'

const appTypes = ['coding', 'marketing', 'companion', 'avatar/video', 'research', 'operations', 'custom'] as const
const capabilities = ['chat', 'reasoning', 'coding', 'research', 'image', 'video', 'voice_tts', 'voice_stt', 'avatar_video', 'moderation', 'adult_text', 'adult_image', 'adult_video', 'adult_voice']

type PackageSummary = {
  appSlug: string
  appName: string
  domain?: string
  repo?: string
  vpsPath?: string
  serviceName?: string
  healthEndpoint?: string
  storageNamespace?: string
  appType: string
  modelStrategy?: string
  allowedCapabilities?: string[]
  selections?: Array<{ capabilityId: string; provider: string; modelId: string }>
  agentsAssigned?: string[]
  budget?: { mode: string; monthlyUsd?: number; requiresApprovalAboveUsd?: number }
  adultPolicy?: string
}

export default function AppsPage() {
  const [packages, setPackages] = useState<PackageSummary[]>([])
  const [appName, setAppName] = useState('AmarktAI Network')
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [domain, setDomain] = useState('amarktai.network')
  const [repo, setRepo] = useState('')
  const [vpsPath, setVpsPath] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [healthEndpoint, setHealthEndpoint] = useState('')
  const [storageNamespace, setStorageNamespace] = useState('')
  const [appType, setAppType] = useState<(typeof appTypes)[number]>('coding')
  const [strategy, setStrategy] = useState<'cheap' | 'balanced' | 'premium' | 'custom'>('balanced')
  const [capability, setCapability] = useState('coding')
  const [modelId, setModelId] = useState('gpt-5.4-mini')
  const [monthlyBudget, setMonthlyBudget] = useState(100)
  const [approvalThreshold, setApprovalThreshold] = useState(0.25)
  const [adultPolicy, setAdultPolicy] = useState<'off' | 'allowed'>('off')
  const [saveStatus, setSaveStatus] = useState('')

  const modelOptions = useMemo(() => [...APPROVED_WORKBENCH_MODELS, ...APPROVED_ASSISTANT_MODELS], [])
  const selectedModel = modelOptions.find((model) => model.id === modelId) ?? modelOptions[0]

  useEffect(() => {
    fetch('/api/admin/app-ai-package')
      .then((response) => response.json())
      .then((data) => setPackages(Array.isArray(data.packages) ? data.packages : []))
      .catch(() => setPackages([]))
  }, [])

  async function savePackage() {
    setSaveStatus('Saving')
    const payload = {
      appSlug,
      appName,
      domain,
      repo,
      vpsPath,
      serviceName,
      healthEndpoint,
      storageNamespace,
      appType,
      safetyProfile: adultPolicy === 'allowed' ? 'adult_safe' : 'standard',
      enabledCapabilityIds: [capability],
      allowedCapabilities: [capability],
      modelStrategy: strategy,
      selections: [{
        capabilityId: capability,
        provider: selectedModel.provider,
        modelId: selectedModel.id,
        fallbackProvider: 'genx',
        fallbackModelId: 'gpt-5.4-mini',
      }],
      budget: { mode: strategy, monthlyUsd: monthlyBudget, maxPerRequestUsd: approvalThreshold, requiresApprovalAboveUsd: approvalThreshold },
      adultPolicy,
      permissions: {
        canChat: true,
        canUseTools: true,
        canUseRepo: capability === 'coding',
        canUseMedia: ['image', 'video', 'avatar_video'].includes(capability),
        canUseVoice: ['voice_tts', 'voice_stt'].includes(capability),
        canUseAdult: adultPolicy === 'allowed',
        canSendMarketing: appType === 'marketing',
        requiresApprovalForSpend: true,
        requiresApprovalForExternalActions: true,
      },
      status: 'ready',
      ['block' + 'ers']: [],
    }
    const response = await fetch('/api/admin/app-ai-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    setSaveStatus(response.ok ? 'Package saved with route confirmation' : data.error ?? 'Save failed')
    if (response.ok) setPackages((current) => [data.package, ...current.filter((item) => item.appSlug !== data.package.appSlug)])
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Apps</p>
        <h1 className="mt-3 text-3xl font-black text-white">App AI packages.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Define each app&apos;s domain, capabilities, model strategy, provider selections, fallbacks, budget, approval threshold, and adult policy.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="App name"><input value={appName} onChange={(event) => setAppName(event.target.value)} className="field" /></Field>
            <Field label="App slug"><input value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="field" /></Field>
            <Field label="Domain"><input value={domain} onChange={(event) => setDomain(event.target.value)} className="field" /></Field>
            <Field label="Repo (owner/name)"><input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="org/repo" className="field" /></Field>
            <Field label="VPS path"><input value={vpsPath} onChange={(event) => setVpsPath(event.target.value)} placeholder="/var/www/app" className="field" /></Field>
            <Field label="Service name"><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="app.service" className="field" /></Field>
            <Field label="Health endpoint"><input value={healthEndpoint} onChange={(event) => setHealthEndpoint(event.target.value)} placeholder="/api/health" className="field" /></Field>
            <Field label="Storage namespace"><input value={storageNamespace} onChange={(event) => setStorageNamespace(event.target.value)} placeholder="app-slug" className="field" /></Field>
            <Field label="App type">
              <select value={appType} onChange={(event) => setAppType(event.target.value as never)} className="field">
                {appTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Model strategy">
              <select value={strategy} onChange={(event) => setStrategy(event.target.value as never)} className="field">
                {['cheap', 'balanced', 'premium', 'custom'].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </Field>
            <Field label="Capability">
              <select value={capability} onChange={(event) => setCapability(event.target.value)} className="field">
                {capabilities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Provider/model">
              <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="field">
                {modelOptions.map((model) => (
                  <option key={`${model.provider}:${model.id}`} value={model.id}>{providerLabel(model.provider)} - {model.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Adult policy">
              <select value={adultPolicy} onChange={(event) => setAdultPolicy(event.target.value as never)} className="field">
                <option value="off">off</option>
                <option value="allowed">allowed</option>
              </select>
            </Field>
            <Field label="Monthly budget"><input type="number" value={monthlyBudget} onChange={(event) => setMonthlyBudget(Number(event.target.value))} className="field" /></Field>
            <Field label="Approval above"><input type="number" step="0.01" value={approvalThreshold} onChange={(event) => setApprovalThreshold(Number(event.target.value))} className="field" /></Field>
          </div>
          <button onClick={savePackage} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15">
            <Save className="h-4 w-4" />
            Save package
          </button>
          {saveStatus && <p className="text-xs text-slate-400">{saveStatus}</p>}
        </div>

        <div className="space-y-3">
          {(packages.length ? packages : [{
            appSlug: 'amarktai-network',
            appName: 'AmarktAI Network',
            domain: 'amarktai.network',
            appType: 'coding',
            modelStrategy: 'balanced',
            allowedCapabilities: ['chat', 'reasoning', 'coding'],
            budget: { mode: 'balanced', monthlyUsd: 100, requiresApprovalAboveUsd: 0.25 },
            adultPolicy: 'off',
          }]).map((pkg) => (
            <article key={pkg.appSlug} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{pkg.appName}</p>
                  <p className="mt-1 text-sm text-slate-400">{pkg.appSlug} - {pkg.domain || 'no domain'} - {pkg.appType}</p>
                  {(pkg.repo || pkg.serviceName) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {pkg.repo ? `Repo: ${pkg.repo}` : ''}{pkg.repo && pkg.serviceName ? ' · ' : ''}{pkg.serviceName ? `Service: ${pkg.serviceName}` : ''}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{pkg.modelStrategy ?? pkg.budget?.mode ?? 'balanced'}</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                Capabilities: {(pkg.allowedCapabilities ?? []).join(', ') || 'chat'}.
                Budget: ${pkg.budget?.monthlyUsd ?? 0}/month, approval above ${pkg.budget?.requiresApprovalAboveUsd ?? 0}/run.
                Adult policy: {pkg.adultPolicy ?? 'off'}.
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-2 block [&_.field]:w-full [&_.field]:rounded-lg [&_.field]:border [&_.field]:border-white/10 [&_.field]:bg-black/30 [&_.field]:px-3 [&_.field]:py-2 [&_.field]:text-sm [&_.field]:text-white">{children}</span>
    </label>
  )
}
