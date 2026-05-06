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
  minimax: [
    model('minimax', 'MiniMax-M2.7', 'MiniMax M2.7', 'MiniMax/Mimo', ['text'], ['chat', 'reasoning', 'coding'], 'medium', 'Primary MiniMax/Mimo route.'),
    model('minimax', 'MiniMax-M2.7-highspeed', 'MiniMax M2.7 Highspeed', 'MiniMax/Mimo', ['text'], ['chat', 'coding'], 'low', 'Fast MiniMax/Mimo route.'),
    model('minimax', 'task:voice-tts', 'MiniMax/Mimo TTS', 'MiniMax/Mimo', ['voice_tts'], ['chat'], 'low', 'Voice playback route.'),
    model('minimax', 'task:voice-stt', 'MiniMax/Mimo STT', 'MiniMax/Mimo', ['voice_stt'], ['chat'], 'low', 'Speech-to-text route.'),
  ],
  groq: [
    model('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'Groq', ['text'], ['chat', 'reasoning', 'coding'], 'low', 'Fast workbench and assistant route.'),
  ],
  together: [
    model('together', 'meta-llama/Llama-3-70b-chat-hf', 'Llama 3 70B Chat', 'Together AI', ['text'], ['chat', 'reasoning', 'coding'], 'low', 'Open model route for repo tasks.'),
    model('together', 'task:image', 'Together Image Route', 'Together AI', ['image'], ['vision'], 'medium', 'Image route when the app package allows it.'),
  ],
  openai: [
    model('openai', 'gpt-4o', 'GPT-4o', 'OpenAI', ['multimodal', 'text'], ['chat', 'reasoning', 'coding', 'vision'], 'premium', 'Premium workbench and assistant route.'),
    model('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', ['multimodal', 'text'], ['chat', 'coding'], 'low', 'Fast OpenAI route.'),
    model('openai', 'task:tts', 'OpenAI TTS', 'OpenAI', ['voice_tts'], ['chat'], 'medium', 'Configured text-to-speech route.'),
    model('openai', 'task:moderation', 'OpenAI Moderation', 'OpenAI', ['text'], ['chat'], 'low', 'Moderation route.'),
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
  const models = PROVIDER_MODELS[provider]

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
