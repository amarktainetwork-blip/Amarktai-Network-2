import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { GENX_TTS_MODELS } from '@/lib/genx-client'

const previewSchema = z.object({
  text: z.string().min(1).max(600),
  voiceId: z.string().min(1),
  emotionAware: z.boolean().optional().default(false),
})

interface VoiceChoice {
  provider: string
  model: string
  voiceId?: string
  gender?: 'male' | 'female'
  label: string
}

const VOICE_MAP: Record<string, VoiceChoice> = {
  'genx:grok-tts:neutral': { provider: 'genx', model: 'grok-tts', label: 'AmarktAI Neutral' },
  'genx:aura-2:warm': { provider: 'genx', model: 'aura-2', label: 'AmarktAI Warm' },
  'genx:genxlm-voice-v1:premium': { provider: 'genx', model: 'genxlm-voice-v1', label: 'AmarktAI Premium' },
}

export const dynamic = 'force-dynamic'

function providerConfigured(truth: Awaited<ReturnType<typeof getDashboardRuntimeTruth>>, provider: string) {
  if (provider === 'genx') return truth.genx.configured && truth.genx.available
  return truth.providers.some((entry) => entry.key === provider && entry.configured)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid voice preview request', details: parsed.error.flatten() }, { status: 422 })
  }

  const choice = VOICE_MAP[parsed.data.voiceId]
  if (!choice) {
    return NextResponse.json({ success: false, error: 'Unknown voice option', executed: false }, { status: 404 })
  }

  const truth = await getDashboardRuntimeTruth()
  const voiceCapability = truth.capabilities.find((capability) => capability.name === 'Voice TTS')
  const providerReady = providerConfigured(truth, choice.provider)
  const modelKnown = choice.provider !== 'genx' || GENX_TTS_MODELS.includes(choice.model as (typeof GENX_TTS_MODELS)[number])
  const capabilityReady = voiceCapability?.status === 'READY'

  if (!providerReady || !modelKnown || !capabilityReady) {
    return NextResponse.json({
      success: false,
      executed: false,
      error: !providerReady
        ? `${choice.provider} is not configured or not reachable.`
        : !capabilityReady
          ? voiceCapability?.blocker ?? 'Voice TTS capability is not available yet.'
          : `Model ${choice.model} is not in the verified TTS model list.`,
      voice: choice,
      voiceCapability,
    }, { status: 409 })
  }

  const url = new URL('/api/brain/tts', request.url)
  const ttsResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: parsed.data.text,
      provider: choice.provider,
      model: choice.model,
      voiceId: choice.voiceId,
      gender: choice.gender,
      appSlug: 'amarktai-network',
      emotionAware: parsed.data.emotionAware,
      responseFormat: 'audio',
    }),
  })

  if (!ttsResponse.ok) {
    const detail = await ttsResponse.text().catch(() => '')
    return NextResponse.json({
      success: false,
      executed: false,
      error: 'TTS preview generation failed',
      detail,
      provider: choice.provider,
      model: choice.model,
    }, { status: ttsResponse.status })
  }

  const audio = await ttsResponse.arrayBuffer()
  return new NextResponse(audio, {
    status: 200,
    headers: {
      'Content-Type': ttsResponse.headers.get('Content-Type') ?? 'audio/mpeg',
      'Content-Length': String(audio.byteLength),
      'X-Provider': choice.provider,
      'X-Model': choice.model,
      'X-Voice-Id': parsed.data.voiceId,
      'X-Voice-Label': choice.label,
      'X-Executed': 'true',
    },
  })
}
