import { getAllProviderRuntimes, type ActiveV1RuntimeProviderKey } from '@/lib/provider-runtime'

export type ApprovedProviderKey = ActiveV1RuntimeProviderKey

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
  provider: string
  id: string
  label: string
  costMode: CostMode
  capability: 'repo_workbench' | 'assistant' | 'image' | 'voice' | 'embedding' | 'research'
  taskLabel?: string
}

export const APPROVED_AI_PROVIDERS: readonly ApprovedProvider[] = getAllProviderRuntimes().map((provider, sortOrder) => ({
  key: provider.key as ApprovedProviderKey,
  displayName: provider.displayName,
  settingsLabel: provider.displayName,
  defaultBaseUrl: provider.baseUrl,
  envVars: [...provider.envAliases],
  providerType: 'ai' as const,
  notes: provider.adminNotes,
  sortOrder,
}))

export const APPROVED_PROVIDER_KEYS = new Set<ApprovedProviderKey>(
  APPROVED_AI_PROVIDERS.map((provider) => provider.key),
)

export const APPROVED_WORKBENCH_MODELS: readonly ApprovedModel[] = [
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', costMode: 'cheap', capability: 'repo_workbench' },
  { provider: 'together', id: 'meta-llama/Llama-3-70b-chat-hf', label: 'Llama 3 70B Chat', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'genx', id: 'gpt-5.4-mini', label: 'GenX Coding Balanced', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'mimo', id: 'mimo-v2.5', label: 'Xiaomi MiMo V2.5', costMode: 'balanced', capability: 'repo_workbench' },
  { provider: 'genx', id: 'gpt-5.3-codex', label: 'GenX Coding Best', costMode: 'premium', capability: 'repo_workbench' },
] as const

export const APPROVED_ASSISTANT_MODELS: readonly ApprovedModel[] = [
  { provider: 'genx', id: 'gpt-5.4-mini', label: 'GenX Assistant Route', costMode: 'balanced', capability: 'assistant' },
  { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3', costMode: 'cheap', capability: 'assistant' },
  { provider: 'mimo', id: 'mimo-v2.5', label: 'Xiaomi MiMo V2.5', costMode: 'balanced', capability: 'assistant' },
] as const

export const HUGGING_FACE_TASK_ROUTES: readonly ApprovedModel[] = [
  { provider: 'huggingface', id: 'task:text', label: 'Text and code task', costMode: 'cheap', capability: 'assistant', taskLabel: 'Text and code' },
  { provider: 'huggingface', id: 'task:image', label: 'Image generation task', costMode: 'cheap', capability: 'image', taskLabel: 'Image generation' },
  { provider: 'huggingface', id: 'task:speech-to-text', label: 'Speech-to-text task', costMode: 'cheap', capability: 'voice', taskLabel: 'Speech to text' },
  { provider: 'huggingface', id: 'task:text-to-speech', label: 'Text-to-speech task', costMode: 'cheap', capability: 'voice', taskLabel: 'Text to speech' },
  { provider: 'huggingface', id: 'task:embeddings', label: 'Embeddings task', costMode: 'cheap', capability: 'embedding', taskLabel: 'Embeddings' },
] as const

export function isApprovedAIProvider(provider: string): provider is ApprovedProviderKey {
  return APPROVED_PROVIDER_KEYS.has(provider as ApprovedProviderKey)
}

export function providerLabel(provider: string): string {
  return APPROVED_AI_PROVIDERS.find((entry) => entry.key === provider)?.displayName ?? provider
}
