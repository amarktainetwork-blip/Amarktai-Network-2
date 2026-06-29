import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  blockedExplanation,
  getAppSafetyConfig,
  loadAppSafetyConfigFromDB,
  scanContent,
} from '@/lib/content-filter'
import { authenticateApp, getVaultApiKey } from '@/lib/brain'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'
import { getDefaultAdultTextModel } from '@/lib/adult-model-catalog'
import { getMediaCapabilityRoute } from '@/lib/media-capability-registry'
import { isTogetherAdultFallbackEnabled } from '@/lib/provider-capability-governance'

type AdultTextProvider = 'auto' | 'huggingface' | 'together'
type Attempt = {
  provider: Exclude<AdultTextProvider, 'auto'>
  model: string
  status: 'ready' | 'needs_endpoint' | 'needs_key' | 'test_failed'
  error?: string
}

const CAPABILITY = 'adult_text'
const SYSTEM_PROMPT =
  'You are an adult-oriented creative writing assistant for consenting adults only. ' +
  'All people and fictional characters must be unambiguously adults. Refuse minors, coercion, exploitation, ' +
  'non-consensual content, sexualized real-person impersonation, illegal activity, violence, hate, self-harm, or abuse.'

const DEGRADING_PATTERNS = [
  /\b(degrade|humiliate|worthless|subhuman)\s+(her|him|them|woman|man|person|partner)\b/i,
  /\b(degrading|humiliating|dehumanizing|dehumanising)\b/i,
  /\bmake\s+(her|him|them)\s+(beg|cry|suffer)\b/i,
]

function response(input: {
  success: boolean
  provider?: string | null
  model?: string | null
  jobStatus: string
  artifactId?: string | null
  storageUrl?: string | null
  error?: string | null
  blocker?: string | null
  output?: string | null
  traceId: string
  attempts?: Attempt[]
  status?: string
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
    output: input.output ?? null,
    traceId: input.traceId,
    attempts: input.attempts ?? [],
    status: input.status ?? input.jobStatus,
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

function extractText(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return (data[0] as { generated_text?: string } | undefined)?.generated_text ?? null
  if (!data || typeof data !== 'object') return null
  const record = data as {
    choices?: Array<{ message?: { content?: string }; text?: string }>
    generated_text?: string
    output?: string
  }
  return record.choices?.[0]?.message?.content
    ?? record.choices?.[0]?.text
    ?? record.generated_text
    ?? record.output
    ?? null
}

async function executeHuggingFace(
  apiKey: string | null,
  endpoint: string | null,
  model: string,
  prompt: string,
): Promise<{ output: string | null; attempt: Attempt }> {
  if (!endpoint) {
    return {
      output: null,
      attempt: {
        provider: 'huggingface',
        model,
        status: 'needs_endpoint',
        error: 'Configure a tested Hugging Face private inference endpoint for adult text.',
      },
    }
  }
  const validated = validateEndpoint(endpoint)
  if (!validated) {
    return { output: null, attempt: { provider: 'huggingface', model, status: 'test_failed', error: 'Invalid Hugging Face endpoint.' } }
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const res = await fetch(validated, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: `${SYSTEM_PROMPT}\n\nUser: ${prompt}\nAssistant:`,
        parameters: { max_new_tokens: 900, return_full_text: false, temperature: 0.75 },
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const body = await res.text()
    const output = res.ok ? extractText(JSON.parse(body)) : null
    return output
      ? { output, attempt: { provider: 'huggingface', model, status: 'ready' } }
      : {
        output: null,
        attempt: {
          provider: 'huggingface',
          model,
          status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed',
          error: body || `Hugging Face returned HTTP ${res.status}.`,
        },
      }
  } catch (error) {
    return {
      output: null,
      attempt: { provider: 'huggingface', model, status: 'test_failed', error: error instanceof Error ? error.message : 'Hugging Face failed.' },
    }
  }
}

function togetherAdultConfigBlocker() {
  return 'Together adult_text fallback is disabled. Set TOGETHER_ADULT_FALLBACK_ENABLED=true and TOGETHER_ADULT_TEXT_MODEL to an approved Together text model.'
}

function huggingFaceAdultTextCandidates() {
  const fallbackModel = getDefaultAdultTextModel().id
  return [
    {
      provider: 'huggingface' as const,
      endpoint: process.env.HF_ADULT_TEXT_ENDPOINT ?? null,
      model: process.env.HF_ADULT_TEXT_MODEL?.trim() || fallbackModel,
    },
    {
      provider: 'huggingface' as const,
      endpoint: process.env.HF_ADULT_TEXT_ENDPOINT_FALLBACK ?? null,
      model: process.env.HF_ADULT_TEXT_MODEL_FALLBACK?.trim() || fallbackModel,
    },
  ]
}

async function executeTogether(
  apiKey: string | null,
  model: string | null,
  prompt: string,
): Promise<{ output: string | null; attempt: Attempt }> {
  const resolvedModel = model?.trim() ?? ''
  if (!isTogetherAdultFallbackEnabled(CAPABILITY) || !resolvedModel) {
    return {
      output: null,
      attempt: {
        provider: 'together',
        model: resolvedModel || 'TOGETHER_ADULT_TEXT_MODEL',
        status: 'needs_endpoint',
        error: togetherAdultConfigBlocker(),
      },
    }
  }
  if (!apiKey) {
    return { output: null, attempt: { provider: 'together', model: resolvedModel, status: 'needs_key', error: 'Together API key is missing.' } }
  }
  try {
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 900,
        temperature: 0.75,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const body = await res.text()
    const data = body ? await Promise.resolve().then(() => JSON.parse(body) as unknown).catch(() => body) : null
    const output = res.ok ? extractText(data) : null
    return output
      ? { output, attempt: { provider: 'together', model: resolvedModel, status: 'ready' } }
      : {
        output: null,
        attempt: {
          provider: 'together',
          model: resolvedModel,
          status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed',
          error: body || `Together returned HTTP ${res.status}.`,
        },
      }
  } catch (error) {
    return {
      output: null,
      attempt: { provider: 'together', model: resolvedModel, status: 'test_failed', error: error instanceof Error ? error.message : 'Together adult text failed.' },
    }
  }
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
    const prompt = String(body.prompt ?? body.message ?? '').trim()
    const auth = await authorizeAdultRequest(body)
    if (!auth.ok) {
      return NextResponse.json(response({ success: false, traceId, jobStatus: 'blocked', status: 'unauthorized', error: auth.error }), { status: auth.status })
    }
    const appSlug = auth.appSlug
    if (!prompt) {
      return NextResponse.json(response({ success: false, traceId, jobStatus: 'blocked', error: 'prompt or message is required.' }), { status: 400 })
    }

    await loadAppSafetyConfigFromDB(appSlug)
    const safety = getAppSafetyConfig(appSlug)
    if (safety.safeMode || !safety.adultMode) {
      return NextResponse.json(response({
        success: false,
        traceId,
        jobStatus: 'blocked',
        status: 'needs_adult_mode',
        error: 'Adult text requires adultMode=true and safeMode=false for this app.',
      }), { status: 403 })
    }

    const inputScan = scanContent(prompt, appSlug)
    if (inputScan.flagged || DEGRADING_PATTERNS.some((pattern) => pattern.test(prompt))) {
      const error = inputScan.flagged
        ? blockedExplanation(inputScan.categories)
        : 'Degrading, coercive, or dehumanizing adult content is not allowed.'
      return NextResponse.json(response({ success: false, traceId, jobStatus: 'blocked', status: 'policy_refused', error }), { status: 422 })
    }

    const provider = (typeof body.provider === 'string' ? body.provider : 'auto') as AdultTextProvider
    if (!['auto', 'huggingface', 'together'].includes(provider)) {
      return NextResponse.json(response({
        success: false,
        traceId,
        jobStatus: 'blocked',
        error: `Provider "${provider}" is not in the canonical adult_text route. Configure Hugging Face primary or explicit Together adult fallback.`,
      }), { status: 400 })
    }
    if (provider === 'together' && !isTogetherAdultFallbackEnabled(CAPABILITY)) {
      return NextResponse.json(response({
        success: false,
        traceId,
        provider: 'together',
        model: process.env.TOGETHER_ADULT_TEXT_MODEL ?? null,
        jobStatus: 'needs_setup',
        status: 'needs_setup',
        error: togetherAdultConfigBlocker(),
        attempts: [{ provider: 'together', model: process.env.TOGETHER_ADULT_TEXT_MODEL ?? 'TOGETHER_ADULT_TEXT_MODEL', status: 'needs_endpoint', error: togetherAdultConfigBlocker() }],
      }), { status: 409 })
    }

    const route = getMediaCapabilityRoute(CAPABILITY)!
    const attempts: Attempt[] = []
    const hfKey = await getVaultApiKey('huggingface')
    const togetherKey = await getVaultApiKey('together')
    const chain = [
      ...huggingFaceAdultTextCandidates().filter((entry) =>
        route.providers.some((providerRoute) => providerRoute.provider === entry.provider) &&
        (provider === 'auto' || entry.provider === provider),
      ),
      ...(provider === 'auto' || provider === 'together'
        ? [{ provider: 'together' as const, endpoint: null, model: process.env.TOGETHER_ADULT_TEXT_MODEL ?? 'TOGETHER_ADULT_TEXT_MODEL' }]
        : []),
    ]

    for (const entry of chain) {
      const model = entry.provider === 'together'
        ? process.env.TOGETHER_ADULT_TEXT_MODEL ?? 'TOGETHER_ADULT_TEXT_MODEL'
        : entry.model
      const result = entry.provider === 'together'
        ? await executeTogether(togetherKey, model, prompt)
        : await executeHuggingFace(hfKey, entry.endpoint, model, prompt)
      attempts.push(result.attempt)
      if (!result.output) continue

      const outputScan = scanContent(result.output, appSlug)
      if (outputScan.flagged || DEGRADING_PATTERNS.some((pattern) => pattern.test(result.output!))) {
        return NextResponse.json(response({
          success: false,
          traceId,
          provider: entry.provider,
          model,
          jobStatus: 'blocked',
          status: 'output_policy_refused',
          error: outputScan.flagged ? blockedExplanation(outputScan.categories) : 'Provider output violated adult safety policy.',
          attempts,
        }), { status: 422 })
      }

      try {
        const artifact = await createArtifact({
          appSlug,
          type: 'document',
          subType: CAPABILITY,
          title: `Adult text: ${prompt.slice(0, 80)}`,
          provider: entry.provider,
          model,
          traceId,
          content: Buffer.from(result.output, 'utf8'),
          mimeType: 'text/plain',
          metadata: { capability: CAPABILITY },
        })
        return NextResponse.json(response({
          success: true,
          traceId,
          provider: entry.provider,
          model,
          jobStatus: 'completed',
          artifactId: artifact.id,
          storageUrl: artifact.storageUrl,
          output: result.output,
          attempts,
        }))
      } catch (error) {
        return NextResponse.json(response({
          success: false,
          traceId,
          provider: entry.provider,
          model,
          jobStatus: 'failed',
          error: `Generation completed but artifact persistence failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          attempts,
        }), { status: 500 })
      }
    }

    return NextResponse.json(response({
      success: false,
      traceId,
      jobStatus: 'needs_setup',
      status: 'needs_setup',
      error: 'No tested adult text provider returned output. Configure a Hugging Face private endpoint.',
      attempts,
    }), { status: 503 })
  } catch (error) {
    return NextResponse.json(response({
      success: false,
      traceId,
      jobStatus: 'failed',
      error: error instanceof Error ? error.message : 'Unknown adult text error.',
    }), { status: 500 })
  }
}
