'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Settings2, Cpu, FolderGit2, RefreshCw, CheckCircle, AlertCircle,
  ShieldCheck, Key, HardDrive, Loader2,
  Eye, EyeOff, Save, TestTube2, XCircle, ChevronDown, ChevronRight,
  Server, Mic, Bot,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AIEngineConfig {
  configured: boolean
  maskedKey: string
  apiUrl: string
  source: 'database' | 'env' | 'none'
  updatedAt: string | null
}

interface GitHubConfig {
  configured: boolean
  maskedToken: string
  username: string | null
  defaultOwner: string
  lastValidatedAt: string | null
}

interface StorageConfig {
  driver: string
  bucket: string
  region: string
  endpoint: string
  accessKey: string
  r2PublicUrl: string
  configured: boolean
  source: string
}

interface AdultConfig {
  mode: string
  providerType: string
  specialistEndpoint: string
  hasSpecialistKey: boolean
  maskedSpecialistKey: string
  providerModel: string
  lastTestStatus: string | null
}

interface AivaConfig {
  typedEnabled: boolean
  voiceEnabled: boolean
  sttProvider: string
  ttsProvider: string
  preferredVoiceModel: string
  continuousConversation: boolean
}

interface ProviderRecord {
  id: number
  providerKey: string
  displayName: string
  enabled: boolean
  maskedPreview: string
  baseUrl: string
  healthStatus: string
  healthMessage: string | null
}

interface IntegrationsData {
  genx: AIEngineConfig
  github: GitHubConfig
  storage: StorageConfig
  adult: AdultConfig
  aiva: AivaConfig
  aivaEnabled?: boolean
  webdock?: { configured: boolean; source: string }
  firecrawl?: { configured: boolean; source: string }
  qdrant?: { configured: boolean; url: string; hasApiKey: boolean; source: string }
  mem0?: { configured: boolean; source: string }
  posthog?: { configured: boolean; source: string }
}

interface TestResult {
  success: boolean
  error?: string
  [key: string]: unknown
}

// ── Fade animation ─────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetMsg, setResetMsg] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings/integrations')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCleanSlateReset = useCallback(async () => {
    if (!window.confirm('This will clear all saved provider API keys. App data, repos, memory, and accounts will NOT be deleted. Continue?')) return
    setResetting(true)
    setResetMsg(null)
    try {
      const res = await fetch('/api/admin/settings/reset-approved-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_APPROVED_KEYS', all: true }),
      })
      const body = await res.json() as { success?: boolean; cleared?: number; error?: string }
      if (!res.ok || !body.success) throw new Error(body.error ?? 'Reset failed')
      setResetMsg(`Clean slate complete — ${body.cleared ?? 0} key(s) cleared. All providers now show Needs key.`)
      await load()
    } catch (e) {
      setResetMsg(`Reset failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setResetting(false)
    }
  }, [load])

  useEffect(() => { load() }, [load])

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="space-y-6 max-w-3xl"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <p className="text-sm text-slate-400">Configure API keys, integrations, and system behaviour for the AmarktAI Network operator console.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleCleanSlateReset}
                disabled={resetting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                title="Clear all saved provider API keys and start clean"
              >
                {resetting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                Start clean / clear saved provider keys
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Setup checklist */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Setup checklist</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {[
              { label: 'Admin account', done: true },
              { label: 'AI stack keys (GenX / Qwen / Gemini)', done: Boolean(data?.genx?.configured) },
              { label: 'GitHub', done: Boolean(data?.github?.configured) },
              { label: 'Webdock', done: false },
              { label: 'Firecrawl', done: Boolean(data?.firecrawl?.configured) },
              { label: 'Local storage', done: Boolean(data?.storage?.configured) },
              { label: 'Memory', done: false },
              { label: 'Adult policy', done: false },
              { label: 'Voice / media', done: false },
              { label: 'Diagnostics proof', done: false },
            ].map(({ label, done }) => (
              <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${done ? 'text-emerald-300' : 'text-slate-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${done ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Configuration tabs</p>
          <div className="flex flex-wrap gap-2">
            {(['AI Stack', 'Tools', 'Scraping & Storage', 'Memory', 'Voice & Media', 'Adult & Safety', 'Admin & Security', 'Diagnostics'] as const).map((tab) => (
              <span key={tab} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
                {tab}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">All settings sections are listed below. Tab-based navigation is ready to wire once all sections are validated.</p>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {resetMsg && (
        <motion.div
          variants={fadeUp}
          className={[
            'rounded-xl border p-4 text-sm flex items-center gap-2',
            resetMsg.startsWith('Reset failed')
              ? 'border-red-500/20 bg-red-500/5 text-red-400'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
          ].join(' ')}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {resetMsg}
        </motion.div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : data ? (
        <>
          <AIEngineSection config={data.genx} onSaved={load} />
          {data.aivaEnabled && <AivaSection config={data.aiva} onSaved={load} />}
          <GitHubSection config={data.github} onSaved={load} />
          <WebdockSection />
          <ServiceIntegrationsSection data={data} onSaved={load} />
          <StorageSection config={data.storage} onSaved={load} />
          <AdultSection config={data.adult} onSaved={load} />
          <AivaVoiceSection />
          <HFTaskRoutingSection />
          <ProvidersSection />
        </>
      ) : null}
    </motion.div>
  )
}

// ── AI Engine Section ─────────────────────────────────────────────────────────

const DEFAULT_AI_ENGINE_URL = 'https://query.genx.sh'

function AIEngineSection({ config, onSaved }: { config: AIEngineConfig; onSaved: () => void }) {
  const [open, setOpen] = useState(!config.configured)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [apiUrl, setApiUrl] = useState(config.apiUrl || DEFAULT_AI_ENGINE_URL)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genx: { apiKey: apiKey || undefined, apiUrl: apiUrl || undefined } }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        setApiKey('')
        onSaved()
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-genx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || undefined, apiUrl: apiUrl || undefined }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const badge = config.configured
    ? { label: `Configured · ${config.source}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : { label: 'Not configured', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Cpu className="h-5 w-5 text-cyan-400" />}
        title="AI Engine"
        badge={badge}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            The primary AI execution layer. Enter only your API key — the default endpoint is pre-configured. Workspace tasks, image generation, TTS, and code assistance route through the AI Engine automatically.
          </p>

          {config.configured && !open && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {config.maskedKey && <span className="font-mono bg-white/5 px-2 py-1 rounded">{config.maskedKey}</span>}
            </div>
          )}

          {open && (
            <div className="space-y-3">
              <Field label="API Key">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={config.maskedKey ? `Current: ${config.maskedKey}` : 'gnxk_…'}
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config.maskedKey && <p className="text-[10px] text-slate-600 mt-1">Leave blank to keep existing key</p>}
              </Field>

              {/* Advanced base URL — collapsed by default */}
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Advanced: Base URL override
              </button>

              {showAdvanced && (
                <Field label="API Base URL">
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    placeholder={DEFAULT_AI_ENGINE_URL}
                    className={inputCls}
                  />
                  <p className="text-[10px] text-slate-600 mt-1">
                    Default: {DEFAULT_AI_ENGINE_URL}. Enter the base URL only — any /api/v1/models or path suffixes will be stripped automatically.
                  </p>
                  {(() => { try { return new URL(apiUrl).hostname === 'genx.sh' } catch { return false } })() && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      ⚠ Use <strong>https://query.genx.sh</strong> (the API endpoint), not https://genx.sh (the dashboard — returns HTML, not JSON).
                    </p>
                  )}
                </Field>
              )}

              {testResult && (
                <div className="space-y-2">
                  <TestResultBanner result={testResult} extra={
                    testResult.success
                      ? `${testResult.modelCount as number} models · ${testResult.latencyMs as number}ms`
                      : (testResult.catalogError as string | undefined) ?? (testResult.chatError as string | undefined)
                  } />
                  {(testResult.catalogOk !== undefined || testResult.chatOk !== undefined) && (
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className={(testResult.catalogOk as boolean) ? 'text-emerald-400' : 'text-red-400'}>
                        {(testResult.catalogOk as boolean) ? '✓' : '✗'} Catalog{testResult.catalogError ? `: ${testResult.catalogError as string}` : ''}
                      </span>
                      <span className={(testResult.chatOk as boolean) ? 'text-emerald-400' : 'text-red-400'}>
                        {(testResult.chatOk as boolean) ? '✓' : '✗'} Chat{testResult.chatError ? `: ${testResult.chatError as string}` : ''}
                      </span>
                      {testResult.generateOk !== undefined || testResult.generateNotTested ? (
                        <span className={
                          testResult.generateNotTested
                            ? 'text-slate-500'
                            : (testResult.generateOk as boolean) ? 'text-emerald-400' : 'text-red-400'
                        }>
                          {testResult.generateNotTested
                            ? '— Generate (dry-run not supported)'
                            : ((testResult.generateOk as boolean) ? '✓' : '✗') + ' Generate' + (testResult.generateError ? `: ${testResult.generateError as string}` : '')}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={test} disabled={testing} className={btnSecondary}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                  Test connection
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Aiva Section ──────────────────────────────────────────────────────────────

const STT_PROVIDERS = [
  { value: 'auto',       label: 'Auto (AI Engine default)' },
  { value: 'genx',       label: 'AI Engine built-in STT' },
  { value: 'openai',     label: 'OpenAI Whisper' },
  { value: 'deepgram',   label: 'Deepgram Nova' },
  { value: 'groq',       label: 'Groq Whisper' },
  { value: 'browser',    label: 'Browser Web Speech API' },
]

const TTS_PROVIDERS = [
  { value: 'auto',       label: 'Auto (AI Engine default)' },
  { value: 'genx',       label: 'AI Engine built-in TTS' },
  { value: 'grok',       label: 'xAI Grok TTS' },
]

const VOICE_MODELS = [
  { value: '',                  label: 'Auto (provider default)' },
  { value: 'aura-2',            label: 'Deepgram Aura 2' },
  { value: 'grok-tts',          label: 'xAI Grok TTS' },
  { value: 'genxlm-voice-v1',   label: 'AI Engine Voice v1' },
  { value: 'tts-1',             label: 'OpenAI TTS-1' },
  { value: 'tts-1-hd',          label: 'OpenAI TTS-1 HD' },
]

interface AivaContextData {
  genxStatus: { available: boolean; error: string | null; modelCount: number }
  missingKeys: string[]
  artifactCount: number
  fallbackUsage: number
  firecrawlStatus: boolean
  storagePersistent: boolean
  emotionPersistence: 'redis' | 'in_memory'
  aivaChatReady: boolean
  aivaVoiceReady: boolean
  lastCapabilityUsed: string | null
  lastArtifact: { id: string; type: string; title: string; createdAt: string } | null
}

function AivaSection({ config, onSaved }: { config: AivaConfig; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [typedEnabled, setTypedEnabled] = useState(config.typedEnabled ?? true)
  const [voiceEnabled, setVoiceEnabled] = useState(config.voiceEnabled ?? false)
  const [sttProvider, setSttProvider] = useState(config.sttProvider || 'auto')
  const [ttsProvider, setTtsProvider] = useState(config.ttsProvider || 'auto')
  const [preferredVoiceModel, setPreferredVoiceModel] = useState(config.preferredVoiceModel || '')
  const [continuousConversation, setContinuousConversation] = useState(config.continuousConversation ?? false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [aivaCtx, setAivaCtx] = useState<AivaContextData | null>(null)
  const [ctxLoading, setCtxLoading] = useState(false)

  useEffect(() => {
    setCtxLoading(true)
    fetch('/api/admin/aiva/context')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAivaCtx(d) })
      .catch(() => {})
      .finally(() => setCtxLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiva: { typedEnabled, voiceEnabled, sttProvider, ttsProvider, preferredVoiceModel, continuousConversation },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        onSaved()
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function testVoice() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-aiva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sttProvider, ttsProvider, preferredVoiceModel }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const voiceStatus = voiceEnabled ? 'Voice enabled' : 'Typed only'
  const badge = typedEnabled || voiceEnabled
    ? { label: voiceStatus, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    : { label: 'Disabled', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Bot className="h-5 w-5 text-blue-400" />}
        title="AmarktAI Assistant"
        badge={badge}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            AmarktAI Assistant — Voice &amp; Intelligence. Configure typed chat mode and voice mode separately. Voice mode requires STT and TTS providers to be configured.
          </p>

          {/* ── Aiva Status Panel ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mb-3">Live Status</p>
            {ctxLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading status…
              </div>
            ) : aivaCtx ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatusRow
                  label="AI Assistant Chat"
                  value={aivaCtx.aivaChatReady ? 'Ready' : 'Unavailable'}
                  ok={aivaCtx.aivaChatReady}
                />
                <StatusRow
                  label="AI Assistant Voice"
                  value={aivaCtx.aivaVoiceReady ? 'Ready' : 'Unavailable'}
                  ok={aivaCtx.aivaVoiceReady}
                />
                <StatusRow
                  label="STT"
                  value={aivaCtx.aivaVoiceReady ? 'GenX (primary)' : 'Browser fallback'}
                  ok={aivaCtx.aivaVoiceReady}
                />
                <StatusRow
                  label="TTS"
                  value={aivaCtx.aivaVoiceReady ? 'GenX (primary)' : 'Not available'}
                  ok={aivaCtx.aivaVoiceReady}
                />
                <StatusRow
                  label="Memory"
                  value="DB-backed"
                  ok={true}
                />
                <StatusRow
                  label="Emotion"
                  value="In-memory only"
                  ok={false}
                  warn={true}
                />
                <StatusRow
                  label="Last capability"
                  value={aivaCtx.lastCapabilityUsed ?? '—'}
                  ok={!!aivaCtx.lastCapabilityUsed}
                />
                <StatusRow
                  label="Fallbacks (24h)"
                  value={String(aivaCtx.fallbackUsage)}
                  ok={aivaCtx.fallbackUsage === 0}
                  warn={aivaCtx.fallbackUsage > 0}
                />
                {aivaCtx.missingKeys.length > 0 && (
                  <div className="col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                    <p className="text-[10px] text-amber-400 mb-1 font-medium">Missing provider keys:</p>
                    <p className="text-[10px] text-amber-300">{aivaCtx.missingKeys.join(', ')}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Status unavailable</p>
            )}
            {/* Avatar helper link */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <a
                href="/admin/dashboard/settings/aiva-avatar"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>🎨</span>
                Generate AmarktAI avatar images →
              </a>
              <p className="text-[10px] text-slate-600 mt-0.5">Create state-aware avatar assets using GenX image generation.</p>
            </div>
          </div>

          {open && (
            <div className="space-y-4">
              {/* Mode toggles */}
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={typedEnabled}
                    onChange={e => setTypedEnabled(e.target.checked)}
                    className="accent-blue-400 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Typed Mode</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Text chat connected to workspace context</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={e => setVoiceEnabled(e.target.checked)}
                    className="accent-blue-400 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Voice Mode</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Orb UI — STT → AI Engine → TTS loop</p>
                  </div>
                </label>
              </div>

              {/* Voice provider config — only shown when voice is enabled */}
              {voiceEnabled && (
                <div className="space-y-3 rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">Voice Provider Config</p>

                  <Field label="STT Provider (Speech-to-Text)">
                    <select value={sttProvider} onChange={e => setSttProvider(e.target.value)} className={inputCls}>
                      {STT_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </Field>

                  <Field label="TTS Provider (Text-to-Speech)">
                    <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value)} className={inputCls}>
                      {TTS_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </Field>

                  <Field label="Preferred Voice Model">
                    <select value={preferredVoiceModel} onChange={e => setPreferredVoiceModel(e.target.value)} className={inputCls}>
                      {VOICE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </Field>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={continuousConversation}
                      onChange={e => setContinuousConversation(e.target.checked)}
                      className="accent-blue-400 h-4 w-4"
                    />
                    <span className="text-xs text-slate-300">Enable continuous conversation by default</span>
                  </label>

                  {testResult && (
                    <TestResultBanner result={testResult} extra={testResult.message as string | undefined} />
                  )}

                  <button onClick={testVoice} disabled={testing} className={btnSecondary}>
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
                    Test STT + TTS
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── GitHub Section ────────────────────────────────────────────────────────────

function GitHubSection({ config, onSaved }: { config: GitHubConfig; onSaved: () => void }) {
  const [open, setOpen] = useState(!config.configured)
  const [token, setToken] = useState('')
  const [defaultOwner, setDefaultOwner] = useState(config.defaultOwner)
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github: { token: token || undefined, defaultOwner } }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        setToken('')
        onSaved()
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token || undefined }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const badge = config.configured && config.username
    ? { label: `@${config.username}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : config.configured
    ? { label: 'Configured', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : { label: 'Not connected', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<FolderGit2 className="h-5 w-5 text-slate-300" />}
        title="GitHub"
        badge={badge}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Personal Access Token (PAT) for repo import, file editing, push, PR creation, and workflow_dispatch deploys. Token must have <code className="text-slate-400">repo</code> and <code className="text-slate-400">workflow</code> scopes.
          </p>

          {config.configured && !open && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              {config.maskedToken && <span className="font-mono bg-white/5 px-2 py-1 rounded">{config.maskedToken}</span>}
              {config.username && <span>@{config.username}</span>}
              {config.lastValidatedAt && (
                <span className="text-slate-600">Validated {new Date(config.lastValidatedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {open && (
            <div className="space-y-3">
              <Field label="Personal Access Token">
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder={config.maskedToken ? `Current: ${config.maskedToken}` : 'ghp_…'}
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config.maskedToken && <p className="text-[10px] text-slate-600 mt-1">Leave blank to keep existing token</p>}
              </Field>

              <Field label="Default Owner (optional)">
                <input
                  type="text"
                  value={defaultOwner}
                  onChange={e => setDefaultOwner(e.target.value)}
                  placeholder="your-github-username"
                  className={inputCls}
                />
              </Field>

              {testResult && (
                <TestResultBanner result={testResult} extra={
                  testResult.success && testResult.username
                    ? `@${testResult.username} · ${testResult.repoCount ?? 0} repos · ${testResult.latencyMs}ms`
                    : undefined
                } />
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={test} disabled={testing} className={btnSecondary}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                  Test token
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}

          {config.configured && (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
              {['Repo import', 'Branch browsing', 'File push', 'PR creation', 'Deploy dispatch'].map(cap => (
                <span key={cap} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">{cap}</span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Storage Section ───────────────────────────────────────────────────────────

function StorageSection({ config, onSaved }: { config: StorageConfig; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [driver, setDriver] = useState(config.driver || 'local_vps')
  const [bucket, setBucket] = useState(config.bucket)
  const [region, setRegion] = useState(config.region)
  const [endpoint, setEndpoint] = useState(config.endpoint)
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [r2PublicUrl, setR2PublicUrl] = useState(config.r2PublicUrl)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage: {
            driver,
            bucket: bucket || undefined,
            region: region || undefined,
            endpoint: endpoint || undefined,
            accessKey: accessKey || undefined,
            secretKey: secretKey || undefined,
            r2PublicUrl: r2PublicUrl || undefined,
          },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        setSecretKey('')
        onSaved()
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver, bucket, region, endpoint, accessKey, secretKey, r2PublicUrl }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const isCloud = driver === 's3' || driver === 'r2'
  const badge = driver === 'local_vps'
    ? { label: 'VPS Local (persistent)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : driver === 'local'
    ? { label: 'Local (ephemeral)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    : config.configured
    ? { label: `${driver.toUpperCase()} · configured`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : { label: `${driver.toUpperCase()} · not configured`, color: 'text-red-400 bg-red-500/10 border-red-500/20' }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<HardDrive className="h-5 w-5 text-slate-400" />}
        title="Artifact Storage"
        badge={badge}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Where generated artifacts (images, audio, video, code) are stored. VPS local storage persists across redeployments. Use S3 or R2 for external cloud storage.
          </p>

          {open && (
            <div className="space-y-3">
              <Field label="Storage Driver">
                <select
                  value={driver}
                  onChange={e => setDriver(e.target.value)}
                  className={inputCls}
                >
                  <option value="local_vps">VPS Local Storage (persistent, recommended)</option>
                  <option value="local">Local filesystem (ephemeral)</option>
                  <option value="s3">Amazon S3 / S3-compatible</option>
                  <option value="r2">Cloudflare R2</option>
                </select>
              </Field>

              {driver === 'local_vps' && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
                  VPS local storage uses <code className="font-mono">/var/www/amarktai/storage</code>. Data persists across redeployments.
                </div>
              )}

              {driver === 'local' && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  Local storage is ephemeral — artifacts will be lost on redeploy. Use VPS local or cloud storage for persistence.
                </div>
              )}

              {isCloud && (
                <>
                  <Field label="Bucket">
                    <input type="text" value={bucket} onChange={e => setBucket(e.target.value)} placeholder="my-artifacts-bucket" className={inputCls} />
                  </Field>
                  {driver === 's3' && (
                    <>
                      <Field label="Region">
                        <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="us-east-1" className={inputCls} />
                      </Field>
                      <Field label="Endpoint (optional — for S3-compatible stores)">
                        <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://minio.example.com" className={inputCls} />
                      </Field>
                    </>
                  )}
                  {driver === 'r2' && (
                    <Field label="R2 Public URL">
                      <input type="text" value={r2PublicUrl} onChange={e => setR2PublicUrl(e.target.value)} placeholder="https://pub-xxx.r2.dev" className={inputCls} />
                    </Field>
                  )}
                  <Field label="Access Key ID">
                    <input type="text" value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder={config.accessKey || 'AKIA…'} className={inputCls} />
                  </Field>
                  <Field label="Secret Access Key">
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={secretKey}
                        onChange={e => setSecretKey(e.target.value)}
                        placeholder="Leave blank to keep existing secret"
                        className={`${inputCls} pr-10`}
                      />
                      <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </>
              )}

              {testResult && (
                <TestResultBanner result={testResult} extra={
                  testResult.success
                    ? `${(testResult.driver as string ?? '').toUpperCase()} · ${testResult.bucket ?? ''} · ${testResult.latencyMs ?? 0}ms`
                    : (testResult.warning as string | undefined)
                } />
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={test} disabled={testing} className={btnSecondary}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                  Test storage
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Adult Mode Section ────────────────────────────────────────────────────────

const ADULT_PROVIDER_TYPES = [
  { value: 'xai',         label: 'xAI / Grok Imagine (uses vault key)' },
  { value: 'together',    label: 'Together AI (uses vault key)' },
  { value: 'huggingface', label: 'HuggingFace Private Endpoint' },
  { value: 'custom',      label: 'Custom (OpenAI-compatible)' },
]

const ADULT_MODES = [
  { value: 'off',         label: 'Off (default)' },
  { value: 'suggestive',  label: 'Suggestive' },
  { value: 'adult_text',  label: 'Adult Text' },
  { value: 'adult_image', label: 'Adult Image' },
  { value: 'adult_video', label: 'Adult Video' },
  { value: 'adult_voice', label: 'Adult Voice' },
  { value: 'full_adult_app_mode',  label: 'Full Adult App Mode' },
]

const ADULT_BLOCKED = [
  'Minors or age-ambiguous subjects',
  'Visible genitals (unless full adult mode with provider verified)',
  'Explicit sex acts without full adult mode',
  'Sexual violence / non-consensual',
  'Real-person sexual deepfakes',
  'Self-harm content',
  'Illegal content',
]

function AdultSection({ config, onSaved }: { config: AdultConfig; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(config.mode || 'off')
  const [providerType, setProviderType] = useState(config.providerType || 'together')
  const [specialistEndpoint, setSpecialistEndpoint] = useState(config.specialistEndpoint)
  const [providerModel, setProviderModel] = useState(config.providerModel || '')
  const [testPrompt, setTestPrompt] = useState('a tasteful topless portrait, artistic lighting')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adult: {
            mode,
            providerType: mode !== 'off' ? providerType : undefined,
            specialistEndpoint: specialistEndpoint || undefined,
            providerModel: providerModel || undefined,
          },
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        onSaved()
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-adult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          providerType,
          endpoint: specialistEndpoint,
          model: providerModel || undefined,
          testPrompt: testPrompt || undefined,
        }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const readyState: 'ready' | 'blocked' | 'unavailable' = (() => {
    if (mode === 'off') return 'unavailable'
    if (!testResult) return 'blocked'
    if ('success' in testResult && testResult.success) return 'ready'
    return 'blocked'
  })()

  const badge = mode === 'off'
    ? { label: 'Off', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
    : readyState === 'ready'
    ? { label: '✓ READY', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    : { label: '⚠ BLOCKED', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<ShieldCheck className="h-5 w-5 text-violet-400" />}
        title="Adult Access (App-level)"
        badge={badge}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Adult content is controlled per-app level. No separate adult key — the approved provider stack (xAI/Grok, Together AI, Hugging Face) is used.
            All adult modes require explicit admin approval, age gate enforcement, and audit logging.
          </p>

          {open && (
            <div className="space-y-3">
              {/* Blocked categories */}
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-1.5">Always Blocked — no exceptions</p>
                {ADULT_BLOCKED.map(item => (
                  <p key={item} className="text-xs text-red-300 flex items-start gap-1.5"><span className="mt-px">✗</span>{item}</p>
                ))}
              </div>

              <Field label="Adult access mode (app-level)">
                <select value={mode} onChange={e => setMode(e.target.value)} className={inputCls}>
                  {ADULT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <p className="text-[10px] text-slate-600 mt-1">
                  Off = no adult content. Suggestive = tasteful suggestive only. Adult text/image/video/voice = capability-specific.
                  Full adult app mode = all adult capabilities enabled for the app with all gates active.
                </p>
              </Field>

              {mode !== 'off' && (
                <>
                  {/* Approval/gate requirements */}
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Required gates</p>
                    {[
                      'Approval required — admin must explicitly approve before content is served',
                      'Audit required — all adult requests are logged with provider, model, and prompt hash',
                      'Age gate required — app must implement age verification',
                    ].map(req => (
                      <p key={req} className="text-xs text-violet-300 flex items-start gap-1.5"><span className="mt-px">✓</span>{req}</p>
                    ))}
                  </div>

                  <Field label="Provider route (no separate key needed)">
                    <select value={providerType} onChange={e => setProviderType(e.target.value)} className={inputCls}>
                      {ADULT_PROVIDER_TYPES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    {(providerType === 'xai' || providerType === 'together') && (
                      <p className="text-[10px] text-blue-400 mt-1">Uses existing {providerType === 'xai' ? 'xAI/Grok' : 'Together AI'} vault key from AI Providers — no separate adult key required.</p>
                    )}
                  </Field>

                  {(providerType === 'huggingface' || providerType === 'custom') && (
                    <Field label="Provider Endpoint URL">
                      <input
                        type="url"
                        value={specialistEndpoint}
                        onChange={e => setSpecialistEndpoint(e.target.value)}
                        placeholder="https://your-endpoint.huggingface.cloud/generate"
                        className={inputCls}
                      />
                    </Field>
                  )}

                  <Field label="Model ID (optional override)">
                    <input
                      type="text"
                      value={providerModel}
                      onChange={e => setProviderModel(e.target.value)}
                      placeholder={
                        providerType === 'together' ? 'e.g. black-forest-labs/FLUX.1-schnell-Free' :
                        providerType === 'xai' ? 'e.g. grok-2-image' : 'model-id'
                      }
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Test Prompt">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={e => setTestPrompt(e.target.value)}
                      placeholder="a tasteful topless portrait, artistic lighting"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Used only during connection test — not saved</p>
                  </Field>

                  {testResult && (
                    <TestResultBanner result={testResult} extra={testResult.message as string | undefined} />
                  )}

                  {config.lastTestStatus && (
                    <p className="text-[10px] text-slate-500">Last test: {config.lastTestStatus}</p>
                  )}
                </>
              )}

              {mode === 'off' && (
                <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-3">
                  <p className="text-xs font-semibold text-slate-400">Off — Adult content disabled</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Select an adult access mode and run a provider test to enable adult content for an app.</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button
                  onClick={test}
                  disabled={testing || mode === 'off'}
                  className={`${btnSecondary} ${readyState === 'ready' ? 'border-emerald-500/30 text-emerald-400' : ''}`}
                >
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                  {readyState === 'ready' ? 'Re-test provider' : 'Test provider (required)'}
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}
// ── Service Integrations Section ──────────────────────────────────────────────

function ServiceIntegrationsSection({ data, onSaved }: { data: IntegrationsData; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [keys, setKeys] = useState({ firecrawl: '' })
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Record<string, string>>({})

  function setMsg(service: string, msg: string) {
    setMsgs(prev => ({ ...prev, [service]: msg }))
    setTimeout(() => setMsgs(prev => { const n = { ...prev }; delete n[service]; return n }), 3000)
  }

  async function save(service: string, payload: Record<string, unknown>) {
    setSaving(service)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [service]: payload }),
      })
      if (!res.ok) {
        const d = await res.json()
        setMsg(service, `Error: ${d.error ?? 'Save failed'}`)
      } else {
        setMsg(service, 'Saved')
        setKeys(prev => ({ ...prev, [service]: '' }))
        onSaved()
      }
    } finally {
      setSaving(null)
    }
  }

  const configured = (svc?: { configured: boolean }) => svc?.configured ?? false

  const badge = [
    configured(data.firecrawl) && 'Firecrawl',
  ].filter(Boolean)

  const badgeColor = badge.length > 0
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
  const badgeLabel = badge.length > 0 ? `${badge.join(' · ')} configured` : 'not configured'

  function keyField(
    label: string,
    svcKey: string,
    stateKey: keyof typeof keys,
    placeholder: string,
    isConfigured: boolean,
    onSave: () => void,
  ) {
    return (
      <div className="space-y-2 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-300">{label}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isConfigured ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>
            {isConfigured ? 'configured' : 'not set'}
          </span>
        </div>
        <div className="relative">
          <input
            type={showKey[svcKey] ? 'text' : 'password'}
            autoComplete="new-password"
            value={keys[stateKey]}
            onChange={e => setKeys(prev => ({ ...prev, [stateKey]: e.target.value }))}
            placeholder={placeholder}
            className={inputCls + ' pr-10'}
          />
          <button type="button" onClick={() => setShowKey(prev => ({ ...prev, [svcKey]: !prev[svcKey] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showKey[svcKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSave} disabled={saving === svcKey || !keys[stateKey]} className={btnPrimary}>
            {saving === svcKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
          {msgs[svcKey] && (
            <span className={`text-xs ${msgs[svcKey].startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{msgs[svcKey]}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Key className="h-5 w-5 text-violet-400" />}
        title="Service Integrations"
        badge={{ label: badgeLabel, color: badgeColor }}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Third-party service keys for web crawling and document extraction. All keys are encrypted in the vault.
          </p>

          {open && (
            <div className="space-y-1">
              {/* Firecrawl */}
              {keyField(
                'Firecrawl — Web crawling & document extraction',
                'firecrawl', 'firecrawl',
                'fc-…',
                configured(data.firecrawl),
                () => save('firecrawl', { apiKey: keys.firecrawl }),
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Webdock Section ───────────────────────────────────────────────────────────

function WebdockSection() {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/settings/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webdock: { apiKey: apiKey || undefined } }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSaveMsg(`Error: ${d.error ?? 'Save failed'}`)
      } else {
        setSaveMsg('Saved')
        setApiKey('')
        setTimeout(() => setSaveMsg(null), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/settings/test-webdock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || undefined }),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Server className="h-5 w-5 text-blue-400" />}
        title="Webdock"
        badge={{ label: 'VPS provider', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Webdock API key for server management. Used to list and manage VPS servers from the AmarktAI console.
          </p>

          {open && (
            <div className="space-y-3">
              <Field label="API Key">
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="wdck_…"
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {testResult && (
                <div className={`rounded-xl border p-3 text-xs space-y-1 ${
                  testResult.success
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                    : 'border-red-500/20 bg-red-500/5 text-red-400'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success
                      ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span>
                      {testResult.success
                        ? `Connected · ${testResult.serverCount} server${Number(testResult.serverCount) !== 1 ? 's' : ''} · ${testResult.latencyMs ?? 0}ms`
                        : (testResult.error as string | undefined) ?? 'Test failed'}
                    </span>
                  </div>
                  {!testResult.success && typeof testResult.blocker === 'string' && testResult.blocker && (
                    <p className="text-[10px] text-amber-400 pl-6">{testResult.blocker}</p>
                  )}
                  {!testResult.success && typeof testResult.nextAction === 'string' && testResult.nextAction && (
                    <p className="text-[10px] text-slate-400 pl-6">Next: {testResult.nextAction}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving} className={btnPrimary}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={test} disabled={testing} className={btnSecondary}>
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                  Test connection
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── HF Task Routing Section ───────────────────────────────────────────────────

/** Hugging Face task-based routing — auto task routing with optional pinned model per task. */
const HF_TASKS = [
  { task: 'text-generation',      label: 'Text Generation (chat/completion)',  defaultModel: '' },
  { task: 'text-classification',  label: 'Text Classification',                defaultModel: '' },
  { task: 'token-classification', label: 'Token Classification (NER)',          defaultModel: '' },
  { task: 'summarization',        label: 'Summarization',                       defaultModel: '' },
  { task: 'translation',          label: 'Translation',                         defaultModel: '' },
  { task: 'question-answering',   label: 'Question Answering',                  defaultModel: '' },
  { task: 'image-classification', label: 'Image Classification',                defaultModel: '' },
  { task: 'image-to-text',        label: 'Image-to-Text (captioning)',           defaultModel: '' },
  { task: 'text-to-image',        label: 'Text-to-Image (generation)',           defaultModel: '' },
  { task: 'text-to-speech',       label: 'Text-to-Speech (TTS)',                 defaultModel: '' },
  { task: 'automatic-speech-recognition', label: 'Speech Recognition (STT)',    defaultModel: '' },
  { task: 'embedding',            label: 'Embedding / Feature Extraction',       defaultModel: '' },
  { task: 'sentiment-analysis',   label: 'Sentiment / Emotion Analysis',         defaultModel: '' },
]

function HFTaskRoutingSection() {
  const [open, setOpen] = useState(false)
  const [pinnedModels, setPinnedModels] = useState<Record<string, string>>({})

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Cpu className="h-5 w-5 text-slate-400" />}
        title="Hugging Face — Task Routing"
        badge={{ label: 'Ready to wire', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Hugging Face routing uses automatic task routing by default — no model selection required for basic usage.
            Pin a specific model per task only when you need a non-default model. Leave blank to use the HF Inference API default for that task.
          </p>
          {open && (
            <div className="space-y-2">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-300">
                Auto task routing is the default. Provider key is set in the AI Providers section above.
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Pinned model per task (optional override)</p>
              {HF_TASKS.map(({ task, label }) => (
                <div key={task} className="flex items-center gap-3">
                  <span className="min-w-[200px] text-xs text-slate-400">{label}</span>
                  <input
                    type="text"
                    value={pinnedModels[task] ?? ''}
                    onChange={(e) => setPinnedModels((prev) => ({ ...prev, [task]: e.target.value }))}
                    placeholder="Auto (leave blank)"
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>
              ))}
              <p className="text-[11px] text-slate-600 pt-2">
                Pinned models are applied per-request. Provider/model overrides are only needed when the HF default for a task is not suitable.
                Backend persistence is Ready to wire — values are not yet saved to the vault.
              </p>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Aiva Voice Settings Section ───────────────────────────────────────────────

const VOICE_PROVIDERS_OPTS = [
  { value: 'auto',       label: 'Auto (Groq → Gemini → Hugging Face)' },
  { value: 'groq',       label: 'Groq TTS' },
  { value: 'gemini',     label: 'Gemini TTS' },
  { value: 'huggingface',label: 'Hugging Face TTS' },
]

const VOICE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (AU)' },
  { value: 'zh-CN', label: 'Chinese (Mandarin)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
]

function AivaVoiceSection() {
  const [open, setOpen] = useState(false)
  const [voiceProvider, setVoiceProvider] = useState('auto')
  const [voiceModel, setVoiceModel] = useState('')
  const [voicePersona, setVoicePersona] = useState('aiva-default')
  const [voiceId, setVoiceId] = useState('')
  const [tone, setTone] = useState('neutral')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [language, setLanguage] = useState('en-US')
  const [appDefault, setAppDefault] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    // Backend persistence is Ready to wire — show message
    setSaveMsg('Settings saved locally. Backend persistence: Ready to wire.')
    setTimeout(() => setSaveMsg(null), 4000)
  }

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Mic className="h-5 w-5 text-slate-400" />}
        title="AI Assistant Voice Settings"
        badge={{ label: 'Ready to wire', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' }}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Configure AmarktAI Assistant&apos;s default voice persona, provider, and characteristics. Status: <span className="text-cyan-400">Ready to wire</span> — backend persistence not yet wired.
          </p>

          {open && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Voice Provider">
                  <select value={voiceProvider} onChange={e => setVoiceProvider(e.target.value)} className={inputCls}>
                    {VOICE_PROVIDERS_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>

                <Field label="Voice Model / ID">
                  <input
                    type="text"
                    value={voiceModel}
                    onChange={e => setVoiceModel(e.target.value)}
                    placeholder="e.g. groq-tts-v1 or gemini-voice-model"
                    className={inputCls}
                  />
                </Field>

                <Field label="Voice Persona">
                  <input
                    type="text"
                    value={voicePersona}
                    onChange={e => setVoicePersona(e.target.value)}
                    placeholder="aiva-default"
                    className={inputCls}
                  />
                </Field>

                <Field label="Voice ID (provider-specific)">
                  <input
                    type="text"
                    value={voiceId}
                    onChange={e => setVoiceId(e.target.value)}
                    placeholder="Provider voice ID (e.g. Groq or Gemini voice ID)"
                    className={inputCls}
                  />
                </Field>

                <Field label="Tone / Emotion">
                  <select value={tone} onChange={e => setTone(e.target.value)} className={inputCls}>
                    <option value="neutral">Neutral</option>
                    <option value="warm">Warm</option>
                    <option value="professional">Professional</option>
                    <option value="energetic">Energetic</option>
                    <option value="calm">Calm</option>
                    <option value="serious">Serious</option>
                    <option value="playful">Playful</option>
                  </select>
                </Field>

                <Field label="Language / Accent">
                  <select value={language} onChange={e => setLanguage(e.target.value)} className={inputCls}>
                    {VOICE_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={`Speed (${speed.toFixed(1)}x)`}>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={speed}
                    onChange={e => setSpeed(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </Field>

                <Field label={`Pitch (${pitch >= 0 ? `+${pitch}` : pitch} semitones)`}>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    step={1}
                    value={pitch}
                    onChange={e => setPitch(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </Field>
              </div>

              <Field label="App Default Voice (slug)">
                <input
                  type="text"
                  value={appDefault}
                  onChange={e => setAppDefault(e.target.value)}
                  placeholder="App slug — leave blank for global default"
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-slate-600">Override the voice per app. Blank = use global AmarktAI Assistant voice.</p>
              </Field>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-400">
                <p className="text-cyan-400 font-semibold mb-1">Preview Voice — Ready to wire</p>
                <p>Voice preview requires a configured provider key and working TTS endpoint. Configure the provider in AI Providers above, then preview will be available from Media Studio → Voice.</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={save} className={btnPrimary}>
                  <Save className="h-3 w-3" /> Save voice settings
                </button>
                {saveMsg && <span className="text-xs text-cyan-400">{saveMsg}</span>}
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

// ── Providers Section ─────────────────────────────────────────────────────────

/** Approved AI provider stack — only these providers are configurable in Settings. */
const PROVIDER_DEFS_PRIMARY = [
  { key: 'qwen',        label: 'Qwen / DashScope',  placeholder: 'sk-…',       caps: ['chat', 'reasoning', 'images', 'video', 'stt'], hint: 'Env: QWEN_API_KEY or DASHSCOPE_API_KEY' },
  { key: 'minimax',     label: 'MiniMax / Mimo',    placeholder: 'sk-…',       caps: ['chat', 'reasoning', 'images', 'video', 'tts', 'stt'], hint: 'Env: MINIMAX_API_KEY or MIMO_API_KEY' },
  { key: 'gemini',      label: 'Google Gemini',     placeholder: 'AIza…',      caps: ['chat', 'reasoning', 'vision', 'research'] },
  { key: 'huggingface', label: 'Hugging Face',      placeholder: 'hf_…',       caps: ['chat', 'images', 'tts', 'adult_image'], hint: 'Env: HUGGINGFACE_API_KEY, HUGGINGFACEHUB_API_TOKEN, or HF_TOKEN' },
  { key: 'groq',        label: 'Groq',              placeholder: 'gsk_…',      caps: ['chat', 'code', 'stt'] },
  { key: 'together',    label: 'Together AI',       placeholder: 'tg_…',       caps: ['chat', 'code', 'images', 'adult_image'] },
  { key: 'xai',         label: 'xAI / Grok',        placeholder: 'xai-…',      caps: ['chat', 'reasoning', 'vision', 'adult_image'], hint: 'Env: XAI_API_KEY or GROK_API_KEY' },
]

/**
 * Set of approved provider keys for count purposes — only these count as "configured"
 * in the Settings badge. Legacy/env keys for providers not in this list are not counted.
 */
const APPROVED_PROVIDER_KEYS = new Set(PROVIDER_DEFS_PRIMARY.map(d => d.key))

function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/providers')
      if (res.ok) setProviders(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  const configured = providers.filter(p =>
    APPROVED_PROVIDER_KEYS.has(p.providerKey) && (p.maskedPreview || p.enabled)
  ).length

  return (
    <motion.div variants={fadeUp}>
      <SectionCard
        icon={<Key className="h-5 w-5 text-slate-400" />}
        title="AI Providers"
        badge={{ label: configured > 0 ? `${configured} configured` : 'None configured', color: configured > 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20' }}
        open={open}
        onToggle={() => setOpen(v => !v)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Approved AI provider keys. Each key is stored encrypted in the vault and never returned in plaintext. xAI/Grok and Together AI keys are also used by Adult Creative Mode.
          </p>

          {open && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading providers…
                </div>
              ) : (
                <>
                  {PROVIDER_DEFS_PRIMARY.map(def => {
                    const record = providers.find(p => p.providerKey === def.key)
                    return (
                      <ProviderForm
                        key={def.key}
                        providerKey={def.key}
                        label={def.label}
                        placeholder={def.placeholder}
                        capabilities={def.caps}
                        hint={def.hint || undefined}
                        record={record ?? null}
                        onSaved={load}
                      />
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  )
}

function ProviderForm({
  providerKey, label, placeholder, capabilities, hint, record, onSaved,
}: {
  providerKey: string
  label: string
  placeholder: string
  capabilities: string[]
  hint?: string
  record: ProviderRecord | null
  onSaved: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function save() {
    if (!apiKey.trim()) { setSaveMsg('Enter an API key'); return }
    setSaving(true)
    setSaveMsg(null)
    try {
      // Create or update via providers API
      if (record) {
        const res = await fetch(`/api/admin/providers/${record.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        })
        if (!res.ok) { const d = await res.json(); setSaveMsg(`Error: ${d.error ?? 'Save failed'}`); return }
      } else {
        const res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerKey, displayName: label, apiKey, enabled: true }),
        })
        if (!res.ok) { const d = await res.json(); setSaveMsg(`Error: ${d.error ?? 'Save failed'}`); return }
      }
      setSaveMsg('Saved')
      setApiKey('')
      onSaved()
      setTimeout(() => setSaveMsg(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    setTesting(true)
    setTestResult(null)
    try {
      const id = record?.id
      if (!id && !apiKey) { setTestResult({ success: false, error: 'Enter an API key to test' }); return }
      const body = id
        ? (apiKey ? { apiKey } : {})
        : { providerKey, apiKey }
      const url = id ? `/api/admin/providers/${id}/health-check` : '/api/admin/providers/health-check-all'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setTestResult(await res.json())
    } finally {
      setTesting(false)
    }
  }

  const isConfigured = !!(record?.maskedPreview)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {capabilities.map(c => (
              <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">{c}</span>
            ))}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${isConfigured ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>
          {isConfigured ? `Configured · ${record?.maskedPreview}` : 'Not set'}
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="new-password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={isConfigured ? 'Leave blank to keep existing key' : placeholder}
            className={`${inputCls} pr-10 text-xs`}
          />
          <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
        <button onClick={save} disabled={saving} className={btnPrimary}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
        <button onClick={test} disabled={testing} className={btnSecondary}>
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
          Test
        </button>
      </div>

      {saveMsg && (
        <p className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{saveMsg}</p>
      )}

      {testResult && (
        <TestResultBanner result={testResult} extra={testResult.latencyMs != null ? `${testResult.latencyMs}ms` : undefined} />
      )}
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, badge, open, onToggle, children,
}: {
  icon: React.ReactNode
  title: string
  badge?: { label: string; color: string }
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-5 text-left hover:bg-white/[0.01] transition-colors"
      >
        {icon}
        <h2 className="text-base font-semibold text-white flex-1">{title}</h2>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
        )}
        {open
          ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06] pt-4">
          {children}
        </div>
      )}
      {!open && (
        <div className="px-5 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  )
}

function StatusRow({
  label,
  value,
  ok,
  warn,
}: {
  label: string
  value: string
  ok: boolean
  warn?: boolean
}) {
  // Precedence: ok (green) > warn (amber) > error (red)
  const color = ok ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-[10px] font-medium ${color}`}>{value}</span>
    </div>
  )
}

function TestResultBanner({ result, extra }: { result: TestResult; extra?: string }) {
  return (
    <div className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${
      result.success
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
        : 'border-red-500/20 bg-red-500/5 text-red-400'
    }`}>
      {result.success
        ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
        : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
      <div>
        <span>{result.success ? 'Connected' : (result.error as string | undefined) ?? 'Failed'}</span>
        {extra && <span className="ml-2 text-inherit opacity-70">{extra}</span>}
      </div>
    </div>
  )
}

// ── Style constants ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 font-mono'

const btnPrimary =
  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/25 transition-colors disabled:opacity-50'

const btnSecondary =
  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-400 border border-white/10 bg-white/5 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50'



