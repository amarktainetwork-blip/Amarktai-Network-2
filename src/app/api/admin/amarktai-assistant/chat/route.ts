import { NextRequest, NextResponse } from 'next/server'
import { APPROVED_ASSISTANT_MODELS, isApprovedAIProvider } from '@/lib/approved-ai-catalog'
import { executeCapability } from '@/lib/capability-router'
import { getSession } from '@/lib/session'
import { recordEstimatedCost } from '@/lib/cost-tracking'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
import { selectBestModelForTask } from '@/lib/ai-brain-router'

function detectCapability(text: string): string {
  const value = text.toLowerCase()
  if (/create image|generate image|\bdraw\b/.test(value)) return 'image_generation'
  if (/create video|generate video/.test(value)) return 'video_generation'
  if (/text to speech|\btts\b/.test(value)) return 'tts'
  if (/transcribe|\bstt\b/.test(value)) return 'stt'
  if (/\bscrape\b|crawl website/.test(value)) return 'scrape_website'
  if (/write code|create code|fix code|repo|pull request|diff|patch/.test(value)) return 'code'
  return 'chat'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    message?: string
    capability?: string
    providerOverride?: string
    modelOverride?: string
    costMode?: 'cheap' | 'balanced' | 'premium'
    files?: string[]
    metadata?: Record<string, unknown>
  }

  if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const selectedCatalogModel = APPROVED_ASSISTANT_MODELS.find((model) => model.id === body.modelOverride)
  const providerOverride = selectedCatalogModel?.provider ?? body.providerOverride
  if (providerOverride && !isApprovedAIProvider(providerOverride)) {
    return NextResponse.json({
      success: false,
      error: 'Provider is not approved for AmarktAI Assistant',
      blocker: 'The requested provider is not in the approved provider catalog.',
      provider: providerOverride,
      model: body.modelOverride ?? null,
    }, { status: 400 })
  }

  const capability = body.capability || detectCapability(body.message)
  const normalizedCapability = normalizeCapability(capability)

  const brainSelection = await selectBestModelForTask({
    taskType: capability,
    capability: normalizedCapability,
    costMode: body.costMode ?? 'balanced',
    providerPreference: providerOverride,
    requiresCode: normalizedCapability === 'coding',
    requiresVision: ['image', 'image_generation', 'video', 'video_generation', 'adult_image', 'adult_video'].includes(normalizedCapability),
  })

  if (!brainSelection.ok || !brainSelection.selected) {
    return NextResponse.json({
      success: false,
      error: brainSelection.blocker || 'No approved routed assistant model is available.',
      blocker: brainSelection.blocker || 'No approved routed assistant model is available.',
      capability: brainSelection.capability ?? normalizedCapability,
      provider: null,
      model: null,
      fallbackChain: brainSelection.fallbackChain.map((model) => ({
        provider: model.provider,
        model: model.modelId,
      })),
      reason: brainSelection.reason,
    }, { status: 503 })
  }

  const selectedProvider = providerOverride || brainSelection.selected.provider
  const selectedModel = selectedCatalogModel?.id ?? body.modelOverride ?? brainSelection.selected.modelId

  const route = routeLiveModel({
    capability: normalizedCapability,
    appSlug: 'assistant',
    selectedProvider,
    selectedModel,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: 'off',
  })
  if (route.blockedReason || !route.selectedProvider || !route.selectedModel) {
    return NextResponse.json({
      success: false,
      error: route.blockedReason ?? 'No approved route is available for this assistant request',
      blocker: route.blockedReason ?? 'No approved route is available for this assistant request',
      provider: selectedProvider,
      model: selectedModel,
      brainSelection: {
        provider: brainSelection.selected.provider,
        model: brainSelection.selected.modelId,
        capability: brainSelection.capability,
        fallbackChain: brainSelection.fallbackChain.map((model) => ({
          provider: model.provider,
          model: model.modelId,
        })),
        reason: brainSelection.reason,
      },
      route,
    }, { status: 409 })
  }

  const result = await executeCapability({
    input: body.message,
    capability,
    files: body.files,
    providerOverride: route.selectedProvider,
    modelOverride: route.selectedModel,
    traceId: `amarktai-assistant-${Date.now()}`,
    metadata: {
      ...body.metadata,
      assistant: 'AmarktAI Assistant',
      dashboardContext: true,
      workbenchContext: true,
    },
  })

  await recordEstimatedCost({
    provider: route.selectedProvider,
    model: route.selectedModel,
    appSlug: 'assistant',
    agentId: 'amarktai-assistant',
    capability,
    runType: 'assistant-chat',
    costMode: route.costMode,
    estimatedCostUsd: route.estimatedCostUsd,
  }).catch(() => null)

  return NextResponse.json({
    output: result.output,
    capability: result.capability ?? capability,
    provider: result.provider,
    model: result.model,
    outputType: result.outputType,
    artifactId: result.artifactId,
    fallbackUsed: result.fallbackUsed,
    warning: result.warning,
    route,
    success: result.success,
    error: result.error,
  })
}

function normalizeCapability(value: string): AiCapability {
  if (value === 'code') return 'coding'
  if (value === 'image_generation') return 'image'
  if (value === 'video_generation') return 'video'
  if (value === 'tts') return 'voice_tts'
  if (value === 'stt') return 'voice_stt'
  if (value === 'scrape_website') return 'research'
  if (['chat', 'reasoning', 'coding', 'research', 'image', 'video', 'voice_tts', 'voice_stt', 'avatar_video', 'moderation', 'adult_text', 'adult_image', 'adult_video', 'adult_voice'].includes(value)) {
    return value as AiCapability
  }
  return 'chat'
}
