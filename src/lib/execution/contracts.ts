import type { CapabilityRouterCapability } from '@/lib/capability-router'
import type { AdultPolicyValue } from '@/lib/universal-model-catalog'

export type ExecutionRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ExecutionApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
export type ExecutionJobStatus =
  | 'planned'
  | 'awaiting_approval'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled'

export type ExecutionAction =
  | 'generate'
  | 'repo_scan'
  | 'repo_patch'
  | 'repo_destructive'
  | 'deployment'
  | 'pr_create'
  | 'external_publish'
  | 'webhook'
  | 'voice_clone'
  | 'avatar_clone'

export interface ExecutionActor {
  type: 'admin' | 'user' | 'agent' | 'system'
  id?: string
  label?: string
}

export interface ExecutionInput {
  prompt: string
  files: string[]
  metadata: Record<string, unknown>
}

export interface ExecutionProviderPlan {
  provider: string | null
  fallbackProviders: string[]
  reason: string
}

export interface ExecutionModelPlan {
  model: string | null
  fallbackModels: string[]
  task: string | null
  costMode: 'cheap' | 'balanced' | 'premium'
}

export interface ExecutionApproval {
  required: boolean
  status: ExecutionApprovalStatus
  reason: string | null
  approvalId: string | null
}

export interface ExecutionArtifactLink {
  artifactId: string
  type?: string
  url?: string | null
  createdAt: string
}

export interface ExecutionJobLink {
  jobId: string
  providerJobId?: string | null
  type?: string
  status?: string
  pollUrl?: string | null
}

export interface ExecutionEvent {
  id: string
  type: string
  message: string
  level: 'info' | 'warning' | 'error'
  at: string
  metadata?: Record<string, unknown>
}

export interface ExecutionPlan {
  requestedCapability: string
  detectedCapability: CapabilityRouterCapability
  action: ExecutionAction
  providerPlan: ExecutionProviderPlan
  modelPlan: ExecutionModelPlan
  approval: Omit<ExecutionApproval, 'approvalId'>
  riskLevel: ExecutionRiskLevel
  estimatedCostUsd: number
  blockedReason: string | null
}

export interface ExecutionRecord {
  id: string
  executionId: string
  appSlug: string
  appId: string | null
  actor: ExecutionActor
  requestedCapability: string
  detectedCapability: CapabilityRouterCapability
  action: ExecutionAction
  input: ExecutionInput
  providerPlan: ExecutionProviderPlan
  modelPlan: ExecutionModelPlan
  approval: ExecutionApproval
  riskLevel: ExecutionRiskLevel
  estimatedCostUsd: number
  status: ExecutionJobStatus
  jobs: ExecutionJobLink[]
  artifacts: ExecutionArtifactLink[]
  events: ExecutionEvent[]
  result: unknown | null
  error: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface CreateExecutionInput {
  appSlug?: string
  appId?: string
  actor?: ExecutionActor
  requestedCapability?: string
  prompt: string
  files?: string[]
  metadata?: Record<string, unknown>
  action?: ExecutionAction
  selectedProvider?: string
  selectedModel?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  estimatedCostUsd?: number
  adultPolicy?: AdultPolicyValue | 'allowed' | 'full_adult'
  adultApprovalRequired?: boolean
  expensiveMedia?: boolean
}
