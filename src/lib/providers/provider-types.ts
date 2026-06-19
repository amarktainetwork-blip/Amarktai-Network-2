export const CANONICAL_PROVIDER_IDS = [
  'huggingface',
  'together',
  'groq',
  'genx',
  'qwen',
  'mimo',
] as const

export type ProviderId = typeof CANONICAL_PROVIDER_IDS[number]

export const CANONICAL_CAPABILITY_IDS = [
  'chat',
  'reasoning',
  'coding',
  'research',
  'image',
  'image_edit',
  'video',
  'image_to_video',
  'avatar',
  'music',
  'tts',
  'stt',
  'voice_clone',
  'ocr',
  'vision',
  'embeddings',
  'rerank',
  'translation',
  'documents',
  'agents',
  'adult_text',
  'adult_image',
  'adult_video',
] as const

export type CapabilityId = typeof CANONICAL_CAPABILITY_IDS[number]

export const ROUTING_PROFILE_IDS = [
  'cheap',
  'balanced',
  'premium',
  'pinned',
  'mixed',
  'best_available',
  'custom',
] as const

export type RoutingProfileId = typeof ROUTING_PROFILE_IDS[number]
export type DiscoveryStatus = 'ready' | 'not_configured' | 'failed'
export type CapabilityEvidence = 'provider_contract' | 'model_metadata' | 'policy_gate'
export type ModelDiscoverySource = 'live_authenticated' | 'public_catalog' | 'static_fallback' | 'catalog_derived'
export type HealthState = 'healthy' | 'degraded' | 'unknown' | 'unconfigured'

export interface ProviderEndpoint {
  family: string
  baseUrl: string
  baseUrlEnv?: string
}

export interface ProviderTruthDefinition {
  id: ProviderId
  displayName: string
  envAliases: readonly string[]
  auth: {
    header: string
    prefix: string
  }
  endpoints: readonly ProviderEndpoint[]
  discovery: {
    models: string | null
    tasks: string | null
    providers: string | null
    privateEndpointsEnv: string | null
    dedicatedEndpointsEnv: string | null
    cacheTtlMs: number
  }
  capabilities: readonly CapabilityId[]
  features: {
    streaming: boolean
    asyncJobs: boolean
    webhooks: boolean
    toolCalling: boolean
    artifactSupport: boolean
  }
  billing: {
    plan: string
    freeQuotaEligible: boolean | 'unknown'
    paidEnabledEnv?: string
    pricingSource: 'provider_catalog'
    staticPrices: false
  }
}

export interface CapabilityDefinition {
  id: CapabilityId
  label: string
  category:
    | 'text'
    | 'research'
    | 'image'
    | 'video'
    | 'audio'
    | 'data'
    | 'agents'
    | 'adult'
  createsArtifact: boolean
  longRunning: boolean
  requiresAdultPermission: boolean
  requiredInputs: readonly string[]
}

export interface DiscoveredModel {
  provider: ProviderId
  id: string
  discoverySource?: ModelDiscoverySource
  capabilities: CapabilityId[]
  capabilityEvidence: CapabilityEvidence | 'unknown'
  status: 'available' | 'unavailable' | 'unknown'
  speed: number | null
  quality: number | null
  cost: number | null
  context: number | null
  adult: boolean | 'unknown'
  streaming: boolean | 'unknown'
  research: boolean | 'unknown'
  artifactSupport: boolean
  metadata?: {
    task?: string | null
    routeType?: string | null
    providerAvailable?: boolean | 'unknown'
    license?: string | null
    safetyPolicy?: string | null
    safetyNotes?: string | null
    adultGate?: boolean
    executable?: boolean | 'candidate' | 'CATALOG_ONLY' | 'REQUIRES_DEDICATED_ENDPOINT' | 'ADAPTER_MISSING' | 'DURATION_LIMITED'
    executionClassification?:
      | 'executable'
      | 'needs_configuration'
      | 'endpoint_required'
      | 'adapter_missing'
      | 'provider_error'
      | 'unsupported_by_contract'
      | 'blocked_by_policy'
      | 'rate_limited'
      | 'duration_limited'
    providerLimitSeconds?: number | null
    endpointEnv?: string | null
  }
  raw: Record<string, unknown>
  discoveredAt: string
}

export interface ProviderDiscoverySnapshot {
  provider: ProviderId
  status: DiscoveryStatus
  endpoint: string | null
  keySource: string
  discoverySource?: ModelDiscoverySource | 'none'
  rawCatalogCount?: number
  models: DiscoveredModel[]
  tasks: string[]
  inferenceProviders: string[]
  privateEndpoints: string[]
  dedicatedEndpoints: string[]
  discoveredAt: string
  expiresAt: string
  error: string | null
}

export interface ProviderHealthSnapshot {
  provider: ProviderId
  state: HealthState
  configured: boolean
  tested: boolean
  healthy: boolean
  checkedAt: string | null
  detail: string
}

export interface RoutingPreferences {
  speed?: number
  quality?: number
  cost?: number
  research?: number
  adult?: boolean
  streaming?: boolean
  artifactSupport?: boolean
  providerPreference?: ProviderId[]
  modelPreference?: string[]
  durationSeconds?: number
}

export interface RoutingProfile {
  id: RoutingProfileId
  label: string
  weights: {
    quality: number
    speed: number
    cost: number
    availability: number
    adult: number
    research: number
    streaming: number
    health: number
    artifactSupport: number
  }
  preferences: RoutingPreferences
}

export interface ProviderRouteCandidate {
  provider: ProviderId
  model: DiscoveredModel
  health: ProviderHealthSnapshot
  score: number
  scoreBreakdown: Record<string, number>
}

export interface ProviderRouteRejection {
  provider: ProviderId
  modelId: string | null
  capability: CapabilityId
  reason: string
  code:
    | 'PROVIDER_NOT_PINNED'
    | 'MODEL_NOT_PINNED'
    | 'MODEL_UNAVAILABLE'
    | 'CAPABILITY_UNSUPPORTED'
    | 'DEDICATED_ENDPOINT_REQUIRED'
    | 'CATALOG_ONLY'
    | 'ADAPTER_MISSING'
    | 'DURATION_LIMITED'
    | 'ADULT_GATE_REQUIRED'
    | 'PROVIDER_NOT_CONFIGURED'
    | 'PROVIDER_DEGRADED'
    | 'STREAMING_UNSUPPORTED'
    | 'ARTIFACT_UNSUPPORTED'
    | 'BILLING_DISABLED'
}

export interface DynamicRoutePlan {
  capability: CapabilityId
  profile: RoutingProfileId
  selected: ProviderRouteCandidate | null
  candidates: ProviderRouteCandidate[]
  fallbackChain: ProviderRouteCandidate[]
  rejectedCandidates: ProviderRouteRejection[]
  fallbackAllowed: boolean
  providerPin: ProviderId | null
  modelPin: string | null
  reason: string
}

export interface CanonicalExecutionRoute {
  provider: ProviderId
  model: DiscoveredModel
  score: number
  scoreBreakdown: Record<string, number>
  health: ProviderHealthSnapshot
  adapter: `${ProviderId}_capability_adapter`
}

export interface CanonicalExecutionPlan {
  capability: CapabilityId
  profile: RoutingProfileId
  selected: CanonicalExecutionRoute | null
  candidates: CanonicalExecutionRoute[]
  fallbackChain?: CanonicalExecutionRoute[]
  rejectedCandidates?: ProviderRouteRejection[]
  code: 'ROUTE_FOUND' | 'NO_ROUTE_FOUND'
  reason: string
}
