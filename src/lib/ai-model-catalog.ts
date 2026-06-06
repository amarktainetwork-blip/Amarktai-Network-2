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
  replicate: [
    model('replicate', 'task:image', 'Replicate Image', 'Replicate', ['image'], ['vision'], 'medium', 'Asynchronous image specialist route.'),
    model('replicate', 'task:video', 'Replicate Video', 'Replicate', ['video'], ['vision'], 'premium', 'Asynchronous video specialist route.'),
    model('replicate', 'task:audio', 'Replicate Audio', 'Replicate', ['music', 'voice_tts', 'voice_stt'], ['chat'], 'medium', 'Audio and music specialist route.'),
  ],
  fal: [
    model('fal', 'task:image', 'Fal Image', 'Fal', ['image'], ['vision'], 'medium', 'Asynchronous image specialist route.'),
    model('fal', 'task:video', 'Fal Video', 'Fal', ['video'], ['vision'], 'premium', 'Asynchronous video specialist route.'),
    model('fal', 'task:audio', 'Fal Audio', 'Fal', ['music', 'voice_tts'], ['chat'], 'medium', 'Audio and avatar specialist route.'),
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

export async function getProviderModelCatalog(provider: string): Promise<ProviderModelCatalog> {
  if (!isApprovedAIProvider(provider)) {
    throw new Error(`Provider "${provider}" is not approved for dashboard model routing.`)
  }

  const providerDef = APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)!
  const models = PROVIDER_MODELS[provider] ?? []

  return {
    provider,
    displayName: providerDef.displayName,
    configured: await configured(provider),
    governanceStatus: 'approved',
    supportsCustomModelIds: false,
    supportsLiveDiscovery: provider === 'genx',
    liveDiscoveryStatus: provider === 'genx' ? 'not_attempted' : 'not_supported',
    models,
    recommendedDefaults: recommendedDefaults(provider),
    notes: [providerDef.notes],
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
