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
import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'

const GENX_COVERED_PROVIDERS = getGenXCoveredProviderKeys()
const WIRED_PROVIDER_KEYS = getWiredProviderKeys()
const ADULT_SPECIALIST_PROVIDER_KEYS = getAdultSpecialistProviderKeys()

function getLocalCoreStatus(): LocalCoreStatus {
  const memory = checkWritable(LOCAL_STORE_FILES.memory)
  const approvals = checkWritable(LOCAL_STORE_FILES.approvals)
  const artifacts = checkWritable(LOCAL_STORE_FILES.artifacts)
  const research = checkWritable(LOCAL_STORE_FILES.research)
  const apps = checkWritable(LOCAL_STORE_FILES.apps)
  const agents = checkWritable(LOCAL_STORE_FILES.agents)

  interface WithId { id: string }
  const appCount = listRecords<WithId>(LOCAL_STORE_FILES.apps).length
  const agentCount = listRecords<WithId>(LOCAL_STORE_FILES.agents).length

  const allWorking = memory.writable && approvals.writable && artifacts.writable &&
    research.writable && apps.writable && agents.writable

  return {
    memory: { writable: memory.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.memory },
    approvals: { writable: approvals.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.approvals },
    artifacts: { writable: artifacts.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.artifacts },
    research: { writable: research.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.research },
    apps: { writable: apps.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.apps, count: appCount },
    agents: { writable: agents.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.agents, count: agentCount },
    allWorking,
  }
}

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

export interface LocalCoreStatus {
  memory: { writable: boolean; driver: string; file: string }
  approvals: { writable: boolean; driver: string; file: string }
  artifacts: { writable: boolean; driver: string; file: string }
  research: { writable: boolean; driver: string; file: string }
  apps: { writable: boolean; driver: string; file: string; count: number }
  agents: { writable: boolean; driver: string; file: string; count: number }
  allWorking: boolean
}

export interface DashboardRuntimeTruth {
  success: true
  genx: GenXRuntimeStatus
  providers: ProviderRuntimeEntry[]
  capabilities: CapabilityRuntimeEntry[]
  adultGate: AdultCapabilityGate
  blockers: string[]
  localCore: LocalCoreStatus
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
  | 'configured_with_last_error'
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
    // Test failure is diagnostic — provider may still work. Report status accurately but do not globally block.
    return {
      ...base,
      status: lastTestStatus === 'failed' ? 'configured_with_last_error' : 'needs_provider_test',
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

  const hasQwen = isConfigured('qwen')
  const hasMinimax = isConfigured('minimax')
  const hasDeepSeek = isConfigured('deepseek')
  const hasGemini = isConfigured('gemini')
  const hasHF = isConfigured('huggingface')
  const hasTogether = isConfigured('together')
  const hasGroq = isConfigured('groq')
  const hasReplicate = isConfigured('replicate')
  const hasElevenLabs = isConfigured('elevenlabs')
  const hasDeepgram = isConfigured('deepgram')
  const hasFirecrawl = isConfigured('firecrawl')
  const hasMem0 = isConfigured('mem0')
  const hasGitHub = isConfigured('github')
  const hasOpenRouter = isConfigured('openrouter')
  const hasOpenAI = isConfigured('openai')

  // Text/chat can run via GenX OR any core text provider
  const hasTextProvider = genxConfigured || hasQwen || hasMinimax || hasDeepSeek || hasGemini
    || hasHF || hasGroq || hasTogether || hasOpenRouter || hasOpenAI
  // Coding can run via GenX OR any coding-capable provider
  const hasCodingProvider = genxConfigured || hasQwen || hasMinimax || hasDeepSeek || hasGemini
    || hasGroq || hasTogether
  // Image can run via GenX OR Qwen/MiniMax/HF/Together/Replicate/OpenAI
  const hasImageProvider = genxConfigured || hasQwen || hasMinimax || hasHF || hasTogether || hasReplicate || hasOpenAI
  // Video can run via GenX OR Qwen/MiniMax/Replicate
  const hasVideoProvider = genxConfigured || hasQwen || hasMinimax || hasReplicate
  // TTS via GenX OR MiniMax/ElevenLabs/Deepgram/Groq/HF/OpenAI
  const hasTTSProvider = genxConfigured || hasMinimax || hasElevenLabs || hasDeepgram || hasGroq || hasHF || hasOpenAI
  // STT via GenX OR Deepgram/MiniMax/HF/OpenAI
  const hasSTTProvider = genxConfigured || hasDeepgram || hasMinimax || hasHF || hasOpenAI
  // Research via Firecrawl OR GenX/Gemini/OpenRouter
  const hasResearchProvider = hasFirecrawl || genxConfigured || hasGemini || hasOpenRouter

  const adultGate = await getAdultCapabilityGate(providers)

  return [
    {
      name: 'Text / Chat',
      status: hasTextProvider ? 'available' : 'blocked',
      blocker: hasTextProvider ? null : 'Configure at least one AI provider (Qwen, MiniMax, DeepSeek, Gemini, Groq, Together, HuggingFace, or GenX) in Settings',
      models: [
        ...(genxConfigured ? ['GPT-4o (via GenX)', 'Claude Opus 4 (via GenX)', 'Gemini 2.5 Pro (via GenX)', 'Grok 3 (via GenX)'] : []),
        ...(hasQwen ? ['Qwen Plus', 'Qwen Turbo', 'Qwen Max'] : []),
        ...(hasMinimax ? ['MiniMax MoE', 'MiniMax Text'] : []),
        ...(hasDeepSeek ? ['DeepSeek V3', 'DeepSeek R1'] : []),
        ...(hasGemini ? ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'] : []),
        ...(hasGroq ? ['Groq Llama 3.3 70B', 'Groq Llama 3.1 70B'] : []),
        ...(hasTogether ? ['Together Llama 3 70B', 'Together Qwen 2.5 72B'] : []),
      ],
      nextAction: hasTextProvider ? null : 'Add a primary AI provider key in Settings',
    },
    {
      name: 'Coding Agent',
      status: hasCodingProvider ? 'available' : 'blocked',
      blocker: hasCodingProvider ? null : 'Configure GenX, Qwen, MiniMax, DeepSeek, Gemini, Groq, or Together in Settings',
      models: [
        ...(genxConfigured ? ['GPT-4.1 (via GenX)', 'Claude Sonnet 3.7 (via GenX)', 'DeepSeek R1 (via GenX)'] : []),
        ...(hasQwen ? ['Qwen Plus', 'Qwen Turbo'] : []),
        ...(hasMinimax ? ['MiniMax MoE'] : []),
        ...(hasDeepSeek ? ['DeepSeek R1', 'DeepSeek V3'] : []),
        ...(hasGemini ? ['Gemini 2.5 Flash'] : []),
        ...(hasGroq ? ['Groq Llama 3.3 70B'] : []),
        ...(hasTogether ? ['Together Llama 3 70B'] : []),
      ],
      nextAction: hasCodingProvider ? null : 'Add GenX, Qwen, or DeepSeek in Settings',
    },
    {
      name: 'Image Generation',
      status: hasImageProvider ? 'available' : 'blocked',
      blocker: hasImageProvider ? null : 'Configure GenX, Qwen/DashScope, MiniMax/Mimo, HuggingFace, Together, Replicate, or OpenAI Direct in Settings',
      models: [
        ...(genxConfigured ? ['Recraft v3 (via GenX)', 'DALL-E 3 (via GenX)', 'Grok Imagine (via GenX)'] : []),
        ...(hasQwen ? ['Qwen Image (DashScope)', 'Wanx 2.1 (DashScope)'] : []),
        ...(hasMinimax ? ['MiniMax Image'] : []),
        ...(hasHF ? ['SDXL (HuggingFace)', 'Custom model endpoint'] : []),
        ...(hasTogether ? ['FLUX.1 Schnell (Together AI)'] : []),
        ...(hasReplicate ? ['SDXL (Replicate)'] : []),
        ...(hasOpenAI ? ['GPT Image (OpenAI Direct)'] : []),
      ],
      nextAction: hasImageProvider ? null : 'Add GenX or an image-capable provider key in Settings',
    },
    {
      name: 'Video Generation',
      status: hasVideoProvider ? 'available' : 'blocked',
      blocker: hasVideoProvider ? null : 'Configure GenX, Qwen/DashScope, MiniMax/Mimo, or Replicate in Settings',
      models: [
        ...(genxConfigured ? ['Veo 2 (via GenX)', 'Kling (via GenX)', 'Seedance (via GenX)', 'PixVerse (via GenX)'] : []),
        ...(hasQwen ? ['Wan Video 2.1 (DashScope)'] : []),
        ...(hasMinimax ? ['MiniMax Video-01'] : []),
        ...(hasReplicate ? ['Replicate video models'] : []),
      ],
      nextAction: hasVideoProvider ? 'Confirm video quota before generating (high cost)' : 'Add GenX, Qwen, MiniMax, or Replicate in Settings',
    },
    {
      name: 'Voice TTS',
      status: hasTTSProvider ? 'available' : 'blocked',
      blocker: hasTTSProvider ? null : 'Configure GenX, MiniMax/Mimo, ElevenLabs, Deepgram, Groq, HuggingFace, or OpenAI Direct in Settings',
      models: [
        ...(genxConfigured ? ['Grok TTS (via GenX)', 'Aura 2 (via GenX)', 'GenX LM Voice v1'] : []),
        ...(hasMinimax ? ['MiniMax Speech-02', 'MiniMax Speech-01'] : []),
        ...(hasElevenLabs ? ['ElevenLabs TTS'] : []),
        ...(hasDeepgram ? ['Deepgram Aura 2'] : []),
        ...(hasGroq ? ['Groq PlayAI TTS'] : []),
        ...(hasHF ? ['HuggingFace MMS TTS', 'Custom TTS endpoint'] : []),
        ...(hasOpenAI ? ['OpenAI TTS-1', 'OpenAI TTS-1 HD'] : []),
      ],
      nextAction: hasTTSProvider ? null : 'Add a TTS provider key in Settings',
    },
    {
      name: 'STT / Transcription',
      status: hasSTTProvider ? 'available' : 'blocked',
      blocker: hasSTTProvider ? null : 'Configure GenX, Deepgram, MiniMax/Mimo, HuggingFace, or OpenAI Direct in Settings',
      models: [
        ...(genxConfigured ? ['GenX transcription', 'Whisper (via GenX)', 'Deepgram Nova (via GenX)'] : []),
        ...(hasDeepgram ? ['Deepgram Nova 3 (direct)'] : []),
        ...(hasMinimax ? ['MiniMax STT'] : []),
        ...(hasHF ? ['HuggingFace Whisper', 'Custom STT endpoint'] : []),
        ...(hasOpenAI ? ['OpenAI Whisper (direct)'] : []),
      ],
      nextAction: hasSTTProvider ? null : 'Add GenX or Deepgram in Settings',
    },
    {
      name: 'Music Generation',
      status: 'not_implemented',
      blocker: 'Music generation is post-launch. Music providers (Suno, Udio) require API and legal approval before being enabled.',
      models: [],
      nextAction: 'Approve and configure a music provider before enabling music generation',
    },
    {
      name: 'Embeddings',
      status: genxConfigured || hasOpenAI || hasGemini || hasHF ? 'available' : 'blocked',
      blocker: genxConfigured || hasOpenAI || hasGemini || hasHF ? null : 'Configure GenX, OpenAI Direct, Gemini, or HuggingFace in Settings',
      models: [
        ...(genxConfigured ? ['GenX embeddings', 'text-embedding-3 (via GenX)'] : []),
        ...(hasOpenAI ? ['OpenAI text-embedding-3-small/large'] : []),
        ...(hasGemini ? ['Gemini embedding-001'] : []),
        ...(hasHF ? ['HuggingFace sentence-transformers', 'Custom embedding endpoint'] : []),
      ],
      nextAction: genxConfigured ? null : 'Add GenX or an embedding provider in Settings',
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
        : adultGate.status === 'needs_provider_test' || adultGate.status === 'configured_with_last_error'
        ? 'Run "Test provider" in Settings → Adult Mode'
        : 'Enable adult mode in Settings → Adult Mode',
    },
    {
      name: 'Web Crawler / Research',
      status: hasResearchProvider ? 'available' : 'blocked',
      blocker: hasResearchProvider ? null : 'Configure Firecrawl, GenX, Gemini, or OpenRouter in Settings',
      models: [
        ...(hasFirecrawl ? ['Firecrawl'] : []),
        ...(genxConfigured ? ['GenX (Gemini/GPT-4.1 research)'] : []),
        ...(hasGemini ? ['Gemini research / search grounding'] : []),
        ...(hasOpenRouter ? ['OpenRouter research models'] : []),
      ],
      nextAction: hasFirecrawl ? null : 'Add Firecrawl key in Settings for enhanced crawling',
    },
    {
      name: 'Memory',
      status: hasMem0 ? 'available' : 'not_implemented',
      blocker: hasMem0 ? null : 'Mem0 not configured. Memory uses built-in DB persistence by default.',
      models: [
        ...(hasMem0 ? ['Mem0 long-term memory'] : ['Built-in DB memory (limited)']),
      ],
      nextAction: hasMem0 ? null : 'Add Mem0 API key in Settings for enhanced persistent memory',
    },
    {
      name: 'Repo / GitHub',
      status: hasGitHub ? 'available' : 'blocked',
      blocker: hasGitHub ? null : 'GitHub Personal Access Token not configured',
      models: hasGitHub ? ['GitHub API'] : [],
      nextAction: hasGitHub ? null : 'Add GitHub Personal Access Token in Settings',
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

  // GenX is only a hard blocker if no direct providers can handle text/chat.
  // If direct primary providers are configured, GenX is optional.
  const hasDirectTextProvider = providers.some(
    p => p.configured && ['qwen', 'minimax', 'deepseek', 'gemini', 'huggingface', 'groq', 'together', 'openrouter', 'openai'].includes(p.key),
  )
  if (!genx.configured && !hasDirectTextProvider) {
    blockers.push('GenX API key not configured — add GENX_API_KEY in Settings')
  } else if (!genx.configured) {
    // GenX not configured but direct providers exist — informational only, not a hard blocker
  }
  if (genx.configured && !genx.available) blockers.push('GenX key configured but endpoint unreachable — check GENX_API_URL')

  const blockedCapabilities = capabilities.filter(c => c.status === 'blocked')
  for (const cap of blockedCapabilities) {
    if (cap.blocker) blockers.push(`${cap.name}: ${cap.blocker}`)
  }

  const localCore = getLocalCoreStatus()

  return {
    success: true,
    genx,
    providers,
    capabilities,
    adultGate,
    blockers,
    localCore,
  }
}
