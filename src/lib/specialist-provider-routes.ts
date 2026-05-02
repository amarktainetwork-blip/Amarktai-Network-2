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

export async function runQwenWanxImage(params: {
  prompt: string
  model?: string
  size?: string
  timeoutMs?: number
}): Promise<SpecialistResult> {
  const startedAt = Date.now()
  const key = await firstKey('qwen', ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'])
  const model = params.model ?? 'wanx2.1-t2i-turbo'
  if (!key) {
    return { ok: false, executed: false, provider: 'qwen', model, capability: 'text_to_image', latencyMs: Date.now() - startedAt, error: 'Qwen/DashScope key not configured.' }
  }

  try {
    const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model,
        input: { prompt: params.prompt },
        parameters: { size: params.size ?? '1024*1024', n: 1 },
      }),
      signal: AbortSignal.timeout(params.timeoutMs ?? 30_000),
    })
    return responseToResult(response, { provider: 'qwen', model, capability: 'text_to_image', startedAt })
  } catch (error) {
    return { ok: false, executed: true, provider: 'qwen', model, capability: 'text_to_image', latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Qwen Wanx image request failed' }
  }
}

export async function runMiniMaxTts(params: {
  text: string
  model?: string
  voiceId?: string
  timeoutMs?: number
}): Promise<SpecialistResult> {
  const startedAt = Date.now()
  const key = await firstKey('minimax', ['MINIMAX_API_KEY', 'MIMO_API_KEY'])
  const groupId = process.env.MINIMAX_GROUP_ID || process.env.MIMO_GROUP_ID || ''
  const model = params.model ?? 'speech-2.6-turbo'
  if (!key) {
    return { ok: false, executed: false, provider: 'minimax', model, capability: 'text_to_speech', latencyMs: Date.now() - startedAt, error: 'MiniMax/Mimo key not configured.' }
  }

  const url = groupId
    ? `https://api.minimax.io/v1/t2a_v2?GroupId=${encodeURIComponent(groupId)}`
    : 'https://api.minimax.io/v1/t2a_v2'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        text: params.text,
        stream: false,
        voice_setting: {
          voice_id: params.voiceId ?? 'male-qn-qingse',
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
      signal: AbortSignal.timeout(params.timeoutMs ?? 45_000),
    })

    const latencyMs = Date.now() - startedAt
    const contentType = response.headers.get('content-type') ?? 'application/json'
    if (!response.ok) {
      return { ok: false, executed: true, provider: 'minimax', model, capability: 'text_to_speech', latencyMs, contentType, error: `MiniMax HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 800)}` }
    }

    const json = await response.json().catch(() => null) as { data?: { audio?: string }; base_resp?: { status_msg?: string } } | null
    const hexAudio = json?.data?.audio
    if (!hexAudio) {
      return { ok: false, executed: true, provider: 'minimax', model, capability: 'text_to_speech', latencyMs, contentType, json, error: json?.base_resp?.status_msg ?? 'MiniMax returned no audio payload.' }
    }
    const bytes = Buffer.from(hexAudio, 'hex').buffer
    return { ok: true, executed: true, provider: 'minimax', model, capability: 'text_to_speech', latencyMs, contentType: 'audio/mpeg', bytes, json }
  } catch (error) {
    return { ok: false, executed: true, provider: 'minimax', model, capability: 'text_to_speech', latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'MiniMax TTS failed' }
  }
}
