import { APPROVED_AI_PROVIDERS, isApprovedAIProvider, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
import { getProviderKey } from '@/lib/provider-config'
import {
  UNIVERSAL_MODEL_ROUTES,
  type UniversalCapabilityGroup,
  type UniversalModelRoute,
} from '@/lib/universal-model-catalog'
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

export const STATIC_PROVIDER_MODELS: Record<string, ProviderModelOption[]> = Object.fromEntries(
  APPROVED_AI_PROVIDERS.map((provider) => [
    provider.key,
    UNIVERSAL_MODEL_ROUTES
      .filter((model) => model.provider === provider.key)
      .map(toProviderModelOption),
  ]),
)

export async function getProviderModelCatalog(provider: string): Promise<ProviderModelCatalog> {
  if (!isApprovedAIProvider(provider)) {
    throw new Error(`Provider "${provider}" is not approved for dashboard model routing.`)
  }
  const definition = APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)!
  return {
    provider,
    displayName: definition.displayName,
    configured: Boolean(await getProviderKey(provider)),
    governanceStatus: 'approved',
    supportsCustomModelIds: false,
    supportsLiveDiscovery: provider === 'genx',
    liveDiscoveryStatus: provider === 'genx' ? 'not_attempted' : 'not_supported',
    models: STATIC_PROVIDER_MODELS[provider] ?? [],
    recommendedDefaults: recommendedDefaults(provider),
    notes: [definition.notes, 'Derived from universal-model-catalog.ts.'],
  }
}

export async function getAllProviderModelCatalogs(): Promise<ProviderModelCatalog[]> {
  return Promise.all(APPROVED_AI_PROVIDERS.map((provider) => getProviderModelCatalog(provider.key)))
}

function toProviderModelOption(model: UniversalModelRoute): ProviderModelOption {
  return {
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.displayName,
    family: model.family,
    modalities: modalities(model.capabilities),
    roles: roles(model.capabilities),
    costTier: model.costTier,
    contextWindow: model.contextWindow,
    source: 'static',
    enabled: model.enabled,
    notes: 'Canonical model route.',
  }
}

function modalities(capabilities: UniversalCapabilityGroup[]): ModelModality[] {
  const values = new Set<ModelModality>()
  if (capabilities.some((value) => ['chat', 'coding', 'reasoning'].includes(value))) values.add('text')
  if (capabilities.includes('image')) values.add('image')
  if (capabilities.includes('video')) values.add('video')
  if (capabilities.includes('voice/TTS')) values.add('voice_tts')
  if (capabilities.includes('STT')) values.add('voice_stt')
  if (capabilities.includes('music/audio')) values.add('music')
  if (capabilities.includes('embeddings/moderation')) values.add('embedding')
  if (values.has('text') && (values.has('image') || values.has('video'))) values.add('multimodal')
  return [...values]
}

function roles(capabilities: UniversalCapabilityGroup[]): ModelRole[] {
  const values = new Set<ModelRole>()
  if (capabilities.includes('chat')) values.add('chat')
  if (capabilities.includes('coding')) values.add('coding')
  if (capabilities.includes('reasoning')) values.add('reasoning')
  if (capabilities.includes('image')) values.add('vision')
  if (capabilities.includes('voice/TTS')) values.add('tts')
  if (capabilities.includes('embeddings/moderation')) values.add('embeddings')
  if (values.size === 0) values.add('creative')
  return [...values]
}

function recommendedDefaults(provider: ApprovedProviderKey): Record<string, string> {
  const models = UNIVERSAL_MODEL_ROUTES.filter((model) => model.provider === provider)
  const workbench = models.find((model) => model.recommendedFor?.includes('repo_workbench'))
  const assistant = models.find((model) => model.recommendedFor?.includes('assistant'))
  return {
    ...(workbench ? { workbench: workbench.modelId } : {}),
    ...(assistant ? { assistant: assistant.modelId } : {}),
  }
}
