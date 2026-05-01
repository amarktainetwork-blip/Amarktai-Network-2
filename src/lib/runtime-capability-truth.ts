/**
 * @module runtime-capability-truth
 * @description Single source of truth for runtime provider/capability status.
 *
 * All key reads go through getServiceKey() from service-vault, which checks the
 * DB-encrypted vault first then falls back to environment variables — the same
 * resolution order used by the Settings page. No duplicated key logic anywhere.
 *
 * Server-side only — import from API routes and server components, not from
 * 'use client' components.
 */

import { getServiceKey } from '@/lib/service-vault'

// ── Integration key → env-var map ────────────────────────────────────────────
// Must match the keys used in the integrationConfig DB table and Settings page.

const INTEGRATION_ENV_MAP: Record<string, string> = {
  genx:        'GENX_API_KEY',
  github:      'GITHUB_TOKEN',
  firecrawl:   'FIRECRAWL_API_KEY',
  mem0:        'MEM0_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
  together:    'TOGETHER_API_KEY',
  openai:      'OPENAI_API_KEY',
  replicate:   'REPLICATE_API_KEY',
  qwen:        'DASHSCOPE_API_KEY',
  groq:        'GROQ_API_KEY',
  mistral:     'MISTRAL_API_KEY',
  cohere:      'COHERE_API_KEY',
  xai:         'XAI_API_KEY',
  webdock:     'WEBDOCK_API_KEY',
  openrouter:  'OPENROUTER_API_KEY',
  elevenlabs:  'ELEVENLABS_API_KEY',
  deepgram:    'DEEPGRAM_API_KEY',
  suno:        'SUNO_API_KEY',
  udio:        'UDIO_API_KEY',
}

// ── Providers covered by GenX — no direct key needed ─────────────────────────

const GENX_COVERED_PROVIDERS = new Set([
  'openai', 'anthropic', 'gemini', 'xai', 'recraft',
  'kling', 'seedance', 'pixverse', 'deepgram_aura', 'genx_pro',
])

// ── Fallback provider metadata ────────────────────────────────────────────────

interface FallbackProviderMeta {
  key: string
  displayName: string
  reason: string
  integrationKey: string
}

const FALLBACK_PROVIDER_META: FallbackProviderMeta[] = [
  { key: 'huggingface', displayName: 'Hugging Face',     reason: 'Free / open-source models',              integrationKey: 'huggingface' },
  { key: 'together',    displayName: 'Together AI',       reason: 'Cheaper route for open models',           integrationKey: 'together'    },
  { key: 'qwen',        displayName: 'Qwen / Alibaba',    reason: 'Cheap, multilingual, open-source',        integrationKey: 'qwen'        },
  { key: 'mistral',     displayName: 'Mistral AI',        reason: 'Open-source, self-host, privacy',         integrationKey: 'mistral'     },
  { key: 'cohere',      displayName: 'Cohere',            reason: 'Embeddings + reranking fallback',         integrationKey: 'cohere'      },
  { key: 'groq',        displayName: 'Groq',              reason: 'Fast inference, cheap',                   integrationKey: 'groq'        },
  { key: 'openrouter',  displayName: 'OpenRouter',        reason: 'Aggregated model routing',                integrationKey: 'openrouter'  },
  { key: 'replicate',   displayName: 'Replicate',         reason: 'Image / video / audio fallback',          integrationKey: 'replicate'   },
  { key: 'elevenlabs',  displayName: 'ElevenLabs',        reason: 'Specialist TTS fallback',                 integrationKey: 'elevenlabs'  },
  { key: 'deepgram',    displayName: 'Deepgram',          reason: 'STT / TTS direct fallback',               integrationKey: 'deepgram'    },
  { key: 'firecrawl',   displayName: 'Firecrawl',         reason: 'Web crawler / research',                  integrationKey: 'firecrawl'   },
  { key: 'openai',      displayName: 'OpenAI (direct)',   reason: 'Advanced fallback when GenX unavailable', integrationKey: 'openai'      },
  { key: 'suno',        displayName: 'Suno',              reason: 'Music generation fallback',                integrationKey: 'suno'        },
  { key: 'udio',        displayName: 'Udio',              reason: 'Music generation fallback',                integrationKey: 'udio'        },
]

// ── Return shapes ─────────────────────────────────────────────────────────────

export interface GenXRuntimeStatus {
  configured: boolean
  available: boolean
  keySource: 'vault' | 'env' | 'missing'
  modelCount: number
  capabilities: string[]
  apiUrl: string | null
}

export type ProviderStatus =
  | 'configured_wired'
  | 'configured_not_wired'
  | 'not_configured_optional'
  | 'covered_by_genx'
  | 'blocked'

export interface ProviderRuntimeEntry {
  key: string
  displayName: string
  reason: string
  configured: boolean
  coveredByGenX: boolean
  keySource: 'vault' | 'env' | 'missing'
  status: ProviderStatus
}

export type CapabilityStatus = 'available' | 'blocked' | 'not_implemented'

export interface CapabilityRuntimeEntry {
  name: string
  status: CapabilityStatus
  blocker: string | null
  models: string[]
  nextAction: string | null
}

export interface DashboardRuntimeTruth {
  success: true
  genx: GenXRuntimeStatus
  providers: ProviderRuntimeEntry[]
  capabilities: CapabilityRuntimeEntry[]
  blockers: string[]
}

// ── Helper: resolve key and determine source ──────────────────────────────────

async function resolveKey(integrationKey: string): Promise<{ hasKey: boolean; source: 'vault' | 'env' | 'missing' }> {
  const envVar = INTEGRATION_ENV_MAP[integrationKey] ?? ''
  const key = await getServiceKey(integrationKey, envVar)
  if (!key) return { hasKey: false, source: 'missing' }

  // Distinguish vault from env by checking env var directly
  const envValue = envVar ? process.env[envVar] : null
  const source: 'vault' | 'env' = (envValue && key === envValue.trim()) ? 'env' : 'vault'
  return { hasKey: true, source }
}

// ── GenX status ───────────────────────────────────────────────────────────────

export async function getGenXRuntimeStatus(): Promise<GenXRuntimeStatus> {
  const { hasKey, source } = await resolveKey('genx')
  const apiUrl = process.env.GENX_API_URL ?? 'https://query.genx.sh'

  if (!hasKey) {
    return {
      configured: false,
      available: false,
      keySource: 'missing',
      modelCount: 0,
      capabilities: [],
      apiUrl: null,
    }
  }

  // Known GenX capabilities (static; live catalogue fetch is optional)
  const capabilities = [
    'text_chat', 'reasoning', 'coding', 'image_generation', 'video_generation',
    'voice_tts', 'voice_stt', 'music_generation', 'embeddings', 'vision',
    'translation', 'moderation', 'avatars',
  ]

  // Attempt a lightweight catalogue count (non-blocking; never throw)
  let modelCount = 57 // known static catalogue size
  let available = true
  try {
    const key = await getServiceKey('genx', 'GENX_API_KEY')
    if (key) {
      const res = await fetch(`${apiUrl}/api/v1/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
      })
      if (res.ok) {
        const data = await res.json() as { data?: unknown[] } | unknown[]
        const models = Array.isArray(data) ? data : (data as { data?: unknown[] }).data
        if (Array.isArray(models) && models.length > 0) modelCount = models.length
      } else {
        available = false
      }
    }
  } catch {
    available = false
  }

  return {
    configured: true,
    available,
    keySource: source,
    modelCount,
    capabilities,
    apiUrl,
  }
}

// ── Provider status ───────────────────────────────────────────────────────────

export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  const results: ProviderRuntimeEntry[] = await Promise.all(
    FALLBACK_PROVIDER_META.map(async (meta) => {
      const { hasKey, source } = await resolveKey(meta.integrationKey)
      const coveredByGenX = GENX_COVERED_PROVIDERS.has(meta.key)

      let status: ProviderStatus
      if (coveredByGenX) {
        status = 'covered_by_genx'
      } else if (hasKey) {
        // Mark as configured_wired for providers with a real implementation route.
        // Providers without a wired backend are configured_not_wired.
        const wiredProviders = new Set([
          'huggingface', 'together', 'replicate', 'openrouter', 'groq',
          'openai', 'firecrawl', 'deepgram', 'elevenlabs',
        ])
        status = wiredProviders.has(meta.key) ? 'configured_wired' : 'configured_not_wired'
      } else {
        status = 'not_configured_optional'
      }

      return {
        key: meta.key,
        displayName: meta.displayName,
        reason: meta.reason,
        configured: hasKey,
        coveredByGenX,
        keySource: source,
        status,
      }
    }),
  )
  return results
}

export async function getFallbackProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  return getRuntimeProviderStatus()
}

// ── Capability status ─────────────────────────────────────────────────────────

export async function getCapabilityStatus(genxConfigured: boolean, providers: ProviderRuntimeEntry[]): Promise<CapabilityRuntimeEntry[]> {
  function isConfigured(key: string) {
    return providers.find(p => p.key === key)?.configured === true
  }

  const hasHF       = isConfigured('huggingface')
  const hasTogether = isConfigured('together')
  const hasReplicate = isConfigured('replicate')
  const hasElevenLabs = isConfigured('elevenlabs')
  const hasDeepgram = isConfigured('deepgram')
  const hasSuno     = isConfigured('suno')
  const hasUdio     = isConfigured('udio')
  const hasFirecrawl = isConfigured('firecrawl')

  const caps: CapabilityRuntimeEntry[] = [
    {
      name: 'Text / Chat',
      status: genxConfigured || providers.some(p => p.configured) ? 'available' : 'blocked',
      blocker: genxConfigured ? null : 'No AI provider configured',
      models: genxConfigured ? ['GPT-4o (via GenX)', 'Claude Opus 4 (via GenX)', 'Gemini 2.5 Pro (via GenX)', 'Grok 3 (via GenX)'] : [],
      nextAction: genxConfigured ? null : 'Add GenX key in Settings',
    },
    {
      name: 'Coding Agent',
      status: genxConfigured ? 'available' : 'blocked',
      blocker: genxConfigured ? null : 'GenX key required',
      models: genxConfigured ? ['GPT-4.1 (via GenX)', 'Claude Sonnet 3.7 (via GenX)', 'DeepSeek R1 (via GenX)'] : [],
      nextAction: genxConfigured ? null : 'Add GenX key in Settings',
    },
    {
      name: 'Image Generation',
      status: (genxConfigured || hasHF || hasTogether || hasReplicate) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasHF || hasTogether || hasReplicate)
        ? null
        : 'Configure GenX key or HuggingFace/Together/Replicate in Settings',
      models: [
        ...(genxConfigured ? ['Recraft v3 (via GenX)', 'DALL-E 3 (via GenX)', 'Grok Imagine (via GenX)'] : []),
        ...(hasHF ? ['SDXL (HuggingFace)'] : []),
        ...(hasReplicate ? ['SDXL Replicate'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX key or image provider key in Settings',
    },
    {
      name: 'Video Generation',
      status: genxConfigured ? 'available' : 'blocked',
      blocker: genxConfigured
        ? null
        : 'GenX key required for video generation',
      models: genxConfigured ? ['Veo 2 (via GenX)', 'Kling (via GenX)', 'Seedance (via GenX)', 'PixVerse (via GenX)', 'Grok Video (via GenX)'] : [],
      nextAction: genxConfigured ? 'Confirm video quota before generating (high cost)' : 'Add GenX key in Settings',
    },
    {
      name: 'Voice TTS',
      status: (genxConfigured || hasElevenLabs || hasDeepgram) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasElevenLabs || hasDeepgram)
        ? null
        : 'Configure GenX key or ElevenLabs/Deepgram in Settings',
      models: [
        ...(genxConfigured ? ['Grok TTS (via GenX)', 'Aura 2 (via GenX)', 'GenX LM Voice v1'] : []),
        ...(hasElevenLabs ? ['ElevenLabs TTS'] : []),
        ...(hasDeepgram ? ['Deepgram Nova TTS'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX key or ElevenLabs/Deepgram key in Settings',
    },
    {
      name: 'STT / Transcription',
      status: (genxConfigured || hasDeepgram) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasDeepgram)
        ? null
        : 'Configure GenX key or Deepgram in Settings',
      models: [
        ...(genxConfigured ? ['GenX transcription', 'Whisper (via GenX)', 'Deepgram Nova (via GenX)'] : []),
        ...(hasDeepgram ? ['Deepgram Nova (direct)'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX key or Deepgram key in Settings',
    },
    {
      name: 'Music Generation',
      status: (hasSuno || hasUdio) ? 'available' : 'not_implemented',
      blocker: (hasSuno || hasUdio)
        ? null
        : 'No music provider configured. Suno or Udio key required. GenX music (Lyria) not yet wired.',
      models: [
        ...(genxConfigured ? ['Lyria (via GenX — pending route implementation)', 'GenX audio models'] : []),
        ...(hasSuno ? ['Suno'] : []),
        ...(hasUdio ? ['Udio'] : []),
      ],
      nextAction: 'Configure Suno or Udio key in Settings',
    },
    {
      name: 'Embeddings',
      status: genxConfigured ? 'available' : 'blocked',
      blocker: genxConfigured ? null : 'GenX key required',
      models: genxConfigured ? ['GenX embeddings', 'text-embedding-3 (via GenX)'] : [],
      nextAction: genxConfigured ? null : 'Add GenX key in Settings',
    },
    {
      name: 'Adult Image',
      status: 'blocked',
      blocker: 'Adult mode disabled. Requires app-scoped permission, self-host provider (RunPod/HuggingFace), and ADULT_MODE_ENABLED=true.',
      models: [],
      nextAction: 'Enable adult mode in Settings → Adult Mode and configure specialist provider',
    },
    {
      name: 'Web Crawler / Research',
      status: (hasFirecrawl || genxConfigured) ? 'available' : 'blocked',
      blocker: (hasFirecrawl || genxConfigured)
        ? null
        : 'Configure Firecrawl key or GenX key in Settings',
      models: [
        ...(hasFirecrawl ? ['Firecrawl'] : []),
        ...(genxConfigured ? ['GenX (Gemini/GPT-4.1 research)'] : []),
      ],
      nextAction: hasFirecrawl ? null : 'Add Firecrawl key in Settings for enhanced crawling',
    },
  ]

  return caps
}

// ── Master truth aggregator ───────────────────────────────────────────────────

export async function getModelCatalogueStatus(): Promise<{ modelCount: number; source: 'live' | 'static' }> {
  const genx = await getGenXRuntimeStatus()
  return {
    modelCount: genx.modelCount,
    source: genx.available ? 'live' : 'static',
  }
}

export async function getDashboardRuntimeTruth(): Promise<DashboardRuntimeTruth> {
  const [genx, providers] = await Promise.all([
    getGenXRuntimeStatus(),
    getRuntimeProviderStatus(),
  ])

  const capabilities = await getCapabilityStatus(genx.configured, providers)

  const blockers: string[] = []
  if (!genx.configured) blockers.push('GenX API key not configured — add GENX_API_KEY in Settings')
  if (genx.configured && !genx.available) blockers.push('GenX key configured but endpoint unreachable — check GENX_API_URL')

  const blockedCapabilities = capabilities.filter(c => c.status === 'blocked')
  for (const cap of blockedCapabilities) {
    if (cap.blocker) blockers.push(`${cap.name}: ${cap.blocker}`)
  }

  return {
    success: true,
    genx,
    providers,
    capabilities,
    blockers,
  }
}
