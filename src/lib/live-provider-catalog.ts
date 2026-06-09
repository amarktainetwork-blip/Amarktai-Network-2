/**
 * Live provider catalog foundation for AmarktAI.
 *
 * This file defines how connected providers expose model/task catalogs.
 * It does not decide runtime routing by itself.
 *
 * Truth layers:
 * 1. Settings live test proves the provider key/service works.
 * 2. Live provider catalog proves available models/tasks.
 * 3. Capability taxonomy proves what AmarktAI understands.
 * 4. Execution adapters prove jobs/artifacts are created.
 */

import {
  getCapabilitiesByProvider,
  getConnectedProviderKeys,
  type ConnectedProviderKey,
} from '@/lib/capability-taxonomy'

export type LiveCatalogMode =
  | 'dynamic_models'
  | 'task_catalog'
  | 'endpoint_catalog'
  | 'live_discovery'
  | 'service'

export type LiveCatalogCategory =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'audio'
  | 'embeddings'
  | 'rerank'
  | 'tools'
  | 'repo'
  | 'service'
  | 'unknown'

export interface LiveCatalogEndpoint {
  label: string
  url: string
  method: 'GET' | 'POST'
  requiresApiKey: boolean
  category?: LiveCatalogCategory
  notes: string
}

export interface LiveCatalogProviderSpec {
  provider: ConnectedProviderKey
  label: string
  mode: LiveCatalogMode
  baseUrl?: string
  envVars: readonly string[]
  capabilities: readonly string[]
  endpoints: readonly LiveCatalogEndpoint[]
  notes: string
}

export interface LiveCatalogModel {
  provider: ConnectedProviderKey
  modelId: string
  displayName: string
  category: LiveCatalogCategory
  capabilities: readonly string[]
  source: 'live' | 'curated' | 'adapter_alias'
  raw?: unknown
}

export interface LiveCatalogResult {
  provider: ConnectedProviderKey
  ok: boolean
  models: LiveCatalogModel[]
  error: string | null
  fetchedAt: string
  source: 'live' | 'curated' | 'service' | 'not_supported'
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export const LIVE_PROVIDER_CATALOG_SPECS: readonly LiveCatalogProviderSpec[] = [
  {
    provider: 'genx',
    label: 'GenX',
    mode: 'dynamic_models',
    baseUrl: 'https://query.genx.sh',
    envVars: ['GENX_API_KEY'],
    capabilities: getCapabilitiesByProvider('genx'),
    endpoints: [
      {
        label: 'REST models',
        url: 'https://query.genx.sh/api/v1/models',
        method: 'GET',
        requiresApiKey: true,
        notes: 'Primary dynamic catalog. Supports category filters: text, image, video, voice, audio.',
      },
      {
        label: 'Streaming models',
        url: 'https://query.genx.sh/v1/models',
        method: 'GET',
        requiresApiKey: false,
        category: 'text',
        notes: 'OpenAI-compatible streaming model list for text models.',
      },
      {
        label: 'Pricing',
        url: 'https://query.genx.sh/api/v1/account/pricing',
        method: 'GET',
        requiresApiKey: true,
        notes: 'Pricing/cost truth by model and category.',
      },
    ],
    notes: 'Managed gateway. Text streams through /v1; media uses async /api/v1/generate jobs.',
  },
  {
    provider: 'huggingface',
    label: 'Hugging Face',
    mode: 'task_catalog',
    baseUrl: 'https://api-inference.huggingface.co',
    envVars: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    capabilities: getCapabilitiesByProvider('huggingface'),
    endpoints: [
      {
        label: 'Task/model adapters',
        url: 'task-aware',
        method: 'POST',
        requiresApiKey: true,
        notes: 'Non-chat HF capabilities are task-specific and must use task/provider adapters.',
      },
    ],
    notes: 'Open-source task universe. Do not treat all Hub models as routable until route-compatible.',
  },
  {
    provider: 'qwen',
    label: 'Qwen / DashScope / Wan',
    mode: 'endpoint_catalog',
    baseUrl: 'https://dashscope.aliyuncs.com',
    envVars: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    capabilities: getCapabilitiesByProvider('qwen'),
    endpoints: [
      {
        label: 'Qwen-compatible text/multimodal',
        url: 'dashscope-openai-compatible',
        method: 'POST',
        requiresApiKey: true,
        category: 'text',
        notes: 'Qwen text, code, reasoning and multimodal understanding.',
      },
      {
        label: 'Wan media jobs',
        url: 'dashscope-async-media',
        method: 'POST',
        requiresApiKey: true,
        category: 'video',
        notes: 'Wan image/video/audio jobs through Alibaba Model Studio/DashScope.',
      },
    ],
    notes: 'Provider key remains qwen; DashScope/Wan are mapped under this provider.',
  },
  {
    provider: 'mimo',
    label: 'Xiaomi MiMo',
    mode: 'live_discovery',
    baseUrl: 'https://platform.xiaomimimo.com',
    envVars: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
    capabilities: getCapabilitiesByProvider('mimo'),
    endpoints: [
      {
        label: 'OpenAI-compatible models/chat',
        url: 'mimo-openai-compatible',
        method: 'GET',
        requiresApiKey: true,
        category: 'text',
        notes: 'Only route exact model IDs confirmed by the live API/account.',
      },
    ],
    notes: 'Use for planning/validation/voice only after live model IDs are confirmed.',
  },
  {
    provider: 'groq',
    label: 'Groq',
    mode: 'dynamic_models',
    baseUrl: 'https://api.groq.com/openai/v1',
    envVars: ['GROQ_API_KEY'],
    capabilities: getCapabilitiesByProvider('groq'),
    endpoints: [
      {
        label: 'OpenAI-compatible models',
        url: 'https://api.groq.com/openai/v1/models',
        method: 'GET',
        requiresApiKey: true,
        notes: 'Discover text, code, vision, STT/TTS models exposed to this account.',
      },
    ],
    notes: 'Fast inference and STT. Do not route preview TTS unless live model list confirms it.',
  },
  {
    provider: 'together',
    label: 'Together AI',
    mode: 'endpoint_catalog',
    baseUrl: 'https://api.together.xyz',
    envVars: ['TOGETHER_API_KEY'],
    capabilities: getCapabilitiesByProvider('together'),
    endpoints: [
      {
        label: 'Serverless models',
        url: 'https://api.together.xyz/v1/models',
        method: 'GET',
        requiresApiKey: true,
        notes: 'Discover Together serverless model catalog exposed to the account.',
      },
    ],
    notes: 'Endpoint-aware open-model fallback for chat, image, embeddings, rerank and supported audio/video.',
  },
  {
    provider: 'github',
    label: 'GitHub',
    mode: 'service',
    envVars: ['GITHUB_PAT', 'GITHUB_TOKEN'],
    capabilities: getCapabilitiesByProvider('github'),
    endpoints: [],
    notes: 'Repo/PR service provider, not a model provider.',
  },
  {
    provider: 'redis',
    label: 'Redis',
    mode: 'service',
    envVars: ['REDIS_URL'],
    capabilities: ['queue'],
    endpoints: [],
    notes: 'Queue and job coordination service.',
  },
  {
    provider: 'qdrant',
    label: 'Qdrant',
    mode: 'service',
    envVars: ['QDRANT_URL', 'QDRANT_API_KEY'],
    capabilities: getCapabilitiesByProvider('qdrant'),
    endpoints: [],
    notes: 'Vector store and retrieval service.',
  },
  {
    provider: 'local_crawler',
    label: 'Local Crawler',
    mode: 'service',
    envVars: [],
    capabilities: getCapabilitiesByProvider('local_crawler'),
    endpoints: [],
    notes: 'Local Playwright/Scrapy/Trafilatura crawler family.',
  },
  {
    provider: 'playwright',
    label: 'Playwright',
    mode: 'service',
    envVars: [],
    capabilities: ['crawl', 'render', 'browser_automation'],
    endpoints: [],
    notes: 'Local browser automation service.',
  },
  {
    provider: 'scrapy',
    label: 'Scrapy',
    mode: 'service',
    envVars: [],
    capabilities: ['crawl'],
    endpoints: [],
    notes: 'Local crawl service.',
  },
  {
    provider: 'trafilatura',
    label: 'Trafilatura',
    mode: 'service',
    envVars: [],
    capabilities: ['crawl', 'document_extraction'],
    endpoints: [],
    notes: 'Local document extraction service.',
  },
  {
    provider: 'ffmpeg',
    label: 'ffmpeg',
    mode: 'service',
    envVars: [],
    capabilities: getCapabilitiesByProvider('ffmpeg'),
    endpoints: [],
    notes: 'Local media processing service.',
  },
  {
    provider: 'storage',
    label: 'Storage',
    mode: 'service',
    envVars: [],
    capabilities: ['storage', 'artifact_library'],
    endpoints: [],
    notes: 'Artifact/file persistence service.',
  },
  {
    provider: 'smtp',
    label: 'SMTP',
    mode: 'service',
    envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    capabilities: ['email'],
    endpoints: [],
    notes: 'Email notification service.',
  },
] as const

export function getLiveProviderCatalogSpecs(): readonly LiveCatalogProviderSpec[] {
  return LIVE_PROVIDER_CATALOG_SPECS
}

export function getLiveProviderCatalogSpec(provider: string): LiveCatalogProviderSpec | undefined {
  return LIVE_PROVIDER_CATALOG_SPECS.find((entry) => entry.provider === provider)
}

export function getCatalogEnabledProviders(): readonly ConnectedProviderKey[] {
  return getConnectedProviderKeys()
}

export function normalizeProviderModel(
  provider: ConnectedProviderKey,
  raw: unknown,
  fallbackCategory: LiveCatalogCategory = 'unknown',
): LiveCatalogModel | null {
  if (!raw || typeof raw !== 'object') return null

  const record = raw as Record<string, unknown>
  const id =
    typeof record.id === 'string'
      ? record.id
      : typeof record.model === 'string'
        ? record.model
        : typeof record.name === 'string'
          ? record.name
          : null

  if (!id) return null

  const rawCategory =
    typeof record.category === 'string'
      ? record.category
      : typeof record.type === 'string'
        ? record.type
        : fallbackCategory

  const category = normalizeCategory(rawCategory)
  const displayName =
    typeof record.display_name === 'string'
      ? record.display_name
      : typeof record.name === 'string'
        ? record.name
        : id

  return {
    provider,
    modelId: id,
    displayName,
    category,
    capabilities: inferCapabilities(provider, category, id),
    source: 'live',
    raw,
  }
}

export function normalizeCatalogResponse(
  provider: ConnectedProviderKey,
  payload: unknown,
  fallbackCategory: LiveCatalogCategory = 'unknown',
): LiveCatalogModel[] {
  const rawItems =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : payload && typeof payload === 'object' && Array.isArray((payload as { models?: unknown[] }).models)
          ? (payload as { models: unknown[] }).models
          : []

  return rawItems
    .map((item) => normalizeProviderModel(provider, item, fallbackCategory))
    .filter((item): item is LiveCatalogModel => Boolean(item))
}

export function normalizeCategory(input: string): LiveCatalogCategory {
  const value = input.toLowerCase().replace(/[_-]/g, ' ')

  if (value.includes('image')) return 'image'
  if (value.includes('video')) return 'video'
  if (value.includes('voice') || value.includes('speech') || value.includes('tts') || value.includes('stt')) return 'voice'
  if (value.includes('audio') || value.includes('music')) return 'audio'
  if (value.includes('embed')) return 'embeddings'
  if (value.includes('rerank') || value.includes('ranking')) return 'rerank'
  if (value.includes('tool')) return 'tools'
  if (value.includes('repo') || value.includes('pull request')) return 'repo'
  if (value.includes('text') || value.includes('chat') || value.includes('language')) return 'text'

  return 'unknown'
}

export function inferCapabilities(
  provider: ConnectedProviderKey,
  category: LiveCatalogCategory,
  modelId: string,
): string[] {
  const id = modelId.toLowerCase()
  const caps: string[] = []

  if (category === 'text' || id.includes('llama') || id.includes('qwen') || id.includes('deepseek') || id.includes('mixtral')) {
    caps.push('text_generation')
  }
  if (category === 'image' || id.includes('flux') || id.includes('image') || id.includes('wanx')) {
    caps.push('text_to_image', 'image_to_image')
  }
  if (category === 'video' || id.includes('video') || id.includes('veo') || id.includes('kling') || id.includes('wan')) {
    caps.push('text_to_video', 'image_to_video')
  }
  if (category === 'voice' || id.includes('whisper') || id.includes('asr')) {
    caps.push('automatic_speech_recognition')
  }
  if (category === 'voice' || id.includes('tts') || id.includes('speech')) {
    caps.push('text_to_speech')
  }
  if (category === 'audio' || id.includes('music') || id.includes('lyria')) {
    caps.push('text_to_audio')
  }
  if (category === 'embeddings' || id.includes('embed')) {
    caps.push('feature_extraction', 'sentence_similarity')
  }
  if (category === 'rerank' || id.includes('rerank')) {
    caps.push('text_ranking')
  }

  return unique([...getCapabilitiesByProvider(provider).filter((cap) => caps.includes(cap)), ...caps])
}

export function buildEmptyCatalogResult(provider: ConnectedProviderKey, error: string | null = null): LiveCatalogResult {
  return {
    provider,
    ok: false,
    models: [],
    error,
    fetchedAt: new Date().toISOString(),
    source: 'not_supported',
  }
}

export async function fetchLiveCatalog(
  provider: ConnectedProviderKey,
  apiKey: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<LiveCatalogResult> {
  const spec = getLiveProviderCatalogSpec(provider)
  if (!spec) return buildEmptyCatalogResult(provider, `Unknown provider: ${provider}`)

  if (spec.mode === 'service') {
    return {
      provider,
      ok: true,
      models: [],
      error: null,
      fetchedAt: new Date().toISOString(),
      source: 'service',
    }
  }

  const endpoint = spec.endpoints.find((item) => item.url.startsWith('http') && item.method === 'GET')
  if (!endpoint) {
    return buildEmptyCatalogResult(provider, `No GET catalog endpoint configured for ${provider}`)
  }

  if (endpoint.requiresApiKey && !apiKey) {
    return buildEmptyCatalogResult(provider, `No API key available for ${provider}`)
  }

  try {
    const res = await fetchImpl(endpoint.url, {
      method: endpoint.method,
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        provider,
        ok: false,
        models: [],
        error: `${provider} catalog HTTP ${res.status}`,
        fetchedAt: new Date().toISOString(),
        source: 'live',
      }
    }

    const payload = await res.json()
    const models = normalizeCatalogResponse(provider, payload, endpoint.category ?? 'unknown')

    return {
      provider,
      ok: true,
      models,
      error: null,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    }
  } catch (error) {
    return {
      provider,
      ok: false,
      models: [],
      error: error instanceof Error ? error.message : String(error),
      fetchedAt: new Date().toISOString(),
      source: 'live',
    }
  }
}
