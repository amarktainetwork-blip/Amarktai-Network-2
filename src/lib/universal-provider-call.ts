import { callProvider, type ProviderCallResult } from '@/lib/brain'
import { getServiceKey } from '@/lib/service-vault'
import { buildProviderAuthHeaders, getProviderInfo } from '@/lib/provider-registry'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

interface OpenAICompatibleConfig {
  providerKey: string
  baseUrl: string
  envVars: string[]
  defaultModel: string
  extraHeaders?: Record<string, string>
  timeoutMs?: number
  supportsStreaming?: boolean
}

const OPENAI_COMPATIBLE: Record<string, OpenAICompatibleConfig> = {
  qwen: {
    providerKey: 'qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    envVars: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
    defaultModel: 'qwen-plus',
    timeoutMs: 25_000,
    supportsStreaming: true,
  },
  groq: {
    providerKey: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    envVars: ['GROQ_API_KEY'],
    defaultModel: 'llama-3.3-70b-versatile',
    timeoutMs: 18_000,
    supportsStreaming: true,
  },
  together: {
    providerKey: 'together',
    baseUrl: 'https://api.together.ai/v1',
    envVars: ['TOGETHER_API_KEY'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    timeoutMs: 30_000,
    supportsStreaming: true,
  },
  mimo: {
    providerKey: 'mimo',
    baseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1',
    envVars: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
    defaultModel: 'mimo-v2.5',
    timeoutMs: 35_000,
    supportsStreaming: true,
  },
}

export interface UniversalProviderRequest {
  providerKey: string
  model: string
  message: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

export interface UniversalStreamEvent {
  type: 'start' | 'token' | 'done' | 'error'
  content?: string
  error?: string
  providerKey: string
  model: string
  latencyMs?: number
  firstTokenMs?: number
  streaming?: 'native' | 'fallback'
}

async function resolveKey(providerKey: string, envVars: string[]): Promise<string | null> {
  for (const envVar of envVars) {
    const key = await getServiceKey(providerKey, envVar)
    if (key) return key.trim().replace(/^Bearer\s+/i, '')
  }
  return null
}

export function isUniversalProvider(providerKey: string) {
  return providerKey in OPENAI_COMPATIBLE
}

export function listUniversalProviders() {
  return Object.entries(OPENAI_COMPATIBLE).map(([key, config]) => ({
    key,
    baseUrl: config.baseUrl,
    envVars: config.envVars,
    defaultModel: config.defaultModel,
    timeoutMs: config.timeoutMs ?? 30_000,
    supportsStreaming: config.supportsStreaming === true,
  }))
}

function resolveUniversalConfig(providerKey: string) {
  return OPENAI_COMPATIBLE[providerKey]
}

function resolveModel(request: UniversalProviderRequest, config: OpenAICompatibleConfig) {
  return request.model && !request.model.startsWith('custom:') ? request.model : config.defaultModel
}

function messages(request: UniversalProviderRequest) {
  return [
    ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
    { role: 'user', content: request.message },
  ]
}

function parseStreamData(line: string): string | null {
  if (!line.startsWith('data:')) return null
  const payload = line.slice('data:'.length).trim()
  if (!payload || payload === '[DONE]') return null
  try {
    const data = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: string }
        message?: { content?: string }
        text?: string
      }>
      output_text?: string
      error?: { message?: string }
    }
    if (data.error?.message) throw new Error(data.error.message)
    return data.choices?.[0]?.delta?.content
      ?? data.choices?.[0]?.message?.content
      ?? data.choices?.[0]?.text
      ?? data.output_text
      ?? null
  } catch {
    return null
  }
}

async function openAICompatibleRequest(request: UniversalProviderRequest, stream: boolean) {
  const config = resolveUniversalConfig(request.providerKey)
  if (!config) return null
  const apiKey = await resolveKey(config.providerKey, config.envVars)
  if (!apiKey) {
    throw new Error(`Provider "${request.providerKey}" is not configured. Add ${config.envVars.join(' or ')} in Settings.`)
  }
  const model = resolveModel(request, config)
  const timeoutMs = request.timeoutMs ?? config.timeoutMs ?? 30_000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const baseUrl = getProviderInfo(
    config.providerKey as ApprovedDirectProviderId,
  )?.baseUrl ?? config.baseUrl

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildProviderAuthHeaders(
          config.providerKey as ApprovedDirectProviderId,
          apiKey,
        ),
        ...(config.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        messages: messages(request),
        max_tokens: request.maxTokens ?? 1400,
        temperature: request.temperature ?? 0.4,
        stream,
      }),
      signal: controller.signal,
    })
    return { res, model, config, timeout }
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

export async function streamUniversalProvider(
  request: UniversalProviderRequest,
  onEvent: (event: UniversalStreamEvent) => void,
): Promise<ProviderCallResult> {
  const start = Date.now()
  const config = resolveUniversalConfig(request.providerKey)
  if (!config || config.supportsStreaming !== true) {
    const result = await callUniversalProvider(request)
    if (result.output) onEvent({ type: 'token', content: result.output, providerKey: result.providerKey, model: result.model, streaming: 'fallback' })
    onEvent({ type: result.ok ? 'done' : 'error', error: result.error ?? undefined, providerKey: result.providerKey, model: result.model, latencyMs: result.latencyMs, streaming: 'fallback' })
    return result
  }

  const model = resolveModel(request, config)
  let output = ''
  let firstTokenMs: number | undefined
  onEvent({ type: 'start', providerKey: request.providerKey, model, streaming: 'native' })

  try {
    const opened = await openAICompatibleRequest(request, true)
    if (!opened) throw new Error(`Provider "${request.providerKey}" is not a universal streaming provider.`)
    const { res, timeout } = opened

    if (!res.ok || !res.body) {
      clearTimeout(timeout)
      const body = await res.text().catch(() => '')
      const error = `${request.providerKey} HTTP ${res.status}: ${body.slice(0, 500) || 'request failed'}`
      onEvent({ type: 'error', error, providerKey: request.providerKey, model, latencyMs: Date.now() - start, streaming: 'native' })
      return { ok: false, output: null, error, latencyMs: Date.now() - start, model, providerKey: request.providerKey }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim() === 'data: [DONE]') continue
        const token = parseStreamData(line.trim())
        if (!token) continue
        if (firstTokenMs === undefined) firstTokenMs = Date.now() - start
        output += token
        onEvent({ type: 'token', content: token, providerKey: request.providerKey, model, firstTokenMs, streaming: 'native' })
      }
    }
    clearTimeout(timeout)

    onEvent({ type: 'done', providerKey: request.providerKey, model, latencyMs: Date.now() - start, firstTokenMs, streaming: 'native' })
    return { ok: true, output, error: null, latencyMs: Date.now() - start, model, providerKey: request.providerKey }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Universal provider stream failed'
    onEvent({ type: 'error', error: message, providerKey: request.providerKey, model, latencyMs: Date.now() - start, firstTokenMs, streaming: 'native' })
    return { ok: false, output: null, error: message, latencyMs: Date.now() - start, model, providerKey: request.providerKey }
  }
}

export async function callUniversalProvider(request: UniversalProviderRequest): Promise<ProviderCallResult> {
  const config = resolveUniversalConfig(request.providerKey)
  if (!config) {
    return callProvider(request.providerKey, request.model, request.message, request.systemPrompt)
  }

  const start = Date.now()
  const model = resolveModel(request, config)

  try {
    const opened = await openAICompatibleRequest(request, false)
    if (!opened) throw new Error(`Provider "${request.providerKey}" is not configured for universal calls.`)
    const { res, timeout } = opened

    if (!res.ok) {
      clearTimeout(timeout)
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        output: null,
        error: `${request.providerKey} HTTP ${res.status}: ${body.slice(0, 500) || 'request failed'}`,
        latencyMs: Date.now() - start,
        model,
        providerKey: request.providerKey,
      }
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string }; text?: string }> }
    clearTimeout(timeout)
    return {
      ok: true,
      output: data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? null,
      error: null,
      latencyMs: Date.now() - start,
      model,
      providerKey: request.providerKey,
    }
  } catch (error) {
    return {
      ok: false,
      output: null,
      error: error instanceof Error ? error.message : 'Universal provider call failed',
      latencyMs: Date.now() - start,
      model,
      providerKey: request.providerKey,
    }
  }
}
