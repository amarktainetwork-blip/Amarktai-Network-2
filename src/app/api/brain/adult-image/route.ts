import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import { authenticateApp, getVaultApiKey } from '@/lib/brain'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { getAdultImageModels } from '@/lib/adult-model-catalog'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { isTogetherAdultFallbackEnabled } from '@/lib/provider-capability-governance'

const CAPABILITY = 'adult_image'
const ALLOWED_SIZES = ['512x512', '768x768', '1024x1024'] as const
type AdultImageProvider = 'auto' | 'huggingface'
type ExecutableAdultImageProvider = 'huggingface' | 'together'

function payload(input: {
  success: boolean
  provider?: string | null
  model?: string | null
  jobStatus: string
  artifactId?: string | null
  storageUrl?: string | null
  error?: string | null
  blocker?: string | null
  imageUrl?: string
  imageBase64?: string
  traceId: string
  attempts?: Array<Record<string, unknown>>
}) {
  return {
    success: input.success,
    executed: input.success,
    capability: CAPABILITY,
    provider: input.provider ?? null,
    model: input.model ?? null,
    jobStatus: input.jobStatus,
    artifactId: input.artifactId ?? null,
    storageUrl: input.storageUrl ?? null,
    error: input.error ?? null,
    blocker: input.blocker ?? input.error ?? null,
    imageUrl: input.imageUrl,
    imageBase64: input.imageBase64,
    traceId: input.traceId,
    attempts: input.attempts ?? [],
  }
}

function validateEndpoint(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (process.env.NODE_ENV === 'production' && /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return null
    return url.href.replace(/\/$/, '')
  } catch {
    return null
  }
}

function togetherAdultImageConfigBlocker() {
  return 'Together adult_image fallback is disabled. Set TOGETHER_ADULT_FALLBACK_ENABLED=true and TOGETHER_ADULT_IMAGE_MODEL to an approved Together image model.'
}

function huggingFaceAdultImageCandidates() {
  const fallbackModel = getAdultImageModels()[0]?.id ?? 'HF_ADULT_IMAGE_MODEL'
  return [
    {
      provider: 'huggingface' as const,
      endpoint: process.env.HF_ADULT_IMAGE_ENDPOINT ?? null,
      model: process.env.HF_ADULT_IMAGE_MODEL?.trim() || fallbackModel,
    },
    {
      provider: 'huggingface' as const,
      endpoint: process.env.HF_ADULT_IMAGE_ENDPOINT_FALLBACK ?? null,
      model: process.env.HF_ADULT_IMAGE_MODEL_FALLBACK?.trim() || fallbackModel,
    },
  ]
}

async function authorizeAdultRequest(body: Record<string, unknown>): Promise<{ ok: true; appSlug: string } | { ok: false; status: number; error: string }> {
  const session = await getSession()
  if (session.isLoggedIn) {
    return { ok: true, appSlug: typeof body.appSlug === 'string' && body.appSlug ? body.appSlug : '__admin_test__' }
  }

  const appId = typeof body.appId === 'string'
    ? body.appId
    : typeof body.app_id === 'string'
      ? body.app_id
      : ''
  const appSecret = typeof body.appSecret === 'string'
    ? body.appSecret
    : typeof body.app_secret === 'string'
      ? body.app_secret
      : ''
  const auth = await authenticateApp(appId, appSecret)
  if (!auth.ok || !auth.app) {
    return { ok: false, status: auth.statusCode || 401, error: auth.error ?? 'Unauthorized' }
  }
  return { ok: true, appSlug: auth.app.slug }
}

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const auth = await authorizeAdultRequest(body)
    if (!auth.ok) {
      return NextResponse.json(payload({ success: false, traceId, jobStatus: 'blocked', error: auth.error }), { status: auth.status })
    }
    const appSlug = auth.appSlug
    if (!prompt) {
      return NextResponse.json(payload({ success: false, traceId, jobStatus: 'blocked', error: 'prompt is required.' }), { status: 400 })
    }

    await loadAppSafetyConfigFromDB(appSlug)
    const safety = getAppSafetyConfig(appSlug)
    if (safety.safeMode || !safety.adultMode) {
      return NextResponse.json(payload({
        success: false,
        traceId,
        jobStatus: 'blocked',
        error: 'Adult image requires adultMode=true and safeMode=false for this app.',
      }), { status: 403 })
    }

    const scan = scanContent(prompt, appSlug)
    if (scan.flagged) {
      return NextResponse.json(payload({
        success: false,
        traceId,
        jobStatus: 'blocked',
        error: `Prompt blocked by policy: ${scan.categories.join(', ')}.`,
      }), { status: 422 })
    }

    const requestedProvider = (typeof body.provider === 'string' ? body.provider : 'auto') as AdultImageProvider | 'together'
    if (!['auto', 'huggingface', 'together'].includes(requestedProvider)) {
      return NextResponse.json(payload({
        success: false,
        traceId,
        jobStatus: 'blocked',
        error: `Provider "${requestedProvider}" is not in the canonical adult_image route. Configure Hugging Face primary or explicit Together adult fallback.`,
      }), { status: 400 })
    }
    if (requestedProvider === 'together' && !isTogetherAdultFallbackEnabled(CAPABILITY)) {
      return NextResponse.json(payload({
        success: false,
        traceId,
        provider: 'together',
        model: process.env.TOGETHER_ADULT_IMAGE_MODEL ?? null,
        jobStatus: 'needs_setup',
        error: togetherAdultImageConfigBlocker(),
        attempts: [{ provider: 'together', model: process.env.TOGETHER_ADULT_IMAGE_MODEL ?? 'TOGETHER_ADULT_IMAGE_MODEL', status: 'needs_endpoint', error: togetherAdultImageConfigBlocker() }],
      }), { status: 409 })
    }

    const size = ALLOWED_SIZES.includes(body.size as typeof ALLOWED_SIZES[number])
      ? body.size as typeof ALLOWED_SIZES[number]
      : '768x768'
    const [width, height] = size.split('x').map(Number)
    const route = getMediaCapabilityRoute(CAPABILITY)!
    const attempts: Array<Record<string, unknown>> = []

    const providerChain: Array<{ provider: ExecutableAdultImageProvider; model: string; endpoint: string | null }> = [
      ...huggingFaceAdultImageCandidates()
        .filter((candidate) =>
          route.providers.some((providerRoute) => providerRoute.provider === candidate.provider) &&
          (requestedProvider === 'auto' || candidate.provider === requestedProvider),
        )
        .map((candidate) => ({ provider: candidate.provider as ExecutableAdultImageProvider, model: candidate.model, endpoint: candidate.endpoint })),
      ...(requestedProvider === 'auto' || requestedProvider === 'together'
        ? [{ provider: 'together' as const, model: process.env.TOGETHER_ADULT_IMAGE_MODEL ?? 'TOGETHER_ADULT_IMAGE_MODEL', endpoint: null }]
        : []),
    ]

    for (const entry of providerChain) {
      if (entry.provider === 'huggingface') {
        const apiKey = await getVaultApiKey('huggingface')
        if (!apiKey) {
          attempts.push({ provider: entry.provider, model: entry.model, status: 'needs_key' })
          continue
        }
        if (!entry.endpoint) {
          attempts.push({ provider: entry.provider, model: entry.model, status: 'needs_endpoint', error: 'Configure HF_ADULT_IMAGE_ENDPOINT or HF_ADULT_IMAGE_ENDPOINT_FALLBACK.' })
          continue
        }
        const validated = validateEndpoint(entry.endpoint)
        if (!validated) {
          attempts.push({ provider: entry.provider, model: entry.model, status: 'test_failed', error: 'Invalid Hugging Face adult image endpoint.' })
          continue
        }
        const hfModel = entry.model
        try {
          const res = await fetch(validated, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                width,
                height,
                negative_prompt: typeof body.negative_prompt === 'string' ? body.negative_prompt : undefined,
              },
            }),
            signal: AbortSignal.timeout(120_000),
          })
          const contentType = res.headers.get('content-type') ?? ''
          if (res.ok && (contentType.startsWith('image/') || contentType === 'application/octet-stream')) {
            const bytes = Buffer.from(await res.arrayBuffer())
            if (bytes.length > 0) {
              const imageBase64 = `data:${contentType.startsWith('image/') ? contentType : 'image/png'};base64,${bytes.toString('base64')}`
              return persistImage({ appSlug, prompt, provider: entry.provider, model: hfModel, traceId, imageBase64, attempts })
            }
          }
          attempts.push({ provider: entry.provider, model: hfModel, status: 'test_failed', httpStatus: res.status })
        } catch (error) {
          attempts.push({ provider: entry.provider, model: hfModel, status: 'test_failed', error: error instanceof Error ? error.message : 'Hugging Face failed.' })
        }
      }

      if (entry.provider === 'together') {
        const model = process.env.TOGETHER_ADULT_IMAGE_MODEL ?? ''
        if (!isTogetherAdultFallbackEnabled(CAPABILITY) || !model) {
          attempts.push({ provider: entry.provider, model: model || 'TOGETHER_ADULT_IMAGE_MODEL', status: 'needs_endpoint', error: togetherAdultImageConfigBlocker() })
          continue
        }
        const apiKey = await getVaultApiKey('together')
        if (!apiKey) {
          attempts.push({ provider: entry.provider, model, status: 'needs_key', error: 'Together API key is missing.' })
          continue
        }
        try {
          const res = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              prompt,
              width,
              height,
              n: 1,
              steps: typeof body.steps === 'number' ? body.steps : 4,
            }),
            signal: AbortSignal.timeout(120_000),
          })
          const data = await res.json().catch(() => null) as { data?: Array<{ url?: string; b64_json?: string }>; error?: unknown } | null
          const imageUrl = data?.data?.[0]?.url ?? null
          const b64 = data?.data?.[0]?.b64_json ?? null
          if (res.ok && (imageUrl || b64)) {
            return persistImage({
              appSlug,
              prompt,
              provider: entry.provider,
              model,
              traceId,
              imageUrl: imageUrl ?? undefined,
              imageBase64: b64 ? `data:image/png;base64,${b64}` : undefined,
              attempts,
            })
          }
          attempts.push({ provider: entry.provider, model, status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed', httpStatus: res.status, error: JSON.stringify(data?.error ?? data ?? {}).slice(0, 500) })
        } catch (error) {
          attempts.push({ provider: entry.provider, model, status: 'test_failed', error: error instanceof Error ? error.message : 'Together adult image failed.' })
        }
      }
    }

    return NextResponse.json(payload({
      success: false,
      traceId,
      jobStatus: 'needs_setup',
      error: requestedProvider === 'together' ? togetherAdultImageConfigBlocker() : 'No tested adult image provider returned a real image. Configure Hugging Face primary or explicit Together adult fallback.',
      attempts,
    }), { status: 503 })
  } catch (error) {
    return NextResponse.json(payload({
      success: false,
      traceId,
      jobStatus: 'failed',
      error: error instanceof Error ? error.message : 'Adult image generation failed.',
    }), { status: 500 })
  }
}

async function persistImage(input: {
  appSlug: string
  prompt: string
  provider: string
  model: string
  traceId: string
  imageUrl?: string
  imageBase64?: string
  attempts: Array<Record<string, unknown>>
}) {
  try {
    const match = input.imageBase64?.match(/^data:([^;]+);base64,(.+)$/)
    const artifact = await createArtifact({
      appSlug: input.appSlug,
      type: 'image',
      subType: CAPABILITY,
      title: `Adult image: ${input.prompt.slice(0, 80)}`,
      provider: input.provider,
      model: input.model,
      traceId: input.traceId,
      content: match ? Buffer.from(match[2], 'base64') : undefined,
      contentUrl: input.imageUrl,
      mimeType: match?.[1] ?? 'image/png',
      metadata: { capability: CAPABILITY },
    })
    return NextResponse.json(payload({
      success: true,
      traceId: input.traceId,
      provider: input.provider,
      model: input.model,
      jobStatus: 'completed',
      artifactId: artifact.id,
      storageUrl: artifact.storageUrl,
      imageUrl: input.imageUrl,
      imageBase64: input.imageBase64,
      attempts: input.attempts,
    }))
  } catch (error) {
    return NextResponse.json(payload({
      success: false,
      traceId: input.traceId,
      provider: input.provider,
      model: input.model,
      jobStatus: 'failed',
      error: `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      attempts: input.attempts,
    }), { status: 500 })
  }
}
