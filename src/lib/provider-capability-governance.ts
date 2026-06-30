import { STATIC_PROVIDER_MODELS } from '@/lib/ai-model-catalog'
import { PROVIDER_MESH, normalizeProviderMeshId, type ProviderMeshId } from '@/lib/provider-mesh'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import {
  FUTURE_WORKBENCH_PROVIDERS,
  isActiveV1RuntimeProvider,
  isFutureWorkbenchProvider,
} from '@/lib/provider-runtime'

export type RootWorkspaceIdentity = {
  appSlug: 'amarktai-network'
  type: 'root_admin_app'
  access: 'full'
  providers: 'approved_configured_providers'
  models: 'approved_configured_models'
  tools: 'approved_configured_tools'
  agents: 'backend_orchestration_only'
  adultPolicy: 'settings_controlled'
  memory: 'root_admin_memory'
  workbench: 'full_access'
  studio: 'full_access'
  operations: 'full_access'
  message: string
}

export const ROOT_WORKSPACE: RootWorkspaceIdentity = {
  appSlug: 'amarktai-network',
  type: 'root_admin_app',
  access: 'full',
  providers: 'approved_configured_providers',
  models: 'approved_configured_models',
  tools: 'approved_configured_tools',
  agents: 'backend_orchestration_only',
  adultPolicy: 'settings_controlled',
  memory: 'root_admin_memory',
  workbench: 'full_access',
  studio: 'full_access',
  operations: 'full_access',
  message: 'This root workspace uses only providers and tools approved by the provider mesh.',
}

export const EXTERNAL_APP_ONBOARDING_LABEL = 'Add external managed app'
export const LIVE_GENX_MODEL_COUNT = 8

export type GovernedProviderKey = ProviderMeshId
export type GovernedCapability =
  | 'chat'
  | 'reasoning'
  | 'coding'
  | 'repo_audit'
  | 'research'
  | 'crawling'
  | 'browser_qa'
  | 'image_generation'
  | 'image_editing'
  | 'image_to_video'
  | 'video_generation'
  | 'music_generation'
  | 'song_generation'
  | 'lyrics_generation'
  | 'instrumental_music'
  | 'tts'
  | 'stt'
  | 'voice_selection'
  | 'voice_cloning'
  | 'avatar_video'
  | 'embeddings'
  | 'rerank'
  | 'rag'
  | 'moderation'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'audio'
  | 'app_memory'
  | 'artifacts'
  | 'operations'

export type CapabilityReadiness =
  | 'production_ready'
  | 'partial'
  | 'available_not_wired'
  | 'not_verified'
  | 'blocked'
  | 'unsupported'
export type ExecutionMode = 'sync' | 'stream' | 'async_job' | 'internal'

export type GovernedModel = {
  provider: GovernedProviderKey
  providerLabel: string
  modelId: string
  label: string
  capabilities: GovernedCapability[]
  status: CapabilityReadiness
  route?: string
  requiredEnv: string[]
  execution: ExecutionMode
  polling: boolean
  artifacts: boolean
  approved: boolean
  routePresent: boolean
  notes: string
}

export type ProviderGovernance = {
  provider: GovernedProviderKey
  label: string
  approved: boolean
  routePresent: boolean
  requiredEnv: string[]
  unlocks: string
  liveTestRequired: boolean
  liveTestStatus: 'connected' | 'configured' | 'needs_key' | 'needs_live_test' | 'needs_test_route' | 'unsupported'
  notes: string
}

export type CapabilityGovernance = {
  capability: GovernedCapability
  label: string
  primaryProvider: GovernedProviderKey | null
  fallbackProviders: GovernedProviderKey[]
  route: string | null
  routeExists: boolean
  requiredEnv: string[]
  execution: ExecutionMode
  polling: boolean
  artifacts: boolean
  dashboardVisible: boolean
  status: CapabilityReadiness
  blocker?: string
  notes: string
}

export type CapabilityValidationInput = {
  appSlug?: string
  provider?: string | null
  modelId?: string | null
  capability: string
  adultPolicyAllows?: boolean
  productionMode?: boolean
  budgetAllows?: boolean
  requireConfiguredKey?: boolean
}

export type CapabilityValidationResult = {
  allowed: boolean
  capability: GovernedCapability | null
  provider?: GovernedProviderKey
  model?: GovernedModel
  reason: string
  blockers: string[]
}

export const ROUTE_PRESENT_NOT_APPROVED_PROVIDERS: ProviderGovernance[] = []

export const PROVIDER_GOVERNANCE: ProviderGovernance[] = PROVIDER_MESH.map((node) => ({
  provider: node.id,
  label: node.displayName,
  approved: true,
  routePresent: true,
  requiredEnv: [...node.envAliases],
  unlocks: node.capabilities.join(', '),
  liveTestRequired: true,
  liveTestStatus: node.envAliases.length ? 'needs_live_test' as const : 'configured' as const,
  notes: 'Compatibility metadata generated from provider-mesh.ts.',
})).filter((entry) =>
  isActiveV1RuntimeProvider(entry.provider) ||
  (FUTURE_WORKBENCH_PROVIDERS as readonly string[]).includes(entry.provider),
)

function roleCapabilities(roles: readonly string[], modalities: readonly string[]): GovernedCapability[] {
  const capabilities = new Set<GovernedCapability>()
  if (roles.includes('chat')) capabilities.add('chat')
  if (roles.includes('reasoning')) capabilities.add('reasoning')
  if (roles.includes('coding')) capabilities.add('coding')
  if (modalities.includes('image')) capabilities.add('image_generation')
  if (modalities.includes('video')) capabilities.add('video_generation')
  if (modalities.includes('voice_tts')) capabilities.add('tts')
  if (modalities.includes('voice_stt')) capabilities.add('stt')
  if (modalities.includes('music')) capabilities.add('music_generation')
  if (modalities.includes('embedding')) capabilities.add('embeddings')
  if (modalities.includes('embedding')) capabilities.add('rag')
  if (modalities.includes('rerank')) {
    capabilities.add('rerank')
    capabilities.add('rag')
  }
  return [...capabilities]
}

const STATIC_GOVERNED_MODELS: GovernedModel[] = Object.entries(STATIC_PROVIDER_MODELS).flatMap(
  ([provider, models]) => models.map((model) => {
    const node = PROVIDER_MESH.find((entry) => entry.id === provider)!
    const productionEligible = isActiveV1RuntimeProvider(provider)
    return {
      provider: provider as GovernedProviderKey,
      providerLabel: node.displayName,
      modelId: model.modelId,
      label: model.displayName,
      capabilities: roleCapabilities(model.roles, model.modalities),
      status: productionEligible ? 'production_ready' as const : 'blocked' as const,
      route: node.testRoute,
      requiredEnv: [...node.envAliases],
      execution: node.asyncJobs ? 'async_job' as const : 'sync' as const,
      polling: node.asyncJobs,
      artifacts: node.artifactHandling !== 'none',
      approved: productionEligible,
      routePresent: productionEligible,
      notes: isFutureWorkbenchProvider(provider)
        ? 'MiMo Token Plan is reserved for developer/repo/tooling or V2; V1 production backend routing is disabled.'
        : model.notes ?? 'Approved provider-mesh model.',
    }
  }),
)

const MEDIA_GOVERNED_MODELS: GovernedModel[] = Object.values(MEDIA_CAPABILITY_ROUTES).flatMap((route) =>
  route.providers.filter((entry) => isActiveV1RuntimeProvider(entry.provider)).map((entry) => {
    const node = PROVIDER_MESH.find((provider) => provider.id === entry.provider)!
    return {
      provider: entry.provider,
      providerLabel: node.displayName,
      modelId: entry.model,
      label: entry.model,
      capabilities: [route.capability],
      status: 'production_ready' as const,
      route: route.route,
      requiredEnv: [...node.envAliases],
      execution: route.execution === 'upload' ? 'sync' as const : route.execution,
      polling: route.execution === 'async_job',
      artifacts: true,
      approved: true,
      routePresent: true,
      notes: `Canonical ${route.capability} execution route.`,
    }
  }),
)

export const GOVERNED_MODELS: GovernedModel[] = [...STATIC_GOVERNED_MODELS]
for (const mediaModel of MEDIA_GOVERNED_MODELS) {
  const existing = GOVERNED_MODELS.find((model) =>
    model.provider === mediaModel.provider && model.modelId === mediaModel.modelId,
  )
  if (existing) {
    existing.capabilities = [...new Set([...existing.capabilities, ...mediaModel.capabilities])]
    existing.route = mediaModel.route
    existing.execution = mediaModel.execution
    existing.polling = mediaModel.polling
    existing.artifacts = true
  } else {
    GOVERNED_MODELS.push(mediaModel)
  }
}

const CAPABILITY_ALIASES: Record<string, GovernedCapability> = {
  image: 'image_generation',
  video: 'video_generation',
  voice_tts: 'tts',
  voice_stt: 'stt',
  song: 'song_generation',
  music: 'music_generation',
  code: 'coding',
  avatar: 'avatar_video',
}

export function normalizeGovernedCapability(capability: string): GovernedCapability | null {
  const normalized = capability.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  const candidate = CAPABILITY_ALIASES[normalized] ?? normalized
  const known = new Set<GovernedCapability>([
    'chat', 'reasoning', 'coding', 'repo_audit', 'research', 'crawling', 'browser_qa',
    'image_generation', 'image_editing', 'image_to_video', 'video_generation',
    'music_generation', 'song_generation', 'lyrics_generation', 'instrumental_music',
    'tts', 'stt', 'voice_selection', 'voice_cloning', 'avatar_video', 'embeddings', 'rerank', 'rag', 'moderation',
    'adult_text', 'adult_image', 'adult_video', 'adult_voice', 'app_memory', 'artifacts', 'operations',
    'audio',
  ])
  return known.has(candidate as GovernedCapability) ? candidate as GovernedCapability : null
}

export function isRootWorkspaceAppSlug(appSlug?: string | null): boolean {
  return appSlug === ROOT_WORKSPACE.appSlug || appSlug === 'amarktai'
}

export function isExternalManagedAppSlug(appSlug?: string | null): boolean {
  return Boolean(appSlug && !isRootWorkspaceAppSlug(appSlug))
}

export function isTogetherAdultFallbackEnabled(capability: string): boolean {
  if (!String(capability).startsWith('adult_')) return false
  if (!['adult_text', 'adult_image'].includes(capability)) return false
  if (process.env.TOGETHER_ADULT_FALLBACK_ENABLED !== 'true') return false
  const modelEnv = capability === 'adult_image'
    ? process.env.TOGETHER_ADULT_IMAGE_MODEL
    : capability === 'adult_video'
      ? process.env.TOGETHER_ADULT_VIDEO_MODEL
      : capability === 'adult_voice'
        ? process.env.TOGETHER_ADULT_VOICE_MODEL
        : process.env.TOGETHER_ADULT_TEXT_MODEL
  return Boolean(modelEnv?.trim())
}

export function getModelsForCapability(
  capability: GovernedCapability,
  options: { approvedOnly?: boolean; routePresentOnly?: boolean; provider?: string } = {},
): GovernedModel[] {
  const providerId = options.provider ? normalizeProviderMeshId(options.provider) : null
  return GOVERNED_MODELS.filter((model) =>
    model.capabilities.includes(capability)
    && (!options.provider || model.provider === providerId)
    && (!options.approvedOnly || model.approved)
    && (!options.routePresentOnly || model.routePresent),
  )
}

export function getCapabilityGovernance(capability: GovernedCapability): CapabilityGovernance {
  const models = getModelsForCapability(capability, { approvedOnly: true, routePresentOnly: true })
  const providers = [...new Set(models.map((model) => model.provider))]
  return {
    capability,
    label: capability.replaceAll('_', ' '),
    primaryProvider: providers[0] ?? null,
    fallbackProviders: providers.slice(1),
    route: models[0]?.route ?? null,
    routeExists: models.length > 0,
    requiredEnv: models[0]?.requiredEnv ?? [],
    execution: models[0]?.execution ?? 'internal',
    polling: models.some((model) => model.polling),
    artifacts: models.some((model) => model.artifacts),
    dashboardVisible: false,
    status: models.length ? 'production_ready' : 'unsupported',
    blocker: models.length ? undefined : 'No approved provider-mesh model is wired for this capability.',
    notes: 'Generated from approved provider-mesh model metadata.',
  }
}

export function getCapabilityGovernanceMatrix() {
  const capabilities = [...new Set(GOVERNED_MODELS.flatMap((model) => model.capabilities))]
  const governedCapabilities = capabilities.map(getCapabilityGovernance)
  return {
    rootWorkspace: ROOT_WORKSPACE,
    providers: PROVIDER_GOVERNANCE,
    models: GOVERNED_MODELS,
    capabilities: governedCapabilities,
    blockedCapabilities: governedCapabilities.filter((capability) => capability.status === 'blocked' || capability.status === 'unsupported'),
    underusedCapabilities: GOVERNED_MODELS.filter((model) => model.status === 'available_not_wired'),
    routePresentNotApprovedProviders: ROUTE_PRESENT_NOT_APPROVED_PROVIDERS,
  }
}

export function getWorkbenchGovernanceModels(): GovernedModel[] {
  return GOVERNED_MODELS.filter((model) =>
    model.capabilities.some((capability) => capability === 'coding' || capability === 'reasoning'),
  )
}

export function validateCapabilitySelection(input: CapabilityValidationInput): CapabilityValidationResult {
  const capability = normalizeGovernedCapability(input.capability)
  if (!capability) return { allowed: false, capability: null, reason: 'Unknown capability.', blockers: ['unknown_capability'] }
  if ((capability.startsWith('adult_')) && !input.adultPolicyAllows) {
    return { allowed: false, capability, reason: 'Adult policy does not allow this capability.', blockers: ['adult_policy'] }
  }
  const providerId = input.provider ? normalizeProviderMeshId(input.provider) : null
  const provider = providerId ? PROVIDER_MESH.find((node) => node.id === providerId) : null
  if (input.provider && !providerId) {
    return { allowed: false, capability, reason: 'Provider is not approved by the provider mesh.', blockers: ['provider_not_approved'] }
  }
  if (providerId === 'mimo') {
    return {
      allowed: false,
      capability,
      reason: 'MiMo Token Plan is reserved for developer/repo/tooling or V2; V1 production backend routing is disabled.',
      blockers: ['provider_backend_disabled'],
    }
  }
  // GenX must never handle adult capabilities — HF dedicated endpoints are the only valid path.
  if (capability.startsWith('adult_') && providerId === 'genx') {
    return {
      allowed: false,
      capability,
      reason: 'GenX is not permitted for adult capabilities.',
      blockers: ['adult_provider_forbidden'],
    }
  }
  if (capability.startsWith('adult_')) {
    return {
      allowed: false,
      capability,
      reason: 'Adult capability is deferred from active V1 runtime.',
      blockers: ['adult_deferred'],
    }
  }
  if (capability.startsWith('adult_') && providerId === 'together' && !isTogetherAdultFallbackEnabled(capability)) {
    return {
      allowed: false,
      capability,
      reason: capability === 'adult_video' || capability === 'adult_voice'
        ? `${capability} requires a dedicated Hugging Face endpoint/model.`
        : `Together adult fallback is blocked until TOGETHER_ADULT_FALLBACK_ENABLED=true and an approved ${capability} model env is configured.`,
      blockers: ['adult_fallback_not_configured'],
    }
  }
  if (capability.startsWith('adult_') && providerId === 'together' && isTogetherAdultFallbackEnabled(capability)) {
    return {
      allowed: true,
      capability,
      provider: 'together',
      reason: `Together fallback is explicitly configured for ${capability}.`,
      blockers: [],
    }
  }
  const models = getModelsForCapability(capability, { approvedOnly: true, routePresentOnly: true })
  const model = input.modelId
    ? models.find((entry) => entry.modelId === input.modelId && (!provider || entry.provider === provider.id))
    : models.find((entry) => !provider || entry.provider === provider.id)
  if (!model) {
    return { allowed: false, capability, reason: 'No approved wired model supports this capability.', blockers: ['missing_route'] }
  }
  return {
    allowed: true,
    capability,
    provider: model.provider,
    model,
    reason: `${model.providerLabel} ${model.modelId} is approved for ${capability}.`,
    blockers: [],
  }
}
