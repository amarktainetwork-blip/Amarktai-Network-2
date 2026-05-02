import { callProvider, type ProviderCallResult } from '@/lib/brain'
import { getServiceKey } from '@/lib/service-vault'

interface OpenAICompatibleConfig {
  providerKey: string
  baseUrl: string
  envVars: string[]
  defaultModel: string
  extraHeaders?: Record<string, string>
}

const OPENAI_COMPATIBLE: Record<string, OpenAICompatibleConfig> = {
  qwen: {
    providerKey: 'qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    envVars: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
    defaultModel: 'qwen-plus',
  },
  deepseek: {
    providerKey: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    envVars: ['DEEPSEEK_API_KEY'],
    defaultModel: 'deepseek-chat',
  },
  groq: {
    providerKey: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    envVars: ['GROQ_API_KEY'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  together: {
    providerKey: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    envVars: ['TOGETHER_API_KEY'],
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
  },
  openrouter: {
    providerKey: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envVars: ['OPENROUTER_API_KEY'],
    defaultModel: 'openai/gpt-4o-mini',
    extraHeaders: {
      'HTTP-Referer': 'https://amarktai.com',
      'X-Title': 'Amarktai Network',
    },
  },
  moonshot: {
    providerKey: 'moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    envVars: ['MOONSHOT_API_KEY'],
    defaultModel: 'kimi-k2.6',
  },
  zhipu: {
    providerKey: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    envVars: ['ZHIPU_API_KEY'],
    defaultModel: 'glm-5',
  },
  minimax: {
    providerKey: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    envVars: ['MINIMAX_API_KEY', 'MIMO_API_KEY'],
    defaultModel: 'MiniMax-M2.7',
  },
  mimo: {
    providerKey: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    envVars: ['MIMO_API_KEY', 'MINIMAX_API_KEY'],
    defaultModel: 'MiniMax-M2.7',
  },
}

export interface UniversalProviderRequest {
  providerKey: string
  model: string
  message: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
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

export async function callUniversalProvider(request: UniversalProviderRequest): Promise<ProviderCallResult> {
  const providerKey = request.providerKey === 'mimo' ? 'mimo' : request.providerKey
  const config = OPENAI_COMPATIBLE[providerKey]
  if (!config) {
    return callProvider(request.providerKey, request.model, request.message, request.systemPrompt)
  }

  const start = Date.now()
  const apiKey = await resolveKey(config.providerKey, config.envVars)
  if (!apiKey) {
    return {
      ok: false,
      output: null,
      error: `Provider "${request.providerKey}" is not configured. Add ${config.envVars.join(' or ')} in Settings.`,
      latencyMs: Date.now() - start,
      model: request.model || config.defaultModel,
      providerKey: request.providerKey,
    }
  }

  const model = request.model && !request.model.startsWith('custom:') ? request.model : config.defaultModel

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(config.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.message },
        ],
        max_tokens: request.maxTokens ?? 1400,
        temperature: request.temperature ?? 0.4,
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!res.ok) {
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
