import type {
  CreateExecutionInput,
  ExecutionAction,
  ExecutionApproval,
  ExecutionRiskLevel,
} from '@/lib/execution/contracts'
import type { CapabilityRouterCapability } from '@/lib/capability-router'

export interface ApprovalDecision {
  required: boolean
  status: ExecutionApproval['status']
  reason: string | null
  riskLevel: ExecutionRiskLevel
}

const ALWAYS_APPROVE_ACTIONS = new Set<ExecutionAction>([
  'deployment',
  'pr_create',
  'external_publish',
  'webhook',
  'repo_destructive',
  'voice_clone',
  'avatar_clone',
])

const SAFE_ACTIONS = new Set<ExecutionAction>(['generate', 'repo_scan'])
const SAFE_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'chat',
  'file_analysis',
  'lyrics_generation',
  'research',
  'scrape_website',
])
const ADULT_MEDIA = new Set<CapabilityRouterCapability>([
  'adult_image',
  'adult_video',
  'adult_voice',
])

export function evaluateApprovalPolicy(
  input: CreateExecutionInput,
  capability: CapabilityRouterCapability,
  estimatedCostUsd: number,
): ApprovalDecision {
  const action = input.action ?? 'generate'

  if (ALWAYS_APPROVE_ACTIONS.has(action)) {
    return {
      required: true,
      status: 'pending',
      reason: approvalReason(action),
      riskLevel: action === 'repo_destructive' || action === 'deployment' ? 'critical' : 'high',
    }
  }

  if (ADULT_MEDIA.has(capability) && input.adultApprovalRequired) {
    return {
      required: true,
      status: 'pending',
      reason: 'This app policy requires approval before adult media execution.',
      riskLevel: 'high',
    }
  }

  const expensiveMedia =
    input.expensiveMedia === true ||
    (isMediaCapability(capability) && estimatedCostUsd >= 0.5)
  if (expensiveMedia) {
    return {
      required: true,
      status: 'pending',
      reason: 'Estimated media cost exceeds the automatic execution threshold.',
      riskLevel: 'high',
    }
  }

  if (action === 'repo_patch' || capability === 'repo_edit' || capability === 'app_build') {
    return {
      required: false,
      status: 'not_required',
      reason: null,
      riskLevel: 'medium',
    }
  }

  if (SAFE_ACTIONS.has(action) && SAFE_CAPABILITIES.has(capability)) {
    return {
      required: false,
      status: 'not_required',
      reason: null,
      riskLevel: 'low',
    }
  }

  return {
    required: false,
    status: 'not_required',
    reason: null,
    riskLevel: isMediaCapability(capability) ? 'medium' : 'low',
  }
}

function isMediaCapability(capability: CapabilityRouterCapability): boolean {
  return (
    capability.includes('image') ||
    capability.includes('video') ||
    capability === 'music_generation' ||
    capability === 'tts' ||
    capability === 'voice_response' ||
    capability === 'adult_voice'
  )
}

function approvalReason(action: ExecutionAction): string {
  const reasons: Record<ExecutionAction, string> = {
    generate: 'Generation is safe to run automatically.',
    repo_scan: 'Read-only repository scans are safe to run automatically.',
    repo_patch: 'Patch proposals do not modify the repository until separately applied.',
    repo_destructive: 'Destructive repository actions require explicit approval.',
    deployment: 'Deployments require explicit approval.',
    pr_create: 'Creating a pull request is an external repository action.',
    external_publish: 'External publishing requires explicit approval.',
    webhook: 'External webhook delivery requires explicit approval.',
    voice_clone: 'Voice cloning requires explicit approval.',
    avatar_clone: 'Avatar cloning requires explicit approval.',
  }
  return reasons[action]
}
