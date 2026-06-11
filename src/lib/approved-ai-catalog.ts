import {
  AI_PROVIDER_MESH,
  isApprovedDirectProvider,
  type ApprovedDirectProviderId,
} from '@/lib/provider-mesh'
import { UNIVERSAL_MODEL_ROUTES, type UniversalModelRoute } from '@/lib/universal-model-catalog'

export type ApprovedProviderKey = ApprovedDirectProviderId
export type CostMode = 'cheap' | 'balanced' | 'premium'

export interface ApprovedProvider {
  key: ApprovedProviderKey
  displayName: string
  settingsLabel: string
  defaultBaseUrl: string
  envVars: string[]
  providerType: 'ai'
  notes: string
  sortOrder: number
}

export interface ApprovedModel {
  provider: ApprovedProviderKey
  id: string
  label: string
  costMode: CostMode
  capability: 'repo_workbench' | 'assistant' | 'image' | 'voice' | 'embedding' | 'research'
  taskLabel?: string
}

export const APPROVED_AI_PROVIDERS: readonly ApprovedProvider[] = AI_PROVIDER_MESH.map((provider, sortOrder) => ({
  key: provider.id as ApprovedProviderKey,
  displayName: provider.displayName,
  settingsLabel: provider.displayName,
  defaultBaseUrl: provider.baseUrl,
  envVars: [...provider.envAliases],
  providerType: 'ai',
  notes: provider.id === 'genx'
    ? 'Gateway for routed model labels across text, code, media, voice, files, and jobs.'
    : 'Approved direct provider defined by provider-mesh.ts.',
  sortOrder,
}))

export const APPROVED_PROVIDER_KEYS = new Set<ApprovedProviderKey>(
  APPROVED_AI_PROVIDERS.map((provider) => provider.key),
)

export const APPROVED_WORKBENCH_MODELS: readonly ApprovedModel[] = UNIVERSAL_MODEL_ROUTES
  .filter((model) => model.recommendedFor?.includes('repo_workbench'))
  .map((model) => approvedModel(model, 'repo_workbench'))

export const APPROVED_ASSISTANT_MODELS: readonly ApprovedModel[] = UNIVERSAL_MODEL_ROUTES
  .filter((model) => model.recommendedFor?.includes('assistant'))
  .map((model) => approvedModel(model, 'assistant'))

export const HUGGING_FACE_TASK_ROUTES: readonly ApprovedModel[] = UNIVERSAL_MODEL_ROUTES
  .filter((model) => model.provider === 'huggingface' && model.taskBased)
  .map((model) => approvedModel(model, capabilityFor(model), model.displayName))

function approvedModel(
  model: UniversalModelRoute,
  capability: ApprovedModel['capability'],
  taskLabel?: string,
): ApprovedModel {
  return {
    provider: model.provider,
    id: model.modelId,
    label: model.displayName,
    costMode: costMode(model.costTier),
    capability,
    taskLabel,
  }
}

function capabilityFor(model: UniversalModelRoute): ApprovedModel['capability'] {
  if (model.capabilities.includes('image') || model.capabilities.includes('video')) return 'image'
  if (model.capabilities.includes('voice/TTS') || model.capabilities.includes('STT')) return 'voice'
  if (model.capabilities.includes('embeddings/moderation')) return 'embedding'
  return 'assistant'
}

function costMode(costTier: string): CostMode {
  if (costTier === 'premium' || costTier === 'high') return 'premium'
  if (costTier === 'medium') return 'balanced'
  return 'cheap'
}

export function isApprovedAIProvider(provider: string): provider is ApprovedProviderKey {
  return isApprovedDirectProvider(provider)
}

export function providerLabel(provider: string): string {
  return APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)?.displayName ?? provider
}
