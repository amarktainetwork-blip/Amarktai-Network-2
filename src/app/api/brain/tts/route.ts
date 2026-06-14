import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'
import { callGenXMedia, GENX_TTS_MODELS } from '@/lib/genx-client'
import { createArtifact, detectArtifactContent } from '@/lib/artifact-store'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'
import { getProviderInfo } from '@/lib/provider-registry'
import { recordCapabilityTrace } from '@/lib/capability-tracing'
import {
  getAdultAppCapabilityProfile,
  validateAdultCapabilityRequest,
} from '@/lib/adult-app-capabilities'

type TtsCapability = 'tts' | 'adult_voice'
type TtsProvider = 'auto' | 'mimo' | 'together' | 'groq' | 'genx' | 'huggingface'

async function getIntegrationConfigApiKey(providerKey: string): Promise<string> {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const rows = await prisma.$queryRawUnsafe<Array<{ key: string; display_name: string; api_key: string }>>('SELECT `key`, display_name, api_key FROM integration_configs')
    await prisma.$disconnect()
    const wanted = providerKey.toLowerCase().replace(/[^a-z0-9]/g, '')
    const row = rows.find((entry) => {
      const key = String(entry.key ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const name = String(entry.display_name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (wanted === 'mimo') return key === 'mimo' || name.includes('mimo') || name.includes('xiaomi')
      if (wanted === 'together') return key.includes('together') || name.includes('together')
      if (wanted === 'groq') return key === 'groq' || name.includes('groq')
      if (wanted === 'genx') return key === 'genx' || name.includes('genx')
      if (wanted === 'huggingface') return key.includes('huggingface') || name.includes('huggingface')
      return key.includes(wanted) || name.includes(wanted)
    })
    return row?.api_key?.trim() ?? ''
  } catch {
    return ''
  }
}

async function getProviderApiKey(provider: string): Promise<string> {
  const vault = await getVaultApiKey(provider).catch(() => '')
  if (vault) return vault
  return getIntegrationConfigApiKey(provider)
}

function normalizeVoice(provider: string, value: unknown): string {
  const requested = typeof value === 'string' && value.trim() ? value.trim() : ''
  if (provider === 'mimo') return requested || 'Chloe'
  if (provider === 'together') return requested || 'tara'
  if (provider === 'groq') return requested || 'hannah'
  return requested || 'alloy'
}

function audioMime(format: string, fallback = 'audio/mpeg'): string {
  if (format === 'wav') return 'audio/wav'
  if (format === 'mp3') return 'audio/mpeg'
  if (format === 'raw') return 'audio/L16'
  if (format === 'mulaw') return 'audio/basic'
  return fallback
}


function result(input: {
  success: boolean
  capability: TtsCapability
  provider?: string | null
  model?: string | null
  jobStatus: string
  artifactId?: string | null
  storageUrl?: string | null
  error?: string | null
  blocker?: string | null
  audioBase64?: string
  traceId: string
  attempts?: Array<Record<string, unknown>>
}) {
  return {
    success: input.success,
    executed: input.success,
    capability: input.capability,
    provider: input.provider ?? null,
    model: input.model ?? null,
    jobStatus: input.jobStatus,
    artifactId: input.artifactId ?? null,
    storageUrl: input.storageUrl ?? null,
    error: input.error ?? null,
    blocker: input.blocker ?? input.error ?? null,
    audioBase64: input.audioBase64,
    traceId: input.traceId,
    attempts: input.attempts ?? [],
  }
}

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const capability: TtsCapability = body.capability === 'adult_voice' ? 'adult_voice' : 'tts'
    const appSlug = typeof body.appSlug === 'string' && body.appSlug ? body.appSlug : 'amarktai-network'
    const executionId = typeof body.executionId === 'string' ? body.executionId : undefined
    const responseFormat = body.responseFormat === 'audio' ? 'audio' : 'json'
    if (!text) {
      return NextResponse.json(result({ success: false, capability, traceId, jobStatus: 'blocked', error: 'text is required.' }), { status: 400 })
    }

    let adultApprovedProviders: string[] | null = null
    if (capability === 'adult_voice') {
      const profile = await getAdultAppCapabilityProfile(appSlug)
      const policy = validateAdultCapabilityRequest(profile, 'adult_voice', text)
      if (!policy.allowed) {
        return NextResponse.json(result({
          success: false,
          capability,
          traceId,
          jobStatus: 'blocked',
          error: policy.blocker,
        }), { status: 403 })
      }
      adultApprovedProviders = profile.approvedProviders
      await loadAppSafetyConfigFromDB(appSlug)
      const safety = getAppSafetyConfig(appSlug)
      if (safety.safeMode || !safety.adultMode) {
        return NextResponse.json(result({
          success: false,
          capability,
          traceId,
          jobStatus: 'blocked',
          error: 'Adult voice requires adultMode=true and safeMode=false for this app.',
        }), { status: 403 })
      }
      const scan = scanContent(text, appSlug)
      if (scan.flagged) {
        return NextResponse.json(result({
          success: false,
          capability,
          traceId,
          jobStatus: 'blocked',
          error: `Text blocked by policy: ${scan.categories.join(', ')}.`,
        }), { status: 422 })
      }
    }

    const requestedProviderValue = typeof body.provider === 'string' ? body.provider : 'auto'
    if (!['auto', 'mimo', 'together', 'groq', 'genx', 'huggingface'].includes(requestedProviderValue)) {
      return NextResponse.json(result({
        success: false,
        capability,
        traceId,
        jobStatus: 'blocked',
        error: `Provider "${requestedProviderValue}" is not in the canonical ${capability} route.`,
      }), { status: 400 })
    }
    const requestedProvider = requestedProviderValue as TtsProvider

    const route = getMediaCapabilityRoute(capability)!
    const requestedModel = typeof body.model === 'string' && body.model ? body.model : null
    const attempts: Array<Record<string, unknown>> = []
    const canonicalVoiceProviders = [
      { provider: 'mimo' as const, model: 'mimo-v2.5-tts' },
      { provider: 'together' as const, model: 'canopylabs/orpheus-3b-0.1-ft' },
      { provider: 'groq' as const, model: 'canopylabs/orpheus-v1-english' },
      { provider: 'genx' as const, model: 'aura-2' },
      { provider: 'huggingface' as const, model: 'espnet/kan-bayashi_ljspeech_vits' },
    ]
    const providerCandidates = [
      ...canonicalVoiceProviders,
      ...route.providers.filter((entry) => !canonicalVoiceProviders.some((candidate) => candidate.provider === entry.provider)),
    ]

    for (const entry of providerCandidates.filter((candidate) =>
      (requestedProvider === 'auto' || candidate.provider === requestedProvider)
      && (!adultApprovedProviders || adultApprovedProviders.includes(candidate.provider)),
    )) {
      const model = requestedModel ?? entry.model
      const startedAt = Date.now()
      let audio: Buffer | null = null
      let mimeType = 'audio/mpeg'
      let error = ''


      if (entry.provider === 'mimo') {
        const apiKey = await getProviderApiKey('mimo')
        if (!apiKey) {
          error = 'MiMo API key is missing.'
        } else {
          const endpoint = `${process.env.MIMO_BASE_URL?.trim() || 'https://token-plan-sgp.xiaomimimo.com/v1'}/chat/completions`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'api-key': apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              model: model && model.startsWith('mimo-') ? model : 'mimo-v2.5-tts',
              messages: [
                { role: 'user', content: typeof body.voiceStyle === 'string' ? body.voiceStyle : 'Clear, warm English narrator voice. Natural pace and friendly tone.' },
                { role: 'assistant', content: text },
              ],
              audio: {
                format: body.format === 'mp3' ? 'mp3' : 'wav',
                voice: normalizeVoice('mimo', body.voice),
              },
            }),
            signal: AbortSignal.timeout(60_000),
          }).catch(() => null)
          if (response?.ok) {
            const json = await response.json().catch(() => null) as { choices?: Array<{ message?: { audio?: { data?: string } } }> } | null
            const b64 = json?.choices?.[0]?.message?.audio?.data
            if (typeof b64 === 'string' && b64.length > 0) {
              audio = Buffer.from(b64, 'base64')
              mimeType = audioMime(body.format === 'mp3' ? 'mp3' : 'wav', 'audio/wav')
            } else {
              error = 'MiMo returned no audio data.'
            }
          } else {
            error = response ? `MiMo returned HTTP ${response.status}.` : 'MiMo TTS request failed.'
          }
        }
      }

      if (entry.provider === 'together') {
        const apiKey = await getProviderApiKey('together')
        if (!apiKey) {
          error = 'Together API key is missing.'
        } else {
          const response = await fetch('https://api.together.xyz/v1/audio/speech', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg, audio/wav, application/json',
            },
            body: JSON.stringify({
              model: model && model.includes('/') ? model : 'canopylabs/orpheus-3b-0.1-ft',
              input: text,
              voice: normalizeVoice('together', body.voice),
              response_format: body.format === 'wav' ? 'wav' : 'mp3',
            }),
            signal: AbortSignal.timeout(60_000),
          }).catch(() => null)
          if (response?.ok) {
            audio = Buffer.from(await response.arrayBuffer())
            mimeType = response.headers.get('content-type') ?? audioMime(body.format === 'wav' ? 'wav' : 'mp3')
          } else {
            error = response ? `Together returned HTTP ${response.status}.` : 'Together TTS request failed.'
          }
        }
      }

      if (entry.provider === 'groq') {
        const apiKey = await getProviderApiKey('groq')
        if (!apiKey) {
          error = 'Groq API key is missing.'
        } else {
          const response = await fetch(`${getProviderInfo('groq')?.baseUrl ?? 'https://api.groq.com/openai/v1'}/audio/speech`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              input: text,
              voice: normalizeVoice('groq', body.voice),
              response_format: body.format === 'mp3' ? 'mp3' : 'wav',
            }),
            signal: AbortSignal.timeout(60_000),
          }).catch(() => null)
          if (response?.ok) {
            audio = Buffer.from(await response.arrayBuffer())
            mimeType = response.headers.get('content-type') ?? 'audio/wav'
          } else {
            error = response ? `Groq returned HTTP ${response.status}.` : 'Groq TTS request failed.'
          }
        }
      }

      if (entry.provider === 'genx') {
        const genxModel = GENX_TTS_MODELS.includes(model as (typeof GENX_TTS_MODELS)[number]) ? model : GENX_TTS_MODELS[0]
        const generated = await callGenXMedia({ model: genxModel, prompt: text, type: 'audio' }).catch((cause) => ({
          success: false,
          url: null,
          jobId: null,
          status: 'failed' as const,
          model: genxModel,
          latencyMs: 0,
          error: cause instanceof Error ? cause.message : 'GenX TTS failed.',
        }))
        if (generated.success && generated.url) {
          const audioResponse = await fetch(generated.url, { signal: AbortSignal.timeout(30_000) }).catch(() => null)
          if (audioResponse?.ok) {
            audio = Buffer.from(await audioResponse.arrayBuffer())
            mimeType = audioResponse.headers.get('content-type') ?? mimeType
          } else {
            error = 'GenX returned an audio URL that could not be downloaded.'
          }
        } else if (generated.success && generated.jobId) {
          const job = createLocalMediaJob({
            capability,
            appSlug,
            type: 'audio',
            subType: capability,
            title: `${capability === 'adult_voice' ? 'Adult voice' : 'TTS'}: ${text.slice(0, 80)}`,
            prompt: text,
            provider: 'genx',
            model: generated.model,
            providerJobId: generated.jobId,
            metadata: { capability, traceId, executionId },
          })
          return NextResponse.json({
            ...localMediaJobResponse(job),
            traceId,
            attempts,
          }, { status: 202 })
        } else {
          error = generated.error ?? 'GenX returned no audio.'
        }
      }

      if (entry.provider === 'huggingface') {
        const apiKey = await getProviderApiKey('huggingface')
        if (!apiKey) {
          error = 'Hugging Face API key is missing.'
        } else {
          const endpoint = process.env.HF_ENDPOINT_TEXT_TO_SPEECH?.trim()
            || `https://router.huggingface.co/hf-inference/models/${model}`
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: text }),
            signal: AbortSignal.timeout(60_000),
          }).catch(() => null)
          if (response?.ok) {
            audio = Buffer.from(await response.arrayBuffer())
            mimeType = response.headers.get('content-type') ?? mimeType
          } else {
            error = response ? `Hugging Face returned HTTP ${response.status}.` : 'Hugging Face TTS request failed.'
          }
        }
      }

      if (!audio?.length) {
        attempts.push({
          provider: entry.provider,
          model,
          adapter: `${entry.provider}_capability_adapter`,
          outputType: 'audio',
          status: error.includes('missing') ? 'needs_key' : 'test_failed',
          latencyMs: Date.now() - startedAt,
          error,
        })
        continue
      }
      const detected = detectArtifactContent(audio, mimeType)
      if (!detected.mimeType.startsWith('audio/')) {
        attempts.push({
          provider: entry.provider,
          model,
          adapter: `${entry.provider}_capability_adapter`,
          outputType: 'audio',
          status: 'invalid_output',
          latencyMs: Date.now() - startedAt,
          error: `Provider returned ${detected.mimeType}, not playable audio.`,
        })
        continue
      }
      audio = detected.content
      mimeType = detected.mimeType

      try {
        const artifact = await createArtifact({
          appSlug,
          executionId,
          type: 'voice',
          subType: capability,
          capability,
          title: `${capability === 'adult_voice' ? 'Adult voice' : 'TTS'}: ${text.slice(0, 80)}`,
          provider: entry.provider,
          model,
          traceId,
          content: audio,
          mimeType,
          metadata: { capability, executionId },
        })
        if (responseFormat === 'audio') {
          return new NextResponse(new Uint8Array(audio), {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': String(audio.length),
              'X-Capability': capability,
              'X-Provider': entry.provider,
              'X-Model': model,
              'X-Job-Status': 'completed',
              'X-Artifact-Id': artifact.id,
              'X-Storage-Url': artifact.storageUrl,
            },
          })
        }
        await recordCapabilityTrace({
          traceId,
          appSlug,
          adultModeState: capability === 'adult_voice' ? 'enabled' : 'off',
          capability,
          eventType: 'tts.completed',
          selectedRoute: { provider: entry.provider, model },
          artifactId: artifact.id,
          payload: { mimeType, bytes: audio.length, attempts },
        })
        return NextResponse.json(result({
          success: true,
          capability,
          traceId,
          provider: entry.provider,
          model,
          jobStatus: 'completed',
          artifactId: artifact.id,
          storageUrl: artifact.storageUrl,
          audioBase64: `data:${mimeType};base64,${audio.toString('base64')}`,
          attempts,
        }))
      } catch (artifactError) {
        return NextResponse.json(result({
          success: false,
          capability,
          traceId,
          provider: entry.provider,
          model,
          jobStatus: 'failed',
          error: `Generation completed but artifact persistence failed: ${artifactError instanceof Error ? artifactError.message : 'unknown error'}`,
          attempts,
        }), { status: 500 })
      }
    }

    return NextResponse.json(result({
      success: false,
      capability,
      traceId,
      jobStatus: 'needs_setup',
      error: `No tested ${capability} provider returned real audio.`,
      attempts,
    }), {
      status: 503,
      headers: {
        'X-Setup-Route': '/admin/dashboard/settings',
        'X-Test-Route': '/api/admin/settings/test-provider',
      },
    })
  } catch (error) {
    return NextResponse.json(result({
      success: false,
      capability: 'tts',
      traceId,
      jobStatus: 'failed',
      error: error instanceof Error ? error.message : 'TTS generation failed.',
    }), { status: 500 })
  }
}
