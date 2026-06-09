export type ProviderKey =
  | 'genx'
  | 'huggingface'
  | 'qwen'
  | 'mimo'
  | 'together'
  | 'groq'

export type CapabilityKey =
  | 'chat'
  | 'streaming_text'
  | 'reasoning'
  | 'code'
  | 'repo_workbench'
  | 'research'
  | 'web_search'
  | 'marketing_automation'
  | 'brand_kit'
  | 'image_generation'
  | 'image_editing'
  | 'image_to_video'
  | 'video_generation'
  | 'long_video_pipeline'
  | 'music_generation'
  | 'lyrics_generation'
  | 'audio_generation'
  | 'tts'
  | 'voice_design'
  | 'voice_clone'
  | 'stt'
  | 'realtime_voice'
  | 'avatar_image'
  | 'avatar_video'
  | 'embeddings'
  | 'rerank'
  | 'rag'
  | 'documents'
  | 'browser_automation'
  | 'repo_actions'
  | 'app_events'
  | 'webhooks'
  | 'artifact_storage'
  | 'self_learning'
  | 'self_healing'
  | 'mcp_tools'

export type RouteRole =
  | 'planner'
  | 'executor'
  | 'fallback_executor'
  | 'validator'
  | 'media_provider'
  | 'voice_provider'
  | 'artifact_provider'
  | 'tool_provider'

export type CostClass = 'cheap' | 'balanced' | 'premium'
export type ExecutionType = 'sync' | 'streaming' | 'async_job' | 'pipeline'
export type CertificationState = 'available' | 'proven' | 'degraded' | 'experimental' | 'needs_setup'
export type AppCostProfile = 'low_cost' | 'balanced' | 'premium' | 'ultra_resilient'

export interface ProviderDefinition {
  key: ProviderKey
  displayName: string
  role: string
  defaultCostClass: CostClass
  strengths: string[]
  bestFor: CapabilityKey[]
  avoidFor: CapabilityKey[]
  vaultKeyAliases: string[]
}

export interface CapabilityDefinition {
  key: CapabilityKey
  label: string
  description: string
  defaultExecution: ExecutionType
  needsArtifact: boolean
  needsApprovalDefault: boolean
}

export interface ModelRouteDefinition {
  provider: ProviderKey
  modelId: string
  displayName: string
  capabilities: CapabilityKey[]
  roles: RouteRole[]
  costClass: CostClass
  executionType: ExecutionType
  certification: CertificationState
  priority: number
  supportsStreaming?: boolean
  supportsFiles?: boolean
  supportsReferenceMedia?: boolean
  supportsVoiceClone?: boolean
  supportsVoiceDesign?: boolean
  supportsLongContext?: boolean
  notes: string
}

export interface AppCapabilityPackage {
  id: string
  label: string
  description: string
  defaultCostProfile: AppCostProfile
  capabilities: CapabilityKey[]
  preferredProviders: ProviderKey[]
  fallbackProviders: ProviderKey[]
  requiredAgents: string[]
  approvalRequiredFor: CapabilityKey[]
}

export interface RoutePlanStep {
  id: string
  label: string
  capability: CapabilityKey
  role: RouteRole
  providerCandidates: ProviderKey[]
  modelHints: string[]
  required: boolean
}

export interface RoutePlanPreview {
  appSlug: string
  packageId?: string
  taskLabel: string
  detectedCapability: CapabilityKey
  costProfile: AppCostProfile
  steps: RoutePlanStep[]
}

export interface ProviderMeshTruth {
  generatedAt: string
  summary: {
    providers: number
    capabilities: number
    modelRoutes: number
    appPackages: number
    provenRoutes: number
    experimentalRoutes: number
    needsSetupRoutes: number
  }
  providers: ProviderDefinition[]
  capabilities: CapabilityDefinition[]
  routes: ModelRouteDefinition[]
  packages: AppCapabilityPackage[]
}
