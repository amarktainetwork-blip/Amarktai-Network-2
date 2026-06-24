import {
  CAPABILITY_ROUTER_CAPABILITIES,
  type CapabilityRouterCapability,
} from '@/lib/capability-router'
import { evaluateApprovalPolicy } from '@/lib/execution/approval-policy'
import type { CreateExecutionInput, ExecutionPlan } from '@/lib/execution/contracts'

const CAPABILITY_SET = new Set<string>(CAPABILITY_ROUTER_CAPABILITIES)

export function detectExecutionCapability(
  requestedCapability: string | undefined,
  prompt: string,
): CapabilityRouterCapability {
  if (requestedCapability && CAPABILITY_SET.has(requestedCapability)) {
    return requestedCapability as CapabilityRouterCapability
  }

  const value = `${requestedCapability ?? ''} ${prompt}`.toLowerCase()
  if (/(deploy|deployment|release|rollout)/.test(value)) return 'deploy_plan'
  if (/(pull request|create pr|open pr)/.test(value)) return 'repo_edit'
  if (/(edit|patch|refactor|change).*(repo|repository|codebase)/.test(value)) return 'repo_edit'
  if (/(build|scaffold|create).*(app|application|website)/.test(value)) return 'app_build'
  if (/(research|investigate|find sources|deep dive)/.test(value)) return 'research'
  if (/(analy[sz]e|summari[sz]e).*(file|document)/.test(value)) return 'file_analysis'
  if (/(edit|retouch|modify).*(image|photo)/.test(value)) return 'image_edit'
  if (/(image|photo).*(to|into).*(video|animation)/.test(value)) return 'image_to_video'
  if (/(generate|create|draw).*(image|photo|illustration)/.test(value)) return 'image_generation'
  if (/(generate|create).*(video|animation|clip)/.test(value)) return 'video_generation'
  if (/(music|instrumental|beat|compose)/.test(value)) return 'music_generation'
  if (/(lyrics|verse|chorus)/.test(value)) return 'lyrics_generation'
  if (/(speech.to.text|transcribe)/.test(value)) return 'stt'
  if (/(text.to.speech|read aloud|speak)/.test(value)) return 'tts'
  if (/(code|function|typescript|javascript|python|debug)/.test(value)) return 'code'
  if (/(scrape|crawl).*(site|website|url)/.test(value)) return 'scrape_website'
  return 'chat'
}

export function planExecution(input: CreateExecutionInput): ExecutionPlan {
  const detectedCapability = detectExecutionCapability(
    input.requestedCapability,
    input.prompt,
  )
  const estimatedCostUsd = input.estimatedCostUsd ?? 0
  const approval = evaluateApprovalPolicy(input, detectedCapability, estimatedCostUsd)
  const policyBlockedReason = planningPolicyBlock(
    detectedCapability,
    input.adultPolicy,
  )

  return {
    requestedCapability: input.requestedCapability ?? detectedCapability,
    detectedCapability,
    action: input.action ?? 'generate',
    providerPlan: {
      provider: null,
      fallbackProviders: [],
      reason: 'Provider is resolved at execution time by canonical discovery and scoring.',
    },
    modelPlan: {
      model: null,
      fallbackModels: [],
      task: detectedCapability,
      costMode: input.costMode ?? 'balanced',
    },
    approval: {
      required: approval.required,
      status: approval.status,
      reason: approval.reason,
    },
    riskLevel: approval.riskLevel,
    estimatedCostUsd,
    // Provider/model availability is owned by the canonical orchestrator.
    blockedReason: policyBlockedReason,
  }
}

function planningPolicyBlock(
  capability: CapabilityRouterCapability,
  adultPolicy: CreateExecutionInput['adultPolicy'],
): string | null {
  if (
    ['adult_text', 'adult_image', 'adult_video', 'adult_voice', 'adult_avatar']
      .includes(capability)
    && adultPolicy !== 'full_adult_app_mode'
  ) {
    return 'Adult capability requires explicit app adult policy.'
  }
  if (
    ['suggestive_image', 'suggestive_video'].includes(capability)
    && adultPolicy === 'off'
  ) {
    return 'Suggestive capability requires an app policy that permits suggestive content.'
  }
  return null
}
