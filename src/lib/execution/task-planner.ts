import {
  CAPABILITY_ROUTER_CAPABILITIES,
  type CapabilityRouterCapability,
} from '@/lib/capability-router'
import { evaluateApprovalPolicy } from '@/lib/execution/approval-policy'
import type { CreateExecutionInput, ExecutionPlan } from '@/lib/execution/contracts'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'

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
  const route = routeLiveModel({
    capability: toLiveCapability(detectedCapability),
    appSlug: input.appSlug,
    selectedProvider: input.selectedProvider,
    selectedModel: input.selectedModel,
    costMode: input.costMode,
    adultPolicy: input.adultPolicy,
    requiresMedia: isMediaCapability(detectedCapability),
  })
  const estimatedCostUsd = input.estimatedCostUsd ?? route.estimatedCostUsd
  const approval = evaluateApprovalPolicy(input, detectedCapability, estimatedCostUsd)

  return {
    requestedCapability: input.requestedCapability ?? detectedCapability,
    detectedCapability,
    action: input.action ?? 'generate',
    providerPlan: {
      provider: route.selectedProvider,
      fallbackProviders: route.fallbackChain.map((candidate) => candidate.provider),
      reason: route.reason,
    },
    modelPlan: {
      model: route.selectedModel,
      fallbackModels: route.fallbackChain.map((candidate) => candidate.model),
      task: route.selectedTask,
      costMode: route.costMode,
    },
    approval: {
      required: approval.required,
      status: approval.status,
      reason: approval.reason,
    },
    riskLevel: approval.riskLevel,
    estimatedCostUsd,
    blockedReason: route.blockedReason,
  }
}

function toLiveCapability(capability: CapabilityRouterCapability): AiCapability {
  const map: Record<CapabilityRouterCapability, AiCapability> = {
    chat: 'chat',
    code: 'coding',
    file_analysis: 'research',
    image_generation: 'image_generation',
    image_edit: 'image_editing',
    video_generation: 'video_generation',
    image_to_video: 'image_to_video',
    music_generation: 'music_generation',
    lyrics_generation: 'lyrics_generation',
    tts: 'tts',
    stt: 'stt',
    voice_response: 'tts',
    adult_text: 'adult_text',
    adult_image: 'adult_image',
    adult_video: 'adult_video',
    adult_voice: 'adult_voice',
    suggestive_image: 'image_generation',
    suggestive_video: 'video_generation',
    repo_edit: 'coding',
    app_build: 'coding',
    deploy_plan: 'coding',
    research: 'research',
    scrape_website: 'crawling',
  }
  return map[capability]
}

function isMediaCapability(capability: CapabilityRouterCapability): boolean {
  return (
    capability.includes('image') ||
    capability.includes('video') ||
    capability === 'music_generation' ||
    capability === 'tts' ||
    capability === 'stt' ||
    capability === 'voice_response' ||
    capability === 'adult_voice'
  )
}
