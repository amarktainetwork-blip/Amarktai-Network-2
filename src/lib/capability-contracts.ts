import type { RoutingQualityTier } from '@/lib/capability-routing-policy'

export const CAPABILITY_ROUTER_CAPABILITIES = [
  'chat',
  'code',
  'file_analysis',
  'image_generation',
  'image_edit',
  'video_generation',
  'image_to_video',
  'music_generation',
  'lyrics_generation',
  'tts',
  'stt',
  'voice_response',
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
  'avatar_video',
  'suggestive_image',
  'suggestive_video',
  'repo_edit',
  'app_build',
  'deploy_plan',
  'research',
  'scrape_website',
] as const

export type CapabilityRouterCapability =
  (typeof CAPABILITY_ROUTER_CAPABILITIES)[number]

export type CapabilityExecutionState =
  | 'READY'
  | 'NEEDS_CONFIGURATION'
  | 'BLOCKED'
  | 'UNAVAILABLE'

export interface CapabilityRequest {
  input: string
  capability?: CapabilityRouterCapability | string
  files?: string[]
  appId?: string
  workspaceId?: string
  providerOverride?: string
  modelOverride?: string
  provider?: string
  model?: string
  adultMode?: boolean
  safeMode?: boolean
  suggestiveMode?: boolean
  saveArtifact?: boolean
  traceId?: string
  metadata?: Record<string, unknown>
  qualityTier?: RoutingQualityTier
}

export interface ProviderAttempt {
  provider: string
  model: string
  status: string
  latencyMs?: number
  errorCategory?: string
  retryable?: boolean
  error?: string
}

export interface CapabilityResponse {
  success: boolean
  capability: CapabilityRouterCapability
  readiness: CapabilityExecutionState
  provider: string | null
  model: string | null
  outputType: string
  output: string | null
  artifactUrl?: string | null
  providerJobId?: string | null
  jobId?: string
  status?: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'
  artifactId?: string
  fallbackUsed: boolean
  fallbackReason?: string
  warning?: string
  error?: string
  error_category?:
    | 'missing_key'
    | 'invalid_key'
    | 'provider_policy_block'
    | 'model_not_supported'
    | 'region_mismatch'
    | 'provider_misconfigured'
    | 'provider_busy'
    | 'rate_limited'
    | 'timeout'
    | 'server_error'
    | 'endpoint_error'
    | 'malformed_response'
    | 'unsupported_endpoint'
    | 'artifact_error'
    | 'guardrail_block'
    | 'unknown'
  nextActions?: string[]
  providerAttempts?: ProviderAttempt[]
  diagnostics?: Record<string, unknown>
}
