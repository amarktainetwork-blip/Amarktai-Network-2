import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { routeLiveModel } from '@/lib/live-ai-routing'
import { recordEstimatedCost } from '@/lib/cost-tracking'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    text?: string
    voiceId?: string
    costMode?: 'cheap' | 'balanced' | 'premium'
  }
  if (!body.text?.trim()) return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 })

  const selectedProvider = body.voiceId && isApprovedDirectProvider(body.voiceId)
    ? body.voiceId
    : 'auto'
  const route = routeLiveModel({
    capability: 'voice_tts',
    appSlug: 'assistant',
    selectedProvider,
    costMode: body.costMode ?? 'balanced',
  })

  if (route.blockedReason || !route.selectedProvider || !route.selectedModel) {
    return NextResponse.json({ success: false, status: route.blockedReason ?? 'Needs key/test', route }, { status: 409 })
  }

  await recordEstimatedCost({
    provider: route.selectedProvider,
    model: route.selectedModel,
    appSlug: 'assistant',
    agentId: 'amarktai-assistant',
    capability: 'voice_tts',
    runType: 'assistant-tts',
    costMode: route.costMode,
    estimatedCostUsd: route.estimatedCostUsd,
  }).catch(() => null)

  return NextResponse.json({
    success: false,
    status: 'Needs key/test',
    route,
    error: `${route.selectedProvider} voice route is selected, but live audio playback needs a configured provider endpoint.`,
  }, { status: 409 })
}
