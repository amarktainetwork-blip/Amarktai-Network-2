import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    message?: string
    capability?: string
    providerOverride?: string
    modelOverride?: string
    costMode?: 'cheap' | 'balanced' | 'premium'
    files?: string[]
    metadata?: Record<string, unknown>
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  const capability = body.capability || detectCapability(body.message)
  const result = await executeCapability({
    input: body.message,
    capability,
    files: body.files,
    traceId: `amarktai-assistant-${Date.now()}`,
    qualityTier: body.costMode,
    metadata: {
      ...body.metadata,
      assistant: 'AmarktAI Assistant',
      dashboardContext: true,
      ignoredProviderPreference: body.providerOverride ?? null,
      ignoredModelPreference: body.modelOverride ?? null,
    },
  })
  return NextResponse.json({
    ...result,
    capability: result.capability ?? capability,
    route: {
      source: 'canonical_discovery',
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
    },
  }, {
    status: result.readiness === 'BLOCKED' ? 403 : 200,
  })
}
