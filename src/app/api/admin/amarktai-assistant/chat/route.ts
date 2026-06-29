import { NextRequest, NextResponse } from 'next/server'
import { APPROVED_ASSISTANT_MODELS, isApprovedAIProvider } from '@/lib/approved-ai-catalog'
import { executeCapability } from '@/lib/runtime-execution'
import { getSession } from '@/lib/session'
import { recordEstimatedCost } from '@/lib/cost-tracking'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'

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

  const selectedModel = APPROVED_ASSISTANT_MODELS.find((model) => model.id === body.modelOverride)
  const providerOverride = selectedModel?.provider ?? body.providerOverride
  if (providerOverride && !isApprovedAIProvider(providerOverride)) {
    return NextResponse.json({ error: 'Provider is not approved for AmarktAI Assistant' }, { status: 400 })
  }

  const capability = body.capability || detectCapability(body.message)
  const route = routeLiveModel({
    capability: normalizeCapability(capability),
    appSlug: 'assistant',
    selectedProvider: providerOverride || 'auto',
    selectedModel: selectedModel?.id ?? body.modelOverride,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: 'off',
  })
  if (route.blockedReason || !route.selectedProvider || !route.selectedModel) {
    return NextResponse.json({
      success: false,
      error: route.blockedReason ?? 'No approved route is available for this assistant request',
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
