/**
 * @module runtime-capability-truth
 * @description Single source of truth for runtime provider/capability status.
 *
 * Provider decisions come from ai-provider-governance.ts. Key reads go through
 * getServiceKey() from service-vault, which checks the DB-encrypted vault first
 * then falls back to environment variables — the same resolution order used by
 * the Settings page.
 */

import { getServiceKey, getServiceConfigField } from '@/lib/service-vault'
import { getProviderKeyWithSource, type CoreProvider } from '@/lib/provider-config'
import {
  getAdultSpecialistProviderKeys,
  getGenXCoveredProviderKeys,
  getRuntimeProviderGovernance,
  getWiredProviderKeys,
  type ProviderGovernanceStatus,
} from '@/lib/ai-provider-governance'

const GENX_COVERED_PROVIDERS = getGenXCoveredProviderKeys()
const WIRED_PROVIDER_KEYS = getWiredProviderKeys()
const ADULT_SPECIALIST_PROVIDER_KEYS = getAdultSpecialistProviderKeys()

export interface GenXRuntimeStatus {
  configured: boolean
  available: boolean
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
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
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
  status: ProviderStatus
  governanceStatus?: ProviderGovernanceStatus
  showInPrimarySetup?: boolean
  defaultCostRole?: string
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
  adultGate: AdultCapabilityGate
  blockers: string[]
}

async function resolveKey(integrationKey: string): Promise<{ hasKey: boolean; source: ProviderRuntimeEntry['keySource'] }> {
  const resolved = await getProviderKeyWithSource(integrationKey as CoreProvider)
  if (!resolved.key) return { hasKey: false, source: 'missing' }
  return { hasKey: true, source: resolved.source }
}

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

  const capabilities = [
    'text_chat', 'reasoning', 'coding', 'image_generation', 'video_generation',
    'voice_tts', 'voice_stt', 'music_generation', 'embeddings', 'vision',
    'translation', 'moderation', 'avatars',
  ]

  let modelCount = 57
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

export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  const governance = getRuntimeProviderGovernance()
  const results: ProviderRuntimeEntry[] = await Promise.all(
    governance.map(async (meta) => {
      const { hasKey, source } = await resolveKey(meta.integrationKey)
      const coveredByGenX = GENX_COVERED_PROVIDERS.has(meta.key)

      let status: ProviderStatus
      if (coveredByGenX) {
        status = 'covered_by_genx'
      } else if (hasKey) {
        status = WIRED_PROVIDER_KEYS.has(meta.key) ? 'configured_wired' : 'configured_not_wired'
      } else {
        status = meta.status === 'deprecated' ? 'blocked' : 'not_configured_optional'
      }

      return {
        key: meta.key,
        displayName: meta.displayName,
        reason: meta.reason,
        configured: hasKey,
        coveredByGenX,
        keySource: source,
        status,
        governanceStatus: meta.status,
        showInPrimarySetup: meta.showInPrimarySetup,
        defaultCostRole: meta.defaultCostRole,
      }
    }),
  )
  return results
}

export async function getFallbackProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  return getRuntimeProviderStatus()
}

export type AdultCapabilityGateStatus =
  | 'ready'
  | 'needs_provider_test'
  | 'provider_failed'
  | 'app_permission_disabled'
  | 'global_flag_disabled'
  | 'not_wired'

export interface AdultCapabilityGate {
  status: AdultCapabilityGateStatus
  blocker: string | null
  providerAvailable: boolean
  testPassed: boolean
  globalEnabled: boolean
  enabled: boolean
  selectedProvider: string | null
  selectedModel: string | null
  allowedCategories: string[]
  blockedCategories: string[]
  lastTestStatus: string | null
  lastError: string | null
  configuredProviders: string[]
}

export async function getAdultCapabilityGate(providers: ProviderRuntimeEntry[]): Promise<AdultCapabilityGate> {
  function hasProvider(key: string) {
    return providers.find(p => p.key === key)?.configured === true
  }

  const envEnabled = process.env.ADULT_MODE_ENABLED?.trim().toLowerCase() === 'true'
  const adultMode = await getServiceConfigField('adult_mode', 'mode', '').catch(() => null) ?? ''
  const lastTestStatus = await getServiceConfigField('adult_mode', 'lastTestStatus', '').catch(() => null) ?? ''
  const lastError = await getServiceConfigField('adult_mode', 'lastError', '').catch(() => null) ?? ''
  const savedProvider = await getServiceConfigField('adult_mode', 'providerType', '').catch(() => null) ?? ''
  const savedModel = await getServiceConfigField('adult_mode', 'providerModel', '').catch(() => null) ?? ''

  const globalEnabled = envEnabled || adultMode === 'specialist'
  const xaiKey = await resolveKey('xai')
  const configuredProviders = [...ADULT_SPECIALIST_PROVIDER_KEYS].filter((key) => hasProvider(key))
  if (xaiKey.hasKey && !configuredProviders.includes('xai')) configuredProviders.push('xai')
  const providerAvailable = configuredProviders.length > 0
  const selectedProvider = savedProvider && configuredProviders.includes(savedProvider)
    ? savedProvider
    : configuredProviders[0] ?? null

  const testPassed = lastTestStatus === 'passed'
  const base = {
    providerAvailable,
    testPassed,
    globalEnabled,
    enabled: globalEnabled,
    selectedProvider,
    selectedModel: savedModel || null,
    allowedCategories: ['consensual_adult_suggestive', 'adult_lingerie', 'adult_nudity_without_visible_genitals'],
    blockedCategories: ['minors', 'age_ambiguous', 'non_consensual', 'sexual_violence', 'real_person_sexual_deepfakes', 'explicit_sex_acts', 'visible_genitals', 'illegal_content', 'self_harm'],
    lastTestStatus: lastTestStatus || null,
    lastError: lastError || null,
    configuredProviders,
  }

  if (!globalEnabled) {
    return {
      ...base,
      status: 'global_flag_disabled',
      blocker: 'Adult mode is disabled. Enable it in Settings → Adult Mode (set mode to "Specialist provider only") or set ADULT_MODE_ENABLED=true.',
      globalEnabled: false,
      enabled: false,
    }
  }

  if (!providerAvailable) {
    return {
      ...base,
      status: 'not_wired',
      blocker: 'No specialist adult provider configured. Add Together AI, HuggingFace, Replicate, or xAI/Grok in Settings → AI Providers.',
      providerAvailable: false,
    }
  }

  if (!testPassed) {
    return {
      ...base,
      status: lastTestStatus === 'failed' ? 'provider_failed' : 'needs_provider_test',
      blocker: lastTestStatus === 'failed'
        ? 'Last specialist provider test failed. Re-run "Test provider" in Settings → Adult Mode to confirm the provider works.'
        : 'Specialist provider test has not been run. Run "Test provider" in Settings → Adult Mode to unlock adult generation.',
    }
  }

  return {
    ...base,
    status: 'ready',
    blocker: null,
  }
}

export async function getCapabilityStatus(genxConfigured: boolean, providers: ProviderRuntimeEntry[]): Promise<CapabilityRuntimeEntry[]> {
  function isConfigured(key: string) {
    return providers.find(p => p.key === key)?.configured === true
  }

  const hasHF = isConfigured('huggingface')
  const hasTogether = isConfigured('together')
  const hasReplicate = isConfigured('replicate')
  const hasElevenLabs = isConfigured('elevenlabs')
  const hasDeepgram = isConfigured('deepgram')
  const hasSuno = isConfigured('suno')
  const hasUdio = isConfigured('udio')
  const hasFirecrawl = isConfigured('firecrawl')
  const adultGate = await getAdultCapabilityGate(providers)

  return [
    {
      name: 'Text / Chat',
      status: genxConfigured || providers.some(p => p.configured && p.governanceStatus !== 'deprecated') ? 'available' : 'blocked',
      blocker: genxConfigured ? null : 'No governed AI provider configured',
      models: genxConfigured ? ['GPT-4o (via GenX)', 'Claude Opus 4 (via GenX)', 'Gemini 2.5 Pro (via GenX)', 'Grok 3 (via GenX)'] : [],
      nextAction: genxConfigured ? null : 'Add GenX or a governed cheap provider in Settings',
    },
    {
      name: 'Coding Agent',
      status: genxConfigured || isConfigured('qwen') || isConfigured('groq') || isConfigured('together') ? 'available' : 'blocked',
      blocker: genxConfigured || isConfigured('qwen') || isConfigured('groq') || isConfigured('together') ? null : 'GenX, Qwen, Groq, or Together key required',
      models: [
        ...(genxConfigured ? ['GPT-4.1 (via GenX)', 'Claude Sonnet 3.7 (via GenX)', 'DeepSeek R1 (via GenX)'] : []),
        ...(isConfigured('qwen') ? ['Qwen Plus', 'Qwen Turbo'] : []),
        ...(isConfigured('groq') ? ['Groq Llama 3.3 70B'] : []),
        ...(isConfigured('together') ? ['Together Llama 3 70B'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX, Qwen, Groq, or Together in Settings',
    },
    {
      name: 'Image Generation',
      status: (genxConfigured || hasHF || hasTogether || hasReplicate) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasHF || hasTogether || hasReplicate) ? null : 'Configure GenX, HuggingFace, Together, or Replicate in Settings',
      models: [
        ...(genxConfigured ? ['Recraft v3 (via GenX)', 'DALL-E 3 (via GenX)', 'Grok Imagine (via GenX)'] : []),
        ...(hasHF ? ['SDXL (HuggingFace)'] : []),
        ...(hasReplicate ? ['SDXL Replicate'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX or image provider key in Settings',
    },
    {
      name: 'Video Generation',
      status: genxConfigured || hasReplicate ? 'available' : 'blocked',
      blocker: genxConfigured || hasReplicate ? null : 'GenX or Replicate required for video generation',
      models: [
        ...(genxConfigured ? ['Veo 2 (via GenX)', 'Kling (via GenX)', 'Seedance (via GenX)', 'PixVerse (via GenX)', 'Grok Video (via GenX)'] : []),
        ...(hasReplicate ? ['Replicate video models'] : []),
      ],
      nextAction: genxConfigured ? 'Confirm video quota before generating (high cost)' : 'Add GenX or Replicate in Settings',
    },
    {
      name: 'Voice TTS',
      status: (genxConfigured || hasElevenLabs || hasDeepgram || isConfigured('groq') || hasHF) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasElevenLabs || hasDeepgram || isConfigured('groq') || hasHF) ? null : 'Configure GenX, ElevenLabs, Deepgram, Groq, or HuggingFace in Settings',
      models: [
        ...(genxConfigured ? ['Grok TTS (via GenX)', 'Aura 2 (via GenX)', 'GenX LM Voice v1'] : []),
        ...(hasElevenLabs ? ['ElevenLabs TTS'] : []),
        ...(hasDeepgram ? ['Deepgram Nova TTS'] : []),
        ...(isConfigured('groq') ? ['Groq PlayAI TTS'] : []),
        ...(hasHF ? ['HuggingFace MMS TTS'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX or a TTS provider key in Settings',
    },
    {
      name: 'STT / Transcription',
      status: (genxConfigured || hasDeepgram) ? 'available' : 'blocked',
      blocker: (genxConfigured || hasDeepgram) ? null : 'Configure GenX or Deepgram in Settings',
      models: [
        ...(genxConfigured ? ['GenX transcription', 'Whisper (via GenX)', 'Deepgram Nova (via GenX)'] : []),
        ...(hasDeepgram ? ['Deepgram Nova (direct)'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX or Deepgram in Settings',
    },
    {
      name: 'Music Generation',
      status: (hasSuno || hasUdio || hasReplicate) ? 'available' : 'not_implemented',
      blocker: (hasSuno || hasUdio || hasReplicate) ? null : 'Music providers are proposed only. Add Suno/Udio/Replicate after legal/API confirmation.',
      models: [
        ...(genxConfigured ? ['Lyria (via GenX — pending route implementation)', 'GenX audio models'] : []),
        ...(hasSuno ? ['Suno'] : []),
        ...(hasUdio ? ['Udio'] : []),
        ...(hasReplicate ? ['Replicate music/audio models'] : []),
      ],
      nextAction: 'Approve and configure a music provider before enabling music generation',
    },
    {
      name: 'Embeddings',
      status: genxConfigured || isConfigured('openai') ? 'available' : 'blocked',
      blocker: genxConfigured || isConfigured('openai') ? null : 'GenX or OpenAI direct key required',
      models: [
        ...(genxConfigured ? ['GenX embeddings', 'text-embedding-3 (via GenX)'] : []),
        ...(isConfigured('openai') ? ['OpenAI text-embedding-3-small/large'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX or advanced OpenAI direct key in Settings',
    },
    {
      name: 'Adult Image',
      status: adultGate.globalEnabled && adultGate.providerAvailable ? 'available' : 'blocked',
      blocker: adultGate.blocker,
      models: adultGate.globalEnabled && adultGate.providerAvailable
        ? [
            ...(hasTogether ? ['FLUX.1-schnell (Together AI)', 'SDXL (Together AI)'] : []),
            ...(hasHF ? ['RealVisXL (HuggingFace)', 'DreamShaper (HuggingFace)'] : []),
            ...(hasReplicate ? ['SDXL Replicate'] : []),
          ]
        : [],
      nextAction: adultGate.status === 'ready'
        ? null
        : adultGate.status === 'not_wired'
        ? 'Add Together AI, HuggingFace, Replicate, or xAI key in Settings → AI Providers'
        : adultGate.status === 'needs_provider_test' || adultGate.status === 'provider_failed'
        ? 'Run "Test provider" in Settings → Adult Mode'
        : 'Enable adult mode in Settings → Adult Mode',
    },
    {
      name: 'Web Crawler / Research',
      status: (hasFirecrawl || genxConfigured) ? 'available' : 'blocked',
      blocker: (hasFirecrawl || genxConfigured) ? null : 'Configure Firecrawl or GenX in Settings',
      models: [
        ...(hasFirecrawl ? ['Firecrawl'] : []),
        ...(genxConfigured ? ['GenX (Gemini/GPT-4.1 research)'] : []),
      ],
      nextAction: hasFirecrawl ? null : 'Add Firecrawl key in Settings for enhanced crawling',
    },
  ]
}

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

  const [capabilities, adultGate] = await Promise.all([
    getCapabilityStatus(genx.configured, providers),
    getAdultCapabilityGate(providers),
  ])

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
    adultGate,
    blockers,
  }
}
