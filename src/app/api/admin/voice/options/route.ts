import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { GENX_TTS_MODELS } from '@/lib/genx-client'

export const dynamic = 'force-dynamic'

interface VoiceOption {
  id: string
  label: string
  provider: string
  model: string
  verified: boolean
  blocker: string | null
}

const BASE_VOICES: VoiceOption[] = [
  { id: 'genx:grok-tts:neutral', label: 'AmarktAI Neutral', provider: 'genx', model: 'grok-tts', verified: false, blocker: null },
  { id: 'genx:aura-2:warm', label: 'AmarktAI Warm', provider: 'genx', model: 'aura-2', verified: false, blocker: null },
  { id: 'genx:genxlm-voice-v1:premium', label: 'AmarktAI Premium', provider: 'genx', model: 'genxlm-voice-v1', verified: false, blocker: null },
  { id: 'elevenlabs:default:studio', label: 'ElevenLabs Studio Voice', provider: 'elevenlabs', model: 'default', verified: false, blocker: null },
  { id: 'deepgram:aura-2:fast', label: 'Deepgram Aura Fast', provider: 'deepgram', model: 'aura-2', verified: false, blocker: null },
]

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const truth = await getDashboardRuntimeTruth()
  const voiceCapability = truth.capabilities.find((capability) => capability.name === 'Voice TTS')
  const configuredProviders = new Set(truth.providers.filter((provider) => provider.configured).map((provider) => provider.key))
  if (truth.genx.configured) configuredProviders.add('genx')

  const voices = BASE_VOICES.map((voice) => {
    const providerReady = configuredProviders.has(voice.provider)
    const genxModelKnown = voice.provider !== 'genx' || GENX_TTS_MODELS.includes(voice.model as (typeof GENX_TTS_MODELS)[number])
    const capabilityReady = voiceCapability?.status === 'READY'
    const verified = providerReady && genxModelKnown && capabilityReady
    return {
      ...voice,
      verified,
      blocker: verified
        ? null
        : !providerReady
          ? `${voice.provider} is not configured in Settings.`
          : !capabilityReady
            ? voiceCapability?.blocker ?? 'Voice TTS capability is not available yet.'
            : `Model ${voice.model} is not in the verified TTS model list.`,
    }
  })

  return NextResponse.json({
    success: true,
    voiceCapability,
    voices,
    selectable: voices.filter((voice) => voice.verified),
    note: 'Voice options are visible now, but the UI should only enable selection when TTS is verified by runtime truth.',
  })
}
