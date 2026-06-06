import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import { getVaultApiKey } from '@/lib/brain'
import { createArtifact } from '@/lib/artifact-store'
import { getAdultImageModels } from '@/lib/adult-model-catalog'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'

const CAPABILITY = 'adult_image'
const ALLOWED_SIZES = ['512x512', '768x768', '1024x1024'] as const
type AdultImageProvider = 'auto' | 'together' | 'huggingface'

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

export async function POST(request: NextRequest) {
  const traceId = randomUUID()
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const appSlug = typeof body.appSlug === 'string' ? body.appSlug : ''
    if (!prompt || !appSlug) {
      return NextResponse.json(payload({ success: false, traceId, jobStatus: 'blocked', error: 'prompt and appSlug are required.' }), { status: 400 })
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

    const requestedProvider = (typeof body.provider === 'string' ? body.provider : 'auto') as AdultImageProvider
    if (!['auto', 'together', 'huggingface'].includes(requestedProvider)) {
      return NextResponse.json(payload({
        success: false,
        traceId,
        jobStatus: 'blocked',
        error: `Provider "${requestedProvider}" is not in the canonical adult_image route.`,
      }), { status: 400 })
    }

    const size = ALLOWED_SIZES.includes(body.size as typeof ALLOWED_SIZES[number])
      ? body.size as typeof ALLOWED_SIZES[number]
      : '768x768'
    const [width, height] = size.split('x').map(Number)
    const requestedModel = typeof body.model === 'string' && body.model ? body.model : null
    const route = getMediaCapabilityRoute(CAPABILITY)!
    const attempts: Array<Record<string, unknown>> = []

    for (const entry of route.providers.filter((candidate) => requestedProvider === 'auto' || candidate.provider === requestedProvider)) {
      const model = requestedModel ?? entry.model
      if (entry.provider === 'together') {
        const apiKey = await getVaultApiKey('together')
        if (!apiKey) {
          attempts.push({ provider: entry.provider, model, status: 'needs_key' })
          continue
        }
        try {
          const res = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, n: 1, steps: 4, width, height, disable_safety_checker: true }),
            signal: AbortSignal.timeout(60_000),
          })
          const data = await res.json().catch(() => ({})) as { data?: Array<{ url?: string; b64_json?: string }> }
          const imageUrl = data.data?.[0]?.url
          const imageBase64 = data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : undefined
          if (res.ok && (imageUrl || imageBase64)) {
            return persistImage({ appSlug, prompt, provider: entry.provider, model, traceId, imageUrl, imageBase64, attempts })
          }
          attempts.push({ provider: entry.provider, model, status: 'test_failed', httpStatus: res.status })
        } catch (error) {
          attempts.push({ provider: entry.provider, model, status: 'test_failed', error: error instanceof Error ? error.message : 'Together failed.' })
        }
      }

      if (entry.provider === 'huggingface') {
        const apiKey = await getVaultApiKey('huggingface')
        if (!apiKey) {
          attempts.push({ provider: entry.provider, model, status: 'needs_key' })
          continue
        }
        const hfModel = requestedModel ?? getAdultImageModels()[0]?.id ?? entry.model
        try {
          const res = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
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
    }

    return NextResponse.json(payload({
      success: false,
      traceId,
      jobStatus: 'needs_setup',
      error: 'No tested adult image provider returned a real image. Configure Together or Hugging Face.',
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
