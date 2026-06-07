import {
  APPROVED_AI_PROVIDERS,
  APPROVED_ASSISTANT_MODELS,
  APPROVED_WORKBENCH_MODELS,
  HUGGING_FACE_TASK_ROUTES,
  isApprovedAIProvider,
  type ApprovedProviderKey,
} from '@/lib/approved-ai-catalog'
import { getProviderKey } from '@/lib/provider-config'
import type { CostTier, ModelRole } from '@/lib/model-registry'

export type ModelModality = 'text' | 'image' | 'video' | 'voice_tts' | 'voice_stt' | 'music' | 'embedding' | 'rerank' | 'multimodal'

export interface ProviderModelOption {
  provider: string
  modelId: string
  displayName: string
  family: string
  modalities: ModelModality[]
  roles: ModelRole[]
  costTier: CostTier | 'unknown'
  contextWindow?: number
  source: 'static' | 'genx_live' | 'provider_live' | 'custom_supported'
  enabled: boolean
  notes?: string
}

export interface ProviderModelCatalog {
  provider: string
  displayName: string
  configured: boolean
  governanceStatus: string | null
  supportsCustomModelIds: boolean
  supportsLiveDiscovery: boolean
  liveDiscoveryStatus: 'not_attempted' | 'success' | 'failed' | 'not_supported'
  models: ProviderModelOption[]
  recommendedDefaults: Record<string, string>
  notes: string[]
}

const COST_TO_TIER: Record<string, CostTier> = {
  cheap: 'low',
  balanced: 'medium',
  premium: 'premium',
}

const PROVIDER_MODELS: Record<ApprovedProviderKey, ProviderModelOption[]> = {
  genx: [
    model('genx', 'auto:coding-balanced', 'GenX Coding Balanced', 'GenX', ['text'], ['coding', 'reasoning', 'agent_planning'], 'medium', 'Workbench planning and patch generation.'),
    model('genx', 'auto:coding-best', 'GenX Coding Best', 'GenX', ['text'], ['coding', 'reasoning', 'agent_planning'], 'premium', 'Complex repo changes and release reviews.'),
    model('genx', 'auto:assistant', 'GenX Assistant Route', 'GenX', ['text'], ['chat', 'reasoning'], 'medium', 'Dashboard and Workbench assistant route.'),
  ],
  huggingface: HUGGING_FACE_TASK_ROUTES.map((route) =>
    model('huggingface', route.id, route.label, 'Hugging Face Tasks', taskModality(route.capability), ['chat'], COST_TO_TIER[route.costMode], 'Task-based route.'),
  ),
  qwen: [
    model('qwen', 'qwen-turbo', 'Qwen Turbo', 'Qwen', ['text'], ['chat', 'coding'], 'low', 'Low-cost workbench route.'),
    model('qwen', 'qwen-plus', 'Qwen Plus', 'Qwen', ['text'], ['chat', 'reasoning', 'coding'], 'low', 'Balanced Qwen route.'),
    model('qwen', 'qwen-max', 'Qwen Max', 'Qwen', ['text'], ['chat', 'reasoning', 'coding'], 'medium', 'Higher quality Qwen route.'),
  ],
  mimo: [
    model('mimo', 'mimo-v2.5', 'Xiaomi MiMo V2.5', 'Xiaomi MiMo', ['multimodal', 'text'], ['chat', 'reasoning', 'coding', 'vision'], 'medium', 'OpenAI-compatible reasoning, coding, and multimodal route.'),
    model('mimo', 'mimo-v2.5-pro', 'Xiaomi MiMo V2.5 Pro', 'Xiaomi MiMo', ['multimodal', 'text'], ['chat', 'reasoning', 'coding', 'vision'], 'premium', 'Long-context reasoning and coding route.'),
    model('mimo', 'task:voice-tts', 'Xiaomi MiMo TTS', 'Xiaomi MiMo', ['voice_tts'], ['chat'], 'low', 'Speech synthesis route when enabled on the account.'),
    model('mimo', 'task:voice-stt', 'Xiaomi MiMo STT', 'Xiaomi MiMo', ['voice_stt'], ['chat'], 'low', 'Speech recognition route when enabled on the account.'),
  ],
  groq: [
    model('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'Groq', ['text'], ['chat', 'reasoning', 'coding'], 'low', 'Fast workbench and assistant route.'),
  ],
  together: [
    model('together', 'meta-llama/Llama-3-70b-chat-hf', 'Llama 3 70B Chat', 'Together AI', ['text'], ['chat', 'reasoning', 'coding'], 'low', 'Open model route for repo tasks.'),
    model('together', 'task:image', 'Together Image Route', 'Together AI', ['image'], ['vision'], 'medium', 'Image route when the app package allows it.'),
  ],
}

export const STATIC_PROVIDER_MODELS: Record<string, ProviderModelOption[]> = PROVIDER_MODELS

function model(
  provider: ApprovedProviderKey,
  modelId: string,
  displayName: string,
  family: string,
  modalities: ModelModality[],
  roles: ModelRole[],
  costTier: CostTier,
  notes?: string,
): ProviderModelOption {
  return {
    provider,
    modelId,
    displayName,
    family,
    modalities,
    roles,
    costTier,
    source: 'static',
    enabled: true,
    notes,
  }
}

function taskModality(capability: string): ModelModality[] {
  if (capability === 'image') return ['image']
  if (capability === 'voice') return ['voice_tts', 'voice_stt']
  if (capability === 'embedding') return ['embedding']
  return ['text']
}

async function configured(provider: ApprovedProviderKey) {
  const providerDef = APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)
  if (!providerDef) return false
  for (const envVar of providerDef.envVars) {
    const key = await getProviderKey(provider)
    if (key || process.env[envVar]?.trim()) return true
  }
  return false
}

const SAFE_LIVE_DISCOVERY_PROVIDERS = new Set<ApprovedProviderKey>([
  'genx',
  'groq',
  'qwen',
  'together',
  'huggingface',
])

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function openAiCompatibleModelsEndpoint(baseUrl: string): string {
  const base = trimTrailingSlash(baseUrl)
  if (base.endsWith('/v1')) return `${base}/models`
  return `${base}/v1/models`
}

function inferLiveModelRoles(provider: ApprovedProviderKey, modelId: string): ModelRole[] {
  const id = modelId.toLowerCase()
  if (/embed|bge|gte|e5/.test(id)) return []
  if (/whisper|speech-to-text|stt/.test(id)) return []
  if (/tts|text-to-speech|voice/.test(id)) return []
  if (/image|flux|sdxl|stable-diffusion|kolors/.test(id)) return ['vision']
  if (/video|wanx|sora|hunyuan|cogvideo|ltx/.test(id)) return ['vision']
  if (/coder|code|codestral/.test(id)) return ['chat', 'reasoning', 'coding']
  if (/reason|r1|qwq|deepseek/.test(id)) return ['chat', 'reasoning', 'coding']
  return ['chat', 'reasoning']
}

function inferLiveModelModalities(provider: ApprovedProviderKey, modelId: string): ModelModality[] {
  const id = modelId.toLowerCase()
  if (/embed|bge|gte|e5/.test(id)) return ['embedding']
  if (/whisper|speech-to-text|stt/.test(id)) return ['voice_stt']
  if (/tts|text-to-speech|voice/.test(id)) return ['voice_tts']
  if (/image|flux|sdxl|stable-diffusion|kolors/.test(id)) return ['image']
  if (/video|wanx|sora|hunyuan|cogvideo|ltx/.test(id)) return ['video']
  if (/vl|vision|omni|multimodal/.test(id)) return ['multimodal', 'text']
  return ['text']
}

function inferLiveModelCostTier(provider: ApprovedProviderKey, modelId: string): ProviderModelOption['costTier'] {
  const id = modelId.toLowerCase()
  if (/max|70b|72b|405b|large|pro|plus|premium|reason/.test(id)) return 'medium'
  if (/turbo|mini|small|8b|7b|cheap|fast/.test(id)) return 'low'
  return provider === 'huggingface' ? 'unknown' : 'low'
}

function liveModelOption(
  provider: ApprovedProviderKey,
  modelId: string,
  displayName: string,
): ProviderModelOption {
  const providerDef = APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)!
  return {
    provider,
    modelId,
    displayName,
    family: providerDef.displayName,
    modalities: inferLiveModelModalities(provider, modelId),
    roles: inferLiveModelRoles(provider, modelId),
    costTier: inferLiveModelCostTier(provider, modelId),
    source: 'provider_live',
    enabled: false,
    notes: 'Discovered from provider /models endpoint. Not auto-routed until approved in the static/governed catalog.',
  }
}

function mergeProviderModels(models: ProviderModelOption[]): ProviderModelOption[] {
  const byId = new Map<string, ProviderModelOption>()

  for (const model of models) {
    const key = `${model.provider}:${model.modelId}`
    const existing = byId.get(key)
    if (!existing) {
      byId.set(key, model)
      continue
    }

    byId.set(key, {
      ...existing,
      modalities: [...new Set([...existing.modalities, ...model.modalities])],
      roles: [...new Set([...existing.roles, ...model.roles])],
      // Preserve curated static routes as enabled/routed. Live rows only enrich metadata.
      enabled: existing.enabled || model.enabled,
      source: existing.source === 'static' ? existing.source : model.source,
      notes: existing.notes || model.notes,
    })
  }

  return [...byId.values()]
}

async function discoverOpenAiCompatibleProviderModels(
  provider: ApprovedProviderKey,
  providerDef: typeof APPROVED_AI_PROVIDERS[number],
): Promise<ProviderModelOption[]> {
  const apiKey = await getProviderKey(provider)
  if (!apiKey?.trim()) return []

  const endpoint = openAiCompatibleModelsEndpoint(providerDef.defaultBaseUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`${provider} /models HTTP ${res.status}`)
    }

    const data = await res.json().catch(() => ({})) as {
      data?: Array<{ id?: string; name?: string }>
      models?: Array<{ id?: string; name?: string }>
    }

    const rows = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.models)
        ? data.models
        : []

    return rows
      .map((row) => String(row.id || row.name || '').trim())
      .filter(Boolean)
      .slice(0, 500)
      .map((id) => liveModelOption(provider, id, id))
  } finally {
    clearTimeout(timeout)
  }
}

export async function getProviderModelCatalog(provider: string): Promise<ProviderModelCatalog> {
  if (!isApprovedAIProvider(provider)) {
    throw new Error(`Provider "${provider}" is not approved for dashboard model routing.`)
  }

  const providerKey = provider as ApprovedProviderKey
  const providerDef = APPROVED_AI_PROVIDERS.find((entry) => entry.key === providerKey)!
  const staticModels = PROVIDER_MODELS[providerKey] ?? []
  const isConfigured = await configured(providerKey)
  const supportsLiveDiscovery = SAFE_LIVE_DISCOVERY_PROVIDERS.has(providerKey)

  let liveDiscoveryStatus: ProviderModelCatalog['liveDiscoveryStatus'] = supportsLiveDiscovery ? 'not_attempted' : 'not_supported'
  let liveModels: ProviderModelOption[] = []
  const notes = [providerDef.notes]

  if (supportsLiveDiscovery && providerKey !== 'genx' && isConfigured) {
    try {
      liveModels = await discoverOpenAiCompatibleProviderModels(providerKey, providerDef)
      liveDiscoveryStatus = 'success'
      notes.push(`Live discovery found ${liveModels.length} provider models. Live-discovered models remain disabled until explicitly routed.`)
    } catch (err) {
      liveDiscoveryStatus = 'failed'
      notes.push(err instanceof Error ? err.message : 'Live discovery failed.')
    }
  }

  if (providerKey === 'genx') {
    liveDiscoveryStatus = 'not_attempted'
    notes.push('GenX live discovery is handled by the universal GenX catalog path.')
  }

  return {
    provider,
    displayName: providerDef.displayName,
    configured: isConfigured,
    governanceStatus: 'approved',
    supportsCustomModelIds: supportsLiveDiscovery,
    supportsLiveDiscovery,
    liveDiscoveryStatus,
    models: mergeProviderModels([...staticModels, ...liveModels]),
    recommendedDefaults: recommendedDefaults(providerKey),
    notes,
  }
}

export async function getAllProviderModelCatalogs(): Promise<ProviderModelCatalog[]> {
  return Promise.all(APPROVED_AI_PROVIDERS.map((provider) => getProviderModelCatalog(provider.key)))
}

function recommendedDefaults(provider: ApprovedProviderKey): Record<string, string> {
  const workbench = APPROVED_WORKBENCH_MODELS.find((modelEntry) => modelEntry.provider === provider)
  const assistant = APPROVED_ASSISTANT_MODELS.find((modelEntry) => modelEntry.provider === provider)
  return {
    ...(workbench ? { workbench: workbench.id } : {}),
    ...(assistant ? { assistant: assistant.id } : {}),
  }
}
