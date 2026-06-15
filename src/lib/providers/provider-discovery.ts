import { getProviderKeyWithSource } from '@/lib/provider-config'
import { sanitizeProviderError } from '@/lib/provider-mesh'
import { ProviderDiscoveryCache } from './provider-cache'
import { PROVIDER_TRUTH } from './provider-truth'
import type {
  CapabilityId,
  DiscoveredModel,
  ProviderDiscoverySnapshot,
  ProviderId,
  ProviderTruthDefinition,
} from './provider-types'

const discoveryCache = new ProviderDiscoveryCache<ProviderDiscoverySnapshot>()

const TASK_CAPABILITY_MAP: Readonly<Record<string, CapabilityId[]>> = {
  chat: ['chat'],
  reasoning: ['reasoning'],
  coding: ['coding'],
  research: ['research'],
  image: ['image'],
  image_edit: ['image_edit'],
  video: ['video'],
  image_to_video: ['image_to_video'],
  avatar: ['avatar'],
  music: ['music'],
  tts: ['tts'],
  stt: ['stt'],
  voice_clone: ['voice_clone'],
  ocr: ['ocr'],
  vision: ['vision'],
  embeddings: ['embeddings'],
  rerank: ['rerank'],
  documents: ['documents'],
  agents: ['agents'],
  conversational: ['chat'],
  'text-generation': ['chat', 'reasoning', 'coding'],
  'text2text-generation': ['chat', 'reasoning', 'translation'],
  'image-text-to-text': ['vision', 'ocr'],
  'image-to-text': ['vision', 'ocr'],
  'visual-question-answering': ['vision'],
  'document-question-answering': ['documents', 'ocr'],
  'text-to-image': ['image'],
  'image-to-image': ['image_edit'],
  'text-to-video': ['video'],
  'image-to-video': ['image_to_video'],
  'text-to-audio': ['music'],
  'text-to-speech': ['tts'],
  'automatic-speech-recognition': ['stt'],
  'feature-extraction': ['embeddings'],
  'sentence-similarity': ['embeddings'],
  'text-ranking': ['rerank'],
  translation: ['translation'],
  'tool-calling': ['agents'],
}

type FetchLike = typeof fetch

export interface ProviderDiscoveryOptions {
  force?: boolean
  fetcher?: FetchLike
  credential?: string | null
  keySource?: string
}

export async function discoverProvider(
  providerId: ProviderId,
  options: ProviderDiscoveryOptions = {},
): Promise<ProviderDiscoverySnapshot> {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  const cached = options.force ? null : discoveryCache.get(providerId)
  if (cached) return cached

  const credentialResult = options.credential !== undefined
    ? { key: options.credential, source: options.keySource ?? 'injected' }
    : await getProviderKeyWithSource(providerId)
  const publicDiscovery = providerId === 'huggingface'
  const now = new Date()
  const expiresAt = new Date(now.getTime() + provider.discovery.cacheTtlMs)
  if (!credentialResult.key && !publicDiscovery) {
    return discoveryCache.set(providerId, {
      provider: providerId,
      status: 'not_configured',
      endpoint: resolveDiscoveryUrl(provider),
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      error: 'Provider credential is not configured.',
    }, provider.discovery.cacheTtlMs)
  }

  const endpoint = resolveDiscoveryUrl(provider)
  if (!endpoint) {
    return discoveryCache.set(providerId, {
      provider: providerId,
      status: 'failed',
      endpoint: null,
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      error: 'Provider does not publish a model discovery endpoint.',
    }, provider.discovery.cacheTtlMs)
  }

  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      headers: credentialResult.key
        ? {
            [provider.auth.header]: `${provider.auth.prefix}${credentialResult.key}`,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new Error(`Discovery returned HTTP ${response.status}.`)
    }
    const payload = await response.json() as unknown
    const records = modelRecords(payload)
    const models = records
      .map((record) => normalizeModel(provider, record, now.toISOString()))
      .filter((model): model is DiscoveredModel => Boolean(model))
    const tasks = [...new Set(models.flatMap((model) =>
      stringList(model.raw.pipeline_tag ?? model.raw.task ?? model.raw.tasks),
    ))]
    const inferenceProviders = [...new Set(records.flatMap((record) =>
      providerNames(record.inferenceProviderMapping ?? record.providers),
    ))]
    return discoveryCache.set(providerId, {
      provider: providerId,
      status: 'ready',
      endpoint,
      keySource: credentialResult.source,
      models,
      tasks,
      inferenceProviders,
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      error: null,
    }, provider.discovery.cacheTtlMs)
  } catch (error) {
    return discoveryCache.set(providerId, {
      provider: providerId,
      status: 'failed',
      endpoint,
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      error: sanitizeProviderError(error),
    }, provider.discovery.cacheTtlMs)
  }
}

export function clearProviderDiscoveryCache(providerId?: ProviderId) {
  if (providerId) discoveryCache.delete(providerId)
  else discoveryCache.clear()
}

export function resolveProviderEndpoint(
  provider: ProviderTruthDefinition,
  family?: string,
): string {
  const endpoint = family
    ? provider.endpoints.find((entry) => entry.family === family)
    : provider.endpoints[0]
  if (!endpoint) return ''
  const configured = endpoint.baseUrlEnv && process.env[endpoint.baseUrlEnv]?.trim()
    ? process.env[endpoint.baseUrlEnv]!.trim()
    : endpoint.baseUrl
  const normalized = configured.replace(/\/+$/, '')
  if (provider.id === 'genx' && family === 'async_generation' && !/\/api\/v1$/i.test(normalized)) {
    return `${normalized}/api/v1`
  }
  if (provider.id === 'genx' && family === 'streaming_text' && !/\/v1$/i.test(normalized)) {
    return `${normalized}/v1`
  }
  return normalized
}

function resolveDiscoveryUrl(provider: ProviderTruthDefinition): string | null {
  if (!provider.discovery.models) return null
  if (/^https?:\/\//.test(provider.discovery.models)) {
    const url = new URL(provider.discovery.models)
    if (provider.id === 'huggingface') {
      url.searchParams.set('limit', '100')
      url.searchParams.set('full', 'true')
    }
    return url.toString()
  }
  const family = provider.id === 'genx'
    ? 'async_generation'
    : provider.id === 'qwen'
      ? 'compatible_mode'
      : undefined
  return `${resolveProviderEndpoint(provider, family)}${provider.discovery.models}`
}

function modelRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []
  for (const key of ['data', 'models', 'items', 'results']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  return []
}

function normalizeModel(
  provider: ProviderTruthDefinition,
  record: Record<string, unknown>,
  discoveredAt: string,
): DiscoveredModel | null {
  const id = firstString(record.id, record.model, record.modelId, record.name)
  if (!id) return null
  const tasks = stringList(
    record.pipeline_tag,
    record.task,
    record.tasks,
    record.capability,
    record.capabilities,
    record.type,
    record.tags,
  )
  const capabilities = [...new Set(tasks.flatMap((task) =>
    TASK_CAPABILITY_MAP[task.toLowerCase()] ?? [],
  ))]
  return {
    provider: provider.id,
    id,
    capabilities,
    capabilityEvidence: capabilities.length > 0 ? 'model_metadata' : 'unknown',
    status: availability(record),
    speed: metric(record.speed, record.latency_score),
    quality: metric(record.quality, record.quality_score),
    cost: metric(record.cost, record.cost_score),
    context: metric(record.context, record.context_length),
    adult: booleanOrUnknown(record.adult),
    streaming: booleanOrUnknown(record.streaming),
    research: booleanOrUnknown(record.research),
    artifactSupport: provider.features.artifactSupport,
    raw: record,
    discoveredAt,
  }
}

function readEndpointEnv(envName: string | null): string[] {
  if (!envName) return []
  const raw = process.env[envName]?.trim()
  if (!raw) return []
  try {
    const value = JSON.parse(raw) as unknown
    if (Array.isArray(value)) {
      return value.flatMap((entry) => typeof entry === 'string'
        ? [entry]
        : isRecord(entry) && typeof entry.url === 'string' ? [entry.url] : [])
    }
  } catch {
    return raw.split(',').map((entry) => entry.trim()).filter(Boolean)
  }
  return []
}

function providerNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(providerNames)
  if (typeof value === 'string') return [value]
  if (isRecord(value)) return Object.keys(value)
  return []
}

function stringList(...values: unknown[]): string[] {
  return values.flatMap((value) => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
    return []
  })
}

function firstString(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
}

function metric(...values: unknown[]): number | null {
  const value = values.find((entry) => typeof entry === 'number' && Number.isFinite(entry))
  return typeof value === 'number' ? value : null
}

function availability(record: Record<string, unknown>): DiscoveredModel['status'] {
  if (record.available === true || record.active === true || record.status === 'available') return 'available'
  if (record.available === false || record.active === false || record.status === 'unavailable') return 'unavailable'
  return 'unknown'
}

function booleanOrUnknown(value: unknown): boolean | 'unknown' {
  return typeof value === 'boolean' ? value : 'unknown'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
