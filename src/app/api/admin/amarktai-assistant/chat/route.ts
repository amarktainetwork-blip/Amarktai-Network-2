import { NextRequest, NextResponse } from 'next/server'
import { APPROVED_ASSISTANT_MODELS, isApprovedAIProvider } from '@/lib/approved-ai-catalog'
import { executeCapability } from '@/lib/capability-router'
import { getSession } from '@/lib/session'

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
  const result = await executeCapability({
    input: body.message,
    capability,
    files: body.files,
    providerOverride,
    modelOverride: selectedModel?.id ?? body.modelOverride,
    traceId: `amarktai-assistant-${Date.now()}`,
    metadata: {
      ...body.metadata,
      assistant: 'AmarktAI Assistant',
      dashboardContext: true,
      workbenchContext: true,
    },
  })

  return NextResponse.json({
    output: result.output,
    capability: result.capability ?? capability,
    provider: result.provider,
    model: result.model,
    outputType: result.outputType,
    artifactId: result.artifactId,
    fallbackUsed: result.fallbackUsed,
    warning: result.warning,
    success: result.success,
    error: result.error,
  })
}
