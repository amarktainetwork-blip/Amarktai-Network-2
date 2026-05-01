'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Cpu, RefreshCw, CheckCircle, AlertCircle, AlertTriangle,
  MessageSquare, Image, Video, Mic, Music, Database, Sparkles,
  ShieldCheck, Zap, BookOpen,
} from 'lucide-react'

type TabId = 'genx' | 'providers' | 'models' | 'routing' | 'budgets' | 'capabilities' | 'learning'

const TABS: { id: TabId; label: string }[] = [
  { id: 'genx',         label: 'GenX'         },
  { id: 'providers',    label: 'Providers'    },
  { id: 'models',       label: 'Models'       },
  { id: 'routing',      label: 'Routing'      },
  { id: 'budgets',      label: 'Budgets'      },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'learning',     label: 'Learning'     },
]

interface GenxStatus {
  configured: boolean
  available: boolean
  error: string | null
  apiUrl: string | null
  modelCount: number
  adultCapability?: { supported: boolean; route: string | null; reason: string | null }
}

// ── Runtime truth types (mirrors runtime-capability-truth.ts exports) ─────────

interface RuntimeProviderEntry {
  key: string
  displayName: string
  reason: string
  configured: boolean
  coveredByGenX: boolean
  keySource: 'vault' | 'env' | 'missing'
  status: 'configured_wired' | 'configured_not_wired' | 'not_configured_optional' | 'covered_by_genx' | 'blocked'
}

interface RuntimeCapabilityEntry {
  name: string
  status: 'available' | 'blocked' | 'not_implemented'
  blocker: string | null
  models: string[]
  nextAction: string | null
}

interface RuntimeTruth {
  success: boolean
  genx: {
    configured: boolean
    available: boolean
    keySource: 'vault' | 'env' | 'missing'
    modelCount: number
    capabilities: string[]
    apiUrl: string | null
  }
  providers: RuntimeProviderEntry[]
  capabilities: RuntimeCapabilityEntry[]
  blockers: string[]
}

interface ModelEntry {
  id: string
  displayName: string
  provider: string
  role: string
  capabilities: string[]
  enabled: boolean
  contextWindow?: number
  latencyTier?: string
  costTier?: string
  category?: string
}

interface BudgetData {
  globalDailyBudgetCents?: number
  globalMonthlyBudgetCents?: number
  warningThresholdPct?: number
  hardStopThresholdPct?: number
  premiumConfirmationRequired?: boolean
  defaultCheapMode?: boolean
  spentTodayCents?: number
  spentMonthCents?: number
}

interface LearningData {
  globalInsights?: unknown[]
  providerPerformance?: unknown[]
  frameworkStatus?: string
  uiWired?: boolean
  error?: string
}

// GenX catalogue grouped by capability
const GENX_CATALOGUE: Array<{ group: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; models: string[] }> = [
  { group: 'Text / Reasoning / Coding', icon: MessageSquare, models: ['GPT-4o, GPT-4.1, o3 (via GenX)', 'Claude Opus 4, Sonnet 3.7 (via GenX)', 'Gemini 2.5 Pro/Flash (via GenX)', 'Grok 3 (via GenX)', 'DeepSeek R1/V3 (via GenX)'] },
  { group: 'Image Generation',          icon: Image,         models: ['Recraft v3 (via GenX)', 'DALL-E 3 (via GenX)', 'Grok Imagine (via GenX)', 'Flux models (via GenX)'] },
  { group: 'Video Generation',          icon: Video,         models: ['Veo 2 (via GenX)', 'Kling (via GenX)', 'Seedance (via GenX)', 'PixVerse (via GenX)', 'Grok Video (via GenX)'] },
  { group: 'Avatar / Video',            icon: Sparkles,      models: ['HeyGen avatars (via GenX)', 'D-ID avatars (via GenX)'] },
  { group: 'Voice / TTS',               icon: Mic,           models: ['Grok TTS (via GenX)', 'Aura 2 / Deepgram (via GenX)', 'GenX LM Voice v1', 'OpenAI TTS-1 (via GenX)'] },
  { group: 'STT / Transcription',       icon: Mic,           models: ['GenX transcription', 'Whisper (via GenX)', 'Deepgram Nova (via GenX)'] },
  { group: 'Translation',               icon: BookOpen,      models: ['GenX Pro translation', 'GPT-4 translate (via GenX)'] },
  { group: 'Music / Audio',             icon: Music,         models: ['Lyria (Google via GenX)', 'GenX audio models'] },
  { group: 'Multimodal',                icon: Sparkles,      models: ['Gemini 2.5 Flash multimodal (via GenX)', 'GPT-4o vision (via GenX)'] },
  { group: 'Embeddings / Reranking',    icon: Database,      models: ['GenX embeddings', 'text-embedding-3 (via GenX)'] },
  { group: 'Moderation / Safety',       icon: ShieldCheck,   models: ['GenX moderation', 'OpenAI moderation (via GenX)'] },
]

// Providers NOT requiring direct keys (covered by GenX)
const COVERED_BY_GENX = ['OpenAI', 'Anthropic', 'Google / Gemini / Veo / Lyria', 'xAI / Grok', 'Recraft', 'Kling', 'Seedance', 'PixVerse', 'Deepgram Aura', 'GenX Pro', 'GenX Voice']

// Optional fallback providers (need direct keys only when GenX is insufficient)
const FALLBACK_PROVIDERS: Array<{ name: string; reason: string; wired: boolean }> = [
  { name: 'Hugging Face',            reason: 'Free / open-source models', wired: false },
  { name: 'Together AI',             reason: 'Cheaper route for open models', wired: false },
  { name: 'DeepSeek',                reason: 'Cheap specialist coding / reasoning', wired: false },
  { name: 'Kimi / Moonshot',         reason: 'Cheap, multilingual', wired: false },
  { name: 'Qwen / Alibaba',          reason: 'Cheap, multilingual, open-source versions', wired: false },
  { name: 'Xiaomi MiMo',             reason: 'Specialist reasoning fallback', wired: false },
  { name: 'NVIDIA / Nemotron',       reason: 'High-performance open models', wired: false },
  { name: 'Mistral / local',         reason: 'Open-source, self-host, privacy', wired: false },
  { name: 'Llama / Meta (local)',    reason: 'Open-source, free, self-host', wired: false },
  { name: 'Replicate',               reason: 'Image / video / audio fallback', wired: false },
  { name: 'RunPod / Modal',          reason: 'Self-host / adult route not on GenX', wired: false },
  { name: 'ElevenLabs',              reason: 'Specialist TTS fallback', wired: false },
  { name: 'Resemble',                reason: 'Voice cloning fallback', wired: false },
  { name: 'Suno',                    reason: 'Music generation fallback', wired: false },
  { name: 'Udio',                    reason: 'Music generation fallback', wired: false },
  { name: 'Pika',                    reason: 'Video generation fallback', wired: false },
  { name: 'Runway',                  reason: 'Video generation fallback', wired: false },
  { name: 'Luma',                    reason: 'Video / 3D fallback', wired: false },
  { name: 'Firecrawl',               reason: 'Web crawler / research', wired: false },
  { name: 'Crawl4AI / local',        reason: 'Self-host crawler fallback', wired: false },
  { name: 'Skrape.ai',               reason: 'Scraping / crawler fallback', wired: false },
]

const MODEL_TIERS: Array<{ tier: string; color: string; models: string[] }> = [
  { tier: 'FREE',       color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',  models: ['Llama 3.3 70B (HuggingFace)', 'Mistral 7B (local)', 'Phi-3 mini (local)', 'SDXL (HuggingFace)'] },
  { tier: 'CHEAP',      color: 'text-teal-400 border-teal-500/20 bg-teal-500/5',           models: ['DeepSeek V3 Flash', 'Kimi k2', 'Qwen 2.5 72B', 'Gemini 2.0 Flash', 'Mistral Nemo (Together)'] },
  { tier: 'BALANCED',   color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',           models: ['Gemini 2.5 Flash', 'GPT-4o mini', 'Claude Haiku 3.5', 'Grok 2 fast', 'Llama 3.1 405B (Together)'] },
  { tier: 'PREMIUM',    color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',        models: ['GPT-4.1 / o3', 'Claude Opus 4 / Sonnet 3.7', 'Gemini 2.5 Pro', 'Grok 3', 'Veo 2, Kling (video)'] },
  { tier: 'SPECIALIST', color: 'text-violet-400 border-violet-500/20 bg-violet-500/5',     models: ['Grok TTS / Aura 2 (voice)', 'Whisper v3 (STT)', 'Recraft v3 (image)', 'Lyria (music)', 'text-embedding-3 (embeddings)'] },
]

const ROUTING_TABLE: Array<{ capability: string; primary: string; fallback1: string; fallback2: string }> = [
  { capability: 'coding_agent',          primary: 'GenX (GPT-4.1 / Claude Sonnet)', fallback1: 'DeepSeek V3',        fallback2: 'GPT-4o (direct, advanced)' },
  { capability: 'code_review',           primary: 'GenX (Claude Sonnet)',            fallback1: 'Gemini Flash',       fallback2: 'GPT-4o mini' },
  { capability: 'image_generation',      primary: 'GenX (Recraft / DALL-E 3)',       fallback1: 'Replicate',          fallback2: 'HuggingFace SDXL' },
  { capability: 'video_generation',      primary: 'GenX (Veo 2 / Kling)',            fallback1: 'Pika / Runway',      fallback2: 'Luma (listed, not wired)' },
  { capability: 'voice_tts',             primary: 'GenX (Aura 2 / Grok TTS)',        fallback1: 'ElevenLabs',         fallback2: 'OpenAI TTS (direct, advanced)' },
  { capability: 'transcription',         primary: 'GenX (Whisper / Deepgram Nova)',  fallback1: 'Deepgram direct',    fallback2: 'Whisper local' },
  { capability: 'music_generation',      primary: 'GenX (Lyria)',                    fallback1: 'Suno',               fallback2: 'Udio (listed, not wired)' },
  { capability: 'research',              primary: 'GenX (Gemini / GPT-4.1)',         fallback1: 'DeepSeek R1',        fallback2: 'Firecrawl + summarize' },
  { capability: 'adult_image_gen',       primary: 'RunPod/local (not GenX)',         fallback1: 'HuggingFace SDXL',   fallback2: 'Replicate' },
]

const CAPABILITIES_TABLE: Array<{ cap: string; genxModel: string; fallback: string; status: string; blocker: string }> = [
  { cap: 'Text / Chat',         genxModel: 'GPT-4o, Claude, Gemini',  fallback: 'DeepSeek, Qwen',     status: 'Ready',       blocker: '' },
  { cap: 'Coding Agent',        genxModel: 'GPT-4.1, Claude Sonnet',  fallback: 'DeepSeek V3',        status: 'Ready',       blocker: '' },
  { cap: 'Image Generation',    genxModel: 'Recraft v3, DALL-E 3',    fallback: 'Replicate, HF SDXL', status: 'Ready',       blocker: 'Needs GenX key' },
  { cap: 'Video Generation',    genxModel: 'Veo 2, Kling, Seedance',  fallback: 'Pika, Runway',       status: 'Needs Setup', blocker: 'Needs GenX key + video quota' },
  { cap: 'Voice TTS',           genxModel: 'Aura 2, Grok TTS',        fallback: 'ElevenLabs',         status: 'Needs Setup', blocker: 'Needs GenX key' },
  { cap: 'STT / Transcription', genxModel: 'Whisper, Deepgram Nova',  fallback: 'Deepgram direct',    status: 'Needs Setup', blocker: 'Needs GenX key' },
  { cap: 'Music Generation',    genxModel: 'Lyria (via GenX)',        fallback: 'Suno, Udio',         status: 'Needs Setup', blocker: 'Provider key required' },
  { cap: 'Embeddings',          genxModel: 'text-embedding-3',        fallback: 'HF local',           status: 'Ready',       blocker: '' },
  { cap: 'Adult Image',         genxModel: '— (not via GenX)',        fallback: 'RunPod/HF SDXL',     status: 'Blocked',     blocker: 'Adult mode disabled + self-host only' },
  { cap: 'Web Crawler',         genxModel: '—',                       fallback: 'Firecrawl, Crawl4AI','status': 'Needs Setup', blocker: 'Crawler key required' },
]

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="inline-block h-2 w-2 rounded-full bg-slate-600 animate-pulse" />
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
}

export default function AIEnginePage() {
  const [tab, setTab] = useState<TabId>('genx')
  const [status, setStatus] = useState<GenxStatus | null>(null)
  const [runtimeTruth, setRuntimeTruth] = useState<RuntimeTruth | null>(null)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [budgets, setBudgets] = useState<BudgetData | null>(null)
  const [learning, setLearning] = useState<LearningData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, runtimeRes, modelsRes, budgetsRes, learningRes] = await Promise.allSettled([
        fetch('/api/admin/genx/status'),
        fetch('/api/admin/runtime-truth'),
        fetch('/api/admin/models'),
        fetch('/api/admin/budgets'),
        fetch('/api/admin/learning'),
      ])
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) setStatus(await statusRes.value.json())
      if (runtimeRes.status === 'fulfilled' && runtimeRes.value.ok) setRuntimeTruth(await runtimeRes.value.json())
      if (modelsRes.status === 'fulfilled' && modelsRes.value.ok) {
        const d = await modelsRes.value.json()
        setModels(Array.isArray(d) ? d : (d?.models ?? []))
      }
      if (budgetsRes.status === 'fulfilled' && budgetsRes.value.ok) setBudgets(await budgetsRes.value.json())
      if (learningRes.status === 'fulfilled' && learningRes.value.ok) setLearning(await learningRes.value.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">AI Engine</h1>
          </div>
          <p className="text-sm text-slate-400">
            GenX is the primary AI gateway. All tasks route through GenX first. Direct providers are optional fallbacks only.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-all shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 min-w-[80px] rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENX TAB */}
      {tab === 'genx' && (
        <div className="space-y-6">
          {/* Status cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Configured</p>
              <div className="flex items-center gap-2">
                <StatusDot ok={status?.configured ?? null} />
                <span className="text-sm font-semibold text-white">{status == null ? 'Checking…' : status.configured ? 'Yes' : 'No — add GENX_API_KEY'}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Available (live)</p>
              <div className="flex items-center gap-2">
                <StatusDot ok={status?.available ?? null} />
                <span className="text-sm font-semibold text-white">{status == null ? 'Checking…' : status.available ? 'Online' : status.configured ? 'Unreachable' : 'Not configured'}</span>
              </div>
              {status?.error && <p className="text-[10px] text-red-400 mt-1">{status.error}</p>}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Models in Catalog</p>
              <span className="text-sm font-semibold text-white">{status == null ? '…' : status.modelCount > 0 ? `${status.modelCount} models` : 'Not available'}</span>
            </div>
          </div>

          {/* Catalogue grouped by capability */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Model Catalogue by Capability</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {GENX_CATALOGUE.map(group => (
                <div key={group.group} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <group.icon className="h-4 w-4 text-cyan-400" />
                    <p className="text-xs font-semibold text-white">{group.group}</p>
                  </div>
                  <ul className="space-y-1">
                    {group.models.map(m => (
                      <li key={m} className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-slate-600" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {!status?.configured && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">GenX key not configured</p>
                <p className="text-xs text-slate-400 mt-1">Add <code className="text-amber-300">GENX_API_KEY</code> and <code className="text-amber-300">GENX_API_URL</code> in <a href="/admin/dashboard/settings" className="text-cyan-400 underline underline-offset-2">Settings</a> to unlock all AI capabilities.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROVIDERS TAB */}
      {tab === 'providers' && (
        <div className="space-y-8">
          {/* Group 1 */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">1. Primary Gateway</h2>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <p className="text-sm font-bold text-white">GenX</p>
                </div>
                <p className="text-xs text-slate-400">Routes to all GenX-backed providers. One key unlocks text, image, video, voice, music, and more.</p>
                <p className="text-xs text-slate-500 mt-1">Models: {status?.modelCount ?? '…'} · Status: {status?.available ? 'Online' : status?.configured ? 'Unreachable' : 'Not configured'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusDot ok={status?.available ?? null} />
                <span className={`text-xs ${status?.available ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {status?.available ? 'Online' : 'Needs Setup'}
                </span>
              </div>
            </div>
          </div>

          {/* Group 2 */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">2. Optional Fallback Providers</h2>
            <p className="text-xs text-slate-600 mb-3">Configure only if GenX is insufficient. Status reflects keys stored in Settings vault.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {runtimeTruth?.providers
                ? runtimeTruth.providers.filter(p => !p.coveredByGenX).map(p => {
                    const statusLabel =
                      p.status === 'configured_wired'      ? { label: 'Configured + Wired',       color: 'text-emerald-400' } :
                      p.status === 'configured_not_wired'  ? { label: 'Configured — Not wired',    color: 'text-amber-400'  } :
                      p.status === 'not_configured_optional'? { label: 'Not configured — Optional', color: 'text-slate-500'  } :
                      p.status === 'blocked'                ? { label: 'Blocked',                   color: 'text-red-400'    } :
                                                             { label: p.status,                     color: 'text-slate-500'  }
                    return (
                      <div key={p.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{p.displayName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{p.reason}</p>
                          {p.configured && p.keySource && (
                            <p className="text-[10px] text-slate-600 mt-0.5">Key source: {p.keySource}</p>
                          )}
                        </div>
                        <span className={`text-[10px] shrink-0 mt-1 text-right ${statusLabel.color}`}>
                          {statusLabel.label}
                        </span>
                      </div>
                    )
                  })
                : FALLBACK_PROVIDERS.map(p => (
                    <div key={p.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.reason}</p>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0 mt-1 text-right">
                        {p.wired ? 'Wired' : 'Not wired yet'}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Group 3 */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">3. Covered by GenX — No Direct Key Needed</h2>
            <p className="text-xs text-slate-600 mb-3">These providers are accessible through GenX. Do not set direct keys unless using as advanced override fallback.</p>
            <div className="flex flex-wrap gap-2">
              {COVERED_BY_GENX.map(p => (
                <span key={p} className="text-[11px] px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400">{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODELS TAB */}
      {tab === 'models' && (
        <div className="space-y-6">
          {MODEL_TIERS.map(tier => (
            <div key={tier.tier}>
              <h2 className={`text-xs font-bold uppercase tracking-[0.14em] mb-3 ${tier.color.split(' ')[0]}`}>{tier.tier}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tier.models.map(m => (
                  <div key={m} className={`rounded-xl border p-3 text-xs ${tier.color}`}>
                    {m}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {models.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Live Model Registry ({models.length} models)</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {models.slice(0, 18).map(m => (
                  <div key={m.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-xs font-medium text-white truncate">{m.displayName ?? m.id}</p>
                    <p className="text-[10px] text-slate-600 font-mono truncate">{m.id}</p>
                    {m.costTier && <span className="text-[10px] text-slate-500">{m.costTier}</span>}
                  </div>
                ))}
              </div>
              {models.length > 18 && <p className="text-xs text-slate-600 mt-2">+{models.length - 18} more models</p>}
            </div>
          )}
        </div>
      )}

      {/* ROUTING TAB */}
      {tab === 'routing' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Default routing: GenX → cheapest fallback → balanced fallback → premium (explicit confirm only).</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Capability', 'Primary (GenX)', 'Fallback 1', 'Fallback 2'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTING_TABLE.map(row => (
                  <tr key={row.capability} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-slate-300">{row.capability}</td>
                    <td className="px-3 py-2 text-cyan-400">{row.primary}</td>
                    <td className="px-3 py-2 text-slate-400">{row.fallback1}</td>
                    <td className="px-3 py-2 text-slate-600">{row.fallback2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BUDGETS TAB */}
      {tab === 'budgets' && (
        <div className="space-y-4">
          {budgets ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Global Daily Budget', value: budgets.globalDailyBudgetCents != null ? `$${(budgets.globalDailyBudgetCents/100).toFixed(2)}` : 'Not set' },
                { label: 'Global Monthly Budget', value: budgets.globalMonthlyBudgetCents != null ? `$${(budgets.globalMonthlyBudgetCents/100).toFixed(2)}` : 'Not set' },
                { label: 'Spent Today', value: budgets.spentTodayCents != null ? `$${(budgets.spentTodayCents/100).toFixed(4)}` : 'No data' },
                { label: 'Spent This Month', value: budgets.spentMonthCents != null ? `$${(budgets.spentMonthCents/100).toFixed(4)}` : 'No data' },
                { label: 'Warning Threshold', value: budgets.warningThresholdPct != null ? `${budgets.warningThresholdPct}%` : 'Not set' },
                { label: 'Hard Stop Threshold', value: budgets.hardStopThresholdPct != null ? `${budgets.hardStopThresholdPct}%` : 'Not set' },
                { label: 'Premium Confirmation', value: budgets.premiumConfirmationRequired ? 'Required' : 'Not required' },
                { label: 'Default Mode', value: budgets.defaultCheapMode ? 'Cheap mode (default)' : 'Balanced' },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
                  <p className="text-sm font-semibold text-white">{card.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-500">
              {loading ? 'Loading budget data…' : 'Budget data unavailable — configure in Settings.'}
            </div>
          )}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-slate-500">
            Per-app and per-capability budgets are managed in <Link href="/admin/dashboard/apps" className="text-cyan-400 underline underline-offset-2">Apps &amp; Agents</Link>. Global budgets are set in <Link href="/admin/dashboard/settings" className="text-cyan-400 underline underline-offset-2">Settings</Link>.
          </div>
        </div>
      )}

      {/* CAPABILITIES TAB */}
      {tab === 'capabilities' && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Capability', 'GenX Model', 'Fallback', 'Status', 'Blocker'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runtimeTruth?.capabilities
                  ? runtimeTruth.capabilities.map(cap => {
                      const staticRow = CAPABILITIES_TABLE.find(r => r.cap === cap.name)
                      const statusLabel =
                        cap.status === 'available'       ? 'Ready'      :
                        cap.status === 'not_implemented' ? 'Blueprint'  :
                                                           'Needs Setup'
                      return (
                        <tr key={cap.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-slate-300 font-medium">{cap.name}</td>
                          <td className="px-3 py-2 text-cyan-400">{cap.models[0] ?? staticRow?.genxModel ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-400">{staticRow?.fallback ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                              cap.status === 'available'       ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                              cap.status === 'not_implemented' ? 'text-slate-400 border-slate-500/20 bg-slate-500/5'     :
                                                                 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                            }`}>{statusLabel}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{cap.blocker ?? '—'}</td>
                        </tr>
                      )
                    })
                  : CAPABILITIES_TABLE.map(row => (
                      <tr key={row.cap} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-slate-300 font-medium">{row.cap}</td>
                        <td className="px-3 py-2 text-cyan-400">{row.genxModel}</td>
                        <td className="px-3 py-2 text-slate-400">{row.fallback}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            row.status === 'Ready' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                            row.status === 'Blocked' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                            'text-amber-400 border-amber-500/20 bg-amber-500/5'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.blocker || '—'}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          {runtimeTruth?.blockers && runtimeTruth.blockers.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
              <p className="text-xs font-semibold text-amber-400 mb-2">Active blockers</p>
              {runtimeTruth.blockers.map(b => (
                <p key={b} className="text-xs text-slate-400 flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                  {b}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEARNING TAB */}
      {tab === 'learning' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">AI Learning & Memory</h2>
            </div>
            {learning ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Framework Status</p>
                    <p className="text-sm text-white">{learning.frameworkStatus ?? 'Unknown'}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">UI Wired</p>
                    <div className="flex items-center gap-2">
                      {learning.uiWired
                        ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                        : <AlertCircle className="h-4 w-4 text-amber-400" />}
                      <p className="text-sm text-white">{learning.uiWired ? 'Wired' : 'Framework exists — UI not fully wired'}</p>
                    </div>
                  </div>
                </div>
                {learning.error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{learning.error}</div>
                )}
                {Array.isArray(learning.globalInsights) && learning.globalInsights.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">{learning.globalInsights.length} global insight{learning.globalInsights.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500">
                  {loading ? 'Loading learning data…' : 'Learning module: framework exists — UI not fully wired yet.'}
                </p>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <p>• Global brain: per-provider performance, prompt patterns, routing improvements</p>
                  <p>• Per-app agents: scoped knowledge, memory, niche instructions</p>
                  <p>• Shared learning: admin-approved cross-app lessons</p>
                  <p>• Crawler: Firecrawl / Crawl4AI / local fetch (configure in Settings)</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-slate-500">
            Per-app agent memory is managed in <Link href="/admin/dashboard/apps" className="text-cyan-400 underline underline-offset-2">Apps &amp; Agents</Link> → Agent Memory.
          </div>
        </div>
      )}
    </div>
  )
}
