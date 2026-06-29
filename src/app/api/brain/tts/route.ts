import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'
import { callGenXMedia, GENX_DEFAULT_TTS_MODEL, GENX_TTS_MODELS } from '@/lib/genx-client'
import { createArtifact } from '@/lib/artifact-store'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'

type TtsCapability = 'tts' | 'adult_voice'
type TtsProvider = 'auto' | 'genx' | 'groq' | 'huggingface'

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
    const responseFormat = body.responseFormat === 'audio' ? 'audio' : 'json'
    if (!text) {
      return NextResponse.json(result({ success: false, capability, traceId, jobStatus: 'blocked', error: 'text is required.' }), { status: 400 })
    }

    if (capability === 'adult_voice') {
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
    if (!['auto', 'genx', 'groq', 'huggingface'].includes(requestedProviderValue)) {
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

    for (const entry of route.providers.filter((candidate) => requestedProvider === 'auto' || candidate.provider === requestedProvider)) {
      const model = requestedModel ?? entry.model
      let audio: Buffer | null = null
      let mimeType = 'audio/mpeg'
      let error = ''

      if (entry.provider === 'genx') {
        const genxModel = GENX_TTS_MODELS.includes(model as (typeof GENX_TTS_MODELS)[number]) ? model : GENX_DEFAULT_TTS_MODEL
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
            metadata: { capability, traceId },
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
        const apiKey = await getVaultApiKey('huggingface')
        if (!apiKey) {
          error = 'Hugging Face API key is missing.'
        } else {
          const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
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

      if (entry.provider === 'groq') {
        const apiKey = await getVaultApiKey('groq')
        if (!apiKey) {
          error = 'Groq API key is missing.'
        } else {
          const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              input: text,
              voice: typeof body.voice === 'string' && body.voice ? body.voice : 'Arista-PlayAI',
              response_format: 'mp3',
            }),
            signal: AbortSignal.timeout(60_000),
          }).catch(() => null)
          if (response?.ok) {
            audio = Buffer.from(await response.arrayBuffer())
            mimeType = response.headers.get('content-type') ?? mimeType
          } else {
            const providerBody = response ? await response.text().catch(() => '') : ''
            error = response
              ? `Groq TTS returned HTTP ${response.status}: ${providerBody || 'no provider error body'}`
              : 'Groq TTS request failed.'
          }
        }
      }

      if (!audio?.length) {
        attempts.push({ provider: entry.provider, model, status: error.includes('missing') ? 'needs_key' : 'test_failed', error })
        continue
      }

      try {
        const artifact = await createArtifact({
          appSlug,
          type: 'audio',
          subType: capability,
          title: `${capability === 'adult_voice' ? 'Adult voice' : 'TTS'}: ${text.slice(0, 80)}`,
          provider: entry.provider,
          model,
          traceId,
          content: audio,
          mimeType,
          metadata: { capability },
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
    }), { status: 503 })
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
