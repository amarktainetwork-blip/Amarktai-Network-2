import { getServiceKey } from '@/lib/service-vault'

export interface SpecialistResult {
  ok: boolean
  provider: string
  model: string
  capability: string
  latencyMs: number
  contentType?: string
  bytes?: ArrayBuffer
  json?: unknown
  text?: string
  error?: string
  executed: boolean
}

async function firstKey(provider: string, envVars: string[]) {
  for (const envVar of envVars) {
    const key = await getServiceKey(provider, envVar)
    if (key) return key.trim().replace(/^Bearer\s+/i, '')
  }
  return null
}

async function responseToResult(
  response: Response,
  meta: { provider: string; model: string; capability: string; startedAt: number },
): Promise<SpecialistResult> {
  const latencyMs = Date.now() - meta.startedAt
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  if (!response.ok) {
    return {
      ok: false,
      executed: true,
      provider: meta.provider,
      model: meta.model,
      capability: meta.capability,
      latencyMs,
      contentType,
      error: `${meta.provider} HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 800)}`,
    }
  }

  if (contentType.includes('application/json')) {
    const json = await response.json().catch(() => null)
    return { ok: true, executed: true, provider: meta.provider, model: meta.model, capability: meta.capability, latencyMs, contentType, json }
  }

  const bytes = await response.arrayBuffer()
  return { ok: true, executed: true, provider: meta.provider, model: meta.model, capability: meta.capability, latencyMs, contentType, bytes }
}

export async function runHuggingFaceInference(params: {
  modelId?: string
  endpointUrl?: string
  inputs: unknown
  capability: string
  timeoutMs?: number
}): Promise<SpecialistResult> {
  const startedAt = Date.now()
  const key = await firstKey('huggingface', ['HUGGINGFACE_API_KEY'])
  const model = params.modelId ?? 'custom:huggingface-model'
  if (!key) {
    return { ok: false, executed: false, provider: 'huggingface', model, capability: params.capability, latencyMs: Date.now() - startedAt, error: 'Hugging Face key not configured.' }
  }

  const url = params.endpointUrl?.trim()
    ? params.endpointUrl.trim()
    : `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: params.inputs }),
      signal: AbortSignal.timeout(params.timeoutMs ?? 45_000),
    })
    return responseToResult(response, { provider: 'huggingface', model, capability: params.capability, startedAt })
  } catch (error) {
    return { ok: false, executed: true, provider: 'huggingface', model, capability: params.capability, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Hugging Face inference failed' }
  }
}
