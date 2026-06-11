import { PROVIDER_MESH } from '@/lib/provider-mesh'

export type ProviderGovernanceStatus =
  | 'core'
  | 'active_optional'
  | 'advanced_optional'
  | 'deprecated'
  | 'proposed'
export type ProviderSetupGroup = 'primary' | 'specialist' | 'advanced' | 'hidden' | 'backlog'
export type ProviderCapability =
  | 'gateway'
  | 'chat'
  | 'creative'
  | 'reasoning'
  | 'coding'
  | 'image_generation'
  | 'video_generation'
  | 'voice_tts'
  | 'voice_stt'
  | 'music_generation'
  | 'embeddings'
  | 'reranking'
  | 'research'
  | 'crawler'
  | 'adult_text'
  | 'adult_image'
  | 'deployment'
  | 'memory'
  | 'repo'

export interface ProviderGovernanceEntry {
  key: string
  displayName: string
  integrationKey: string
  envVar: string
  envVarAliases?: string[]
  status: ProviderGovernanceStatus
  setupGroup: ProviderSetupGroup
  reason: string
  capabilities: ProviderCapability[]
  coveredByGenX: boolean
  wired: boolean
  showInPrimarySetup: boolean
  defaultCostRole: 'gateway' | 'free_first' | 'cheap' | 'balanced' | 'premium' | 'specialist' | 'ops' | 'deprecated'
  notes?: string
}

function governanceCapabilities(capabilities: readonly string[]): ProviderCapability[] {
  const mapped = new Set<ProviderCapability>()
  for (const capability of capabilities) {
    if (capability === 'text' || capability === 'streaming_text') mapped.add('chat')
    if (capability === 'reasoning') mapped.add('reasoning')
    if (capability === 'code') mapped.add('coding')
    if (capability === 'image') mapped.add('image_generation')
    if (capability === 'video' || capability === 'image_to_video') mapped.add('video_generation')
    if (capability === 'tts') mapped.add('voice_tts')
    if (capability === 'stt') mapped.add('voice_stt')
    if (capability === 'music' || capability === 'audio') mapped.add('music_generation')
    if (capability === 'embeddings') mapped.add('embeddings')
    if (capability === 'rerank') mapped.add('reranking')
    if (capability === 'crawl' || capability === 'render') mapped.add('crawler')
    if (capability === 'repo' || capability === 'pull_request') mapped.add('repo')
  }
  return [...mapped]
}

export const AI_PROVIDER_GOVERNANCE: readonly ProviderGovernanceEntry[] = PROVIDER_MESH.filter((node) => node.kind === 'provider').map((node) => ({
  key: node.id,
  displayName: node.displayName,
  integrationKey: node.id,
  envVar: node.envAliases[0] ?? '',
  envVarAliases: [...node.envAliases],
  status: node.id === 'genx' ? 'core' : node.optional ? 'active_optional' : 'advanced_optional',
  setupGroup: 'primary',
  reason: 'Approved by the canonical provider mesh.',
  capabilities: governanceCapabilities(node.capabilities),
  coveredByGenX: false,
  wired: true,
  showInPrimarySetup: true,
  defaultCostRole: node.id === 'genx' ? 'gateway' : 'specialist',
  notes: node.id === 'genx'
    ? 'Gateway infrastructure for routed model labels; provider identity comes from provider-mesh.ts.'
    : 'Compatibility metadata generated from provider-mesh.ts.',
}))

export const PROPOSED_PROVIDER_BACKLOG: readonly ProviderGovernanceEntry[] = []

export function getProviderEnvMap(): Record<string, string> {
  return Object.fromEntries(AI_PROVIDER_GOVERNANCE.map((entry) => [entry.key, entry.envVar]))
}

export function getRuntimeProviderGovernance(): ProviderGovernanceEntry[] {
  return [...AI_PROVIDER_GOVERNANCE]
}

export function getPrimarySetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'primary')
}

export function getSpecialistSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'specialist')
}

export function getAdvancedSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'advanced')
}

export function getHiddenProviders(): ProviderGovernanceEntry[] {
  return []
}

export function getBacklogProviders(): ProviderGovernanceEntry[] {
  return []
}

export function getProviderGovernanceByKey(key: string): ProviderGovernanceEntry | undefined {
  return AI_PROVIDER_GOVERNANCE.find((entry) => entry.key === key || entry.integrationKey === key)
}

export function getWiredProviderKeys(): Set<string> {
  return new Set(AI_PROVIDER_GOVERNANCE.filter((entry) => entry.wired).map((entry) => entry.key))
}

export function getGenXCoveredProviderKeys(): Set<string> {
  return new Set()
}

export function getAdultSpecialistProviderKeys(): Set<string> {
  return new Set(['genx', 'huggingface', 'together'])
}
