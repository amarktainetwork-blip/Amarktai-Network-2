import {
  GENX_AUDIO_MODELS,
  GENX_I2V_MODELS,
  GENX_IMAGE_MODELS,
  GENX_STT_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
  normalizeGenXBaseUrl,
} from '@/lib/genx-client'
import { getProviderKeyWithSource } from '@/lib/provider-config'
import { sanitizeProviderError } from '@/lib/provider-mesh'
import { VIDEO_MODEL_CONTRACTS } from '@/lib/video-route-specs'
import { ProviderDiscoveryCache } from './provider-cache'
import { PROVIDER_TRUTH } from './provider-truth'
import type {
  CapabilityId,
  DiscoveredModel,
  ModelDiscoverySource,
  ProviderDiscoverySnapshot,
  ProviderId,
  ProviderTruthDefinition,
} from './provider-types'

const discoveryCache = new ProviderDiscoveryCache<ProviderDiscoverySnapshot>()

const HF_PIPELINE_TASK: Partial<Record<CapabilityId, string>> = {
  chat: 'text-generation',
  reasoning: 'text-generation',
  coding: 'text-generation',
  research: 'text-generation',
  image: 'text-to-image',
  image_edit: 'image-to-image',
  video: 'text-to-video',
  image_to_video: 'image-to-video',
  avatar: 'text-to-image',
  music: 'text-to-audio',
  tts: 'text-to-speech',
  stt: 'automatic-speech-recognition',
  ocr: 'image-to-text',
  vision: 'image-text-to-text',
  embeddings: 'feature-extraction',
  rerank: 'text-ranking',
  translation: 'translation',
  documents: 'document-question-answering',
  agents: 'text-generation',
  adult_text: 'text-generation',
  adult_image: 'text-to-image',
  adult_video: 'text-to-video',
}

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
  adult_text: ['adult_text'],
  adult_image: ['adult_image'],
  adult_video: ['adult_video'],
  conversational: ['chat'],
  'text-generation': ['chat', 'reasoning', 'coding'],
  'text2text-generation': ['chat', 'reasoning', 'translation'],
  'image-text-to-text': ['vision', 'ocr'],
  'image-to-text': ['vision', 'ocr'],
  'visual-question-answering': ['vision'],
  'document-question-answering': ['documents', 'ocr'],
  'text-to-image': ['image'],
  'text_to_image': ['image'],
  image_generation: ['image'],
  'image-to-image': ['image_edit'],
  'image_to_image': ['image_edit'],
  image_text_to_image: ['image_edit'],
  'text-to-video': ['video'],
  'text_to_video': ['video'],
  video_generation: ['video'],
  'image-to-video': ['image_to_video'],
  image_text_to_video: ['image_to_video'],
  'text-to-audio': ['music'],
  'text-to-speech': ['tts'],
  text_to_speech: ['tts'],
  'automatic-speech-recognition': ['stt'],
  speech_to_text: ['stt'],
  'speech-to-text': ['stt'],
  'feature-extraction': ['embeddings'],
  feature_extraction: ['embeddings'],
  'sentence-similarity': ['embeddings'],
  'text-ranking': ['rerank'],
  text_ranking: ['rerank'],
  translation: ['translation'],
  'tool-calling': ['agents'],
  'chat-completion': ['chat'],
  'chat-completions': ['chat'],
  instruct: ['chat'],
  llm: ['chat', 'reasoning', 'coding'],
  code: ['coding'],
  coder: ['coding'],
  multimodal: ['vision'],
  'image-generation': ['image'],
  'image-editing': ['image_edit'],
  'video-generation': ['video'],
  transcription: ['stt'],
  asr: ['stt'],
  'speech-generation': ['tts'],
  embedding: ['embeddings'],
  reranking: ['rerank'],
}

const GENX_FALLBACK_MODEL_CAPABILITIES: Partial<Record<CapabilityId, readonly string[]>> = {
  image: GENX_IMAGE_MODELS,
  video: VIDEO_MODEL_CONTRACTS
    .filter((contract) => contract.provider === 'genx' && contract.mode === 'text_to_video')
    .map((contract) => contract.model),
  music: GENX_AUDIO_MODELS,
  tts: GENX_TTS_MODELS,
}

const MUSIC_DURATION_LIMITS: Partial<Record<ProviderId, number>> = {
  genx: 30,
}

const HF_CURATED_MODELS: Array<{
  id: string
  task: string
  capabilities: CapabilityId[]
  routeType: 'hf_inference_model_api' | 'hf_specialist_endpoint' | 'policy_gated_candidate'
  safetyPolicy: 'standard' | 'adult_gate_required'
  safetyNotes: string
}> = [
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', task: 'text-generation', capabilities: ['chat', 'reasoning', 'coding'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated core text model.' },
  { id: 'sentence-transformers/all-MiniLM-L6-v2', task: 'feature-extraction', capabilities: ['embeddings'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated embeddings model.' },
  { id: 'cross-encoder/ms-marco-MiniLM-L-6-v2', task: 'text-ranking', capabilities: ['rerank'], routeType: 'hf_specialist_endpoint', safetyPolicy: 'standard', safetyNotes: 'Curated rerank model; specialist endpoint required before execution proof.' },
  { id: 'stabilityai/stable-diffusion-xl-base-1.0', task: 'text-to-image', capabilities: ['image'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated image generation model.' },
  { id: 'timbrooks/instruct-pix2pix', task: 'image-to-image', capabilities: ['image_edit'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated source-image transform model.' },
  { id: 'Wan-AI/Wan2.1-T2V-14B', task: 'text-to-video', capabilities: ['video'], routeType: 'hf_specialist_endpoint', safetyPolicy: 'standard', safetyNotes: 'Curated video model; specialist endpoint required before execution.' },
  { id: 'Wan-AI/Wan2.1-I2V-14B-480P', task: 'image-to-video', capabilities: ['image_to_video'], routeType: 'hf_specialist_endpoint', safetyPolicy: 'standard', safetyNotes: 'Curated image-to-video model; specialist endpoint required before execution.' },
  { id: 'facebook/musicgen-small', task: 'text-to-audio', capabilities: ['music'], routeType: 'hf_specialist_endpoint', safetyPolicy: 'standard', safetyNotes: 'Curated music model; specialist endpoint required before execution.' },
  { id: 'facebook/mms-tts-eng', task: 'text-to-speech', capabilities: ['tts'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated TTS model.' },
  { id: 'openai/whisper-large-v3', task: 'automatic-speech-recognition', capabilities: ['stt'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated STT model.' },
  { id: 'Salesforce/blip-image-captioning-base', task: 'image-to-text', capabilities: ['vision', 'ocr'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated image captioning/OCR-adjacent model.' },
  { id: 'Salesforce/blip2-opt-2.7b', task: 'image-text-to-text', capabilities: ['vision'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated vision-language model.' },
  { id: 'impira/layoutlm-document-qa', task: 'document-question-answering', capabilities: ['documents', 'ocr'], routeType: 'hf_inference_model_api', safetyPolicy: 'standard', safetyNotes: 'Curated document QA/OCR model.' },
  { id: 'runwayml/stable-diffusion-v1-5', task: 'text-to-image', capabilities: ['adult_image'], routeType: 'policy_gated_candidate', safetyPolicy: 'adult_gate_required', safetyNotes: 'Adult-capable candidate only when explicit adult policy/app gate allows it.' },
  { id: 'Wan-AI/Wan2.1-T2V-14B', task: 'text-to-video', capabilities: ['adult_video'], routeType: 'policy_gated_candidate', safetyPolicy: 'adult_gate_required', safetyNotes: 'Adult video candidate only when explicit adult policy/app gate allows it and specialist endpoint is configured.' },
]

const HF_CORE_MODEL_ALLOWLIST = new Set(HF_CURATED_MODELS.map((model) => model.id))

type FetchLike = typeof fetch

export interface ProviderDiscoveryOptions {
  force?: boolean
  fetcher?: FetchLike
  credential?: string | null
  keySource?: string
  capability?: CapabilityId
}

export async function discoverProvider(
  providerId: ProviderId,
  options: ProviderDiscoveryOptions = {},
): Promise<ProviderDiscoverySnapshot> {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  const cacheKey = options.capability ? `${providerId}:${options.capability}` : providerId
  const cached = options.force ? null : discoveryCache.get(cacheKey)
  if (cached) return cached

  const credentialResult = options.credential !== undefined
    ? { key: options.credential, source: options.keySource ?? 'injected' }
    : await getProviderKeyWithSource(providerId)
  const publicDiscovery = providerId === 'huggingface'
  const now = new Date()
  const discoveredAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + provider.discovery.cacheTtlMs)
  if (!credentialResult.key && !publicDiscovery) {
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'not_configured',
      endpoint: resolveDiscoveryUrl(provider, options.capability),
      keySource: credentialResult.source,
      discoverySource: 'none',
      rawCatalogCount: 0,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: 'Provider credential is not configured.',
    }, provider.discovery.cacheTtlMs)
  }

  const endpoint = resolveDiscoveryUrl(provider, options.capability)
  if (!endpoint) {
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'failed',
      endpoint: null,
      keySource: credentialResult.source,
      discoverySource: 'none',
      rawCatalogCount: 0,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: 'Provider does not publish a model discovery endpoint.',
    }, provider.discovery.cacheTtlMs)
  }

  try {
    const headers = credentialResult.key
      ? {
          [provider.auth.header]: `${provider.auth.prefix}${credentialResult.key}`,
          Accept: 'application/json',
        }
      : { Accept: 'application/json' }
    const rawRecords = providerId === 'genx'
      ? await fetchGenxCategoryRecords(endpoint, headers, options.fetcher ?? fetch)
      : await fetchDiscoveryRecords(endpoint, headers, options.fetcher ?? fetch)
    const records = providerId === 'huggingface'
      ? curateHuggingFaceRecords(rawRecords, options.capability)
      : mergeProviderContractRecords(providerId, rawRecords, options.capability)
    const discoverySource: ModelDiscoverySource = credentialResult.key
      ? 'live_authenticated'
      : publicDiscovery
        ? 'public_catalog'
        : 'catalog_derived'
    const models = records
      .map((record) => normalizeModel(provider, record, discoveredAt, discoverySource))
      .filter((model): model is DiscoveredModel => Boolean(model))
    const tasks = [...new Set(models.flatMap((model) =>
      stringList(model.raw.pipeline_tag ?? model.raw.task ?? model.raw.tasks),
    ))]
    const inferenceProviders = [...new Set(records.flatMap((record) =>
      providerNames(record.inferenceProviderMapping ?? record.providers),
    ))]
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'ready',
      endpoint,
      keySource: credentialResult.source,
      discoverySource,
      rawCatalogCount: rawRecords.length,
      models,
      tasks,
      inferenceProviders,
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: null,
    }, provider.discovery.cacheTtlMs)
  } catch (error) {
    const fallbackModels = providerId === 'genx'
      ? genxFallbackModels(options.capability, discoveredAt)
      : []
    if (fallbackModels.length > 0) {
      const tasks = [...new Set(fallbackModels.flatMap((model) => model.capabilities))]
      return discoveryCache.set(cacheKey, {
        provider: providerId,
        status: 'ready',
        endpoint,
        keySource: credentialResult.source,
        discoverySource: 'static_fallback',
        rawCatalogCount: 0,
        models: fallbackModels,
        tasks,
        inferenceProviders: [],
        privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
        dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
        discoveredAt,
        expiresAt: expiresAt.toISOString(),
        error: `GenX discovery failed; using static runtime fallback: ${sanitizeProviderError(error)}`,
      }, provider.discovery.cacheTtlMs)
    }

    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'failed',
      endpoint,
      keySource: credentialResult.source,
      discoverySource: 'none',
      rawCatalogCount: 0,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: sanitizeProviderError(error),
    }, provider.discovery.cacheTtlMs)
  }
}

export function clearProviderDiscoveryCache(providerId?: ProviderId) {
  if (providerId) discoveryCache.deletePrefix(providerId)
  else discoveryCache.clear()
}

export function normalizeProviderCatalog(
  providerId: ProviderId,
  payload: unknown,
  discoveredAt = new Date().toISOString(),
): DiscoveredModel[] {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) return []
  return modelRecords(payload)
    .map((record) => normalizeModel(provider, record, discoveredAt, 'catalog_derived'))
    .filter((model): model is DiscoveredModel => Boolean(model))
}

function curateHuggingFaceRecords(
  records: Record<string, unknown>[],
  capability?: CapabilityId,
): Record<string, unknown>[] {
  if (records.length === 0) return []
  const curated = records.filter((record) => {
    const id = firstString(record.id, record.model, record.modelId, record.model_id, record.slug, record.name)
    if (!id) return false
    if (HF_CORE_MODEL_ALLOWLIST.has(id)) return true
    if (capability) {
      const descriptor = [
        id,
        ...stringList(record.pipeline_tag, record.task, record.tasks, record.tags),
      ].join(' ').toLowerCase()
      return descriptorCapabilities('huggingface', id, descriptor).includes(capability)
    }
    return false
  })
  const filtered = curated.length > 0 ? curated : records.slice(0, 12)
  const existing = new Set(filtered.map((record) =>
    firstString(record.id, record.model, record.modelId, record.model_id, record.slug, record.name),
  ).filter((value): value is string => Boolean(value)))
  const curatedDefaults = HF_CURATED_MODELS
    .filter((model) => !capability || model.capabilities.includes(capability))
    .filter((model) => !existing.has(model.id))
    .map((model) => ({
      id: model.id,
      model: model.id,
      pipeline_tag: model.task,
      task: model.task,
      capabilities: model.capabilities,
      tags: [model.task, ...model.capabilities],
      available: 'unknown',
      license: null,
      curated: true,
      routeType: model.routeType,
      safetyPolicy: model.safetyPolicy,
      safetyNotes: model.safetyNotes,
      adult: model.safetyPolicy === 'adult_gate_required',
    }))
  return [...filtered, ...curatedDefaults]
}

function mergeProviderContractRecords(
  providerId: ProviderId,
  records: Record<string, unknown>[],
  capability?: CapabilityId,
): Record<string, unknown>[] {
  const existing = new Set(records.map((record) =>
    firstString(record.id, record.model, record.modelId, record.model_id, record.slug, record.name)?.toLowerCase(),
  ).filter((value): value is string => Boolean(value)))
  const contractRecords = VIDEO_MODEL_CONTRACTS
    .filter((contract) => contract.provider === providerId)
    .filter((contract) => !capability || (
      capability === 'video' && contract.mode === 'text_to_video'
      || capability === 'image_to_video' && contract.mode === 'image_to_video'
    ))
    .filter((contract) => !existing.has(contract.model.toLowerCase()))
    .map((contract) => ({
      id: contract.model,
      model: contract.model,
      task: contract.mode === 'image_to_video' ? 'image-to-video' : 'text-to-video',
      capabilities: [contract.mode === 'image_to_video' ? 'image_to_video' : 'video'],
      available: 'unknown',
      async: true,
      routeType: 'provider_safe_video_contract',
      safetyPolicy: 'standard',
      safetyNotes: 'Curated provider-safe video contract; live proof still requires provider execution.',
    }))
  return [...records, ...contractRecords]
}

export function resolveProviderEndpoint(
  provider: ProviderTruthDefinition,
  family?: string,
): string {
  const endpoint = family
    ? provider.endpoints.find((entry) => entry.family === family)
    : provider.endpoints[0]
  if (!endpoint) return ''
  const configured = provider.id === 'genx'
    ? resolveGenXEndpointBaseUrl(endpoint, family)
    : endpoint.baseUrlEnv && process.env[endpoint.baseUrlEnv]?.trim()
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

function resolveGenXEndpointBaseUrl(
  endpoint: ProviderTruthDefinition['endpoints'][number],
  family?: string,
): string {
  const configured = endpoint.baseUrlEnv && process.env[endpoint.baseUrlEnv]?.trim()
    ? process.env[endpoint.baseUrlEnv]!.trim()
    : family === 'streaming_text'
      ? process.env.GENX_TEXT_BASE_URL?.trim() || process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || endpoint.baseUrl
      : process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || endpoint.baseUrl
  return normalizeGenxBaseUrl(configured)
}

function normalizeGenxBaseUrl(raw: string): string {
  return normalizeGenXBaseUrl(raw) ?? raw.replace(/\/+$/, '')
}

function resolveDiscoveryUrl(
  provider: ProviderTruthDefinition,
  capability?: CapabilityId,
): string | null {
  if (!provider.discovery.models) return null
  if (/^https?:\/\//.test(provider.discovery.models)) {
    const url = new URL(provider.discovery.models)
    if (provider.id === 'huggingface') {
      url.searchParams.set('limit', '100')
      url.searchParams.set('full', 'true')
      const pipelineTag = capability ? HF_PIPELINE_TASK[capability] : null
      if (pipelineTag) url.searchParams.set('pipeline_tag', pipelineTag)
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

function genxFallbackModels(
  capability?: CapabilityId,
  discoveredAt = new Date().toISOString(),
): DiscoveredModel[] {
  const entries = capability
    ? [[capability, GENX_FALLBACK_MODEL_CAPABILITIES[capability] ?? []] as const]
    : Object.entries(GENX_FALLBACK_MODEL_CAPABILITIES) as Array<[CapabilityId, readonly string[]]>
  const capabilitiesByModel = new Map<string, Set<CapabilityId>>()

  for (const [entryCapability, modelIds] of entries) {
    for (const id of modelIds) {
      const existing = capabilitiesByModel.get(id) ?? new Set<CapabilityId>()
      existing.add(entryCapability)
      capabilitiesByModel.set(id, existing)
    }
  }

  return [...capabilitiesByModel.entries()].map(([id, capabilitySet]) => {
    const capabilities = [...capabilitySet]
    return {
      provider: 'genx',
      id,
      discoverySource: 'static_fallback',
      capabilities,
      capabilityEvidence: 'provider_contract',
      status: 'available',
      speed: null,
      quality: null,
      cost: null,
      context: null,
      adult: 'unknown',
      streaming: 'unknown',
      research: 'unknown',
      artifactSupport: true,
      metadata: {
        task: capabilities[0] ?? null,
        providerAvailable: 'unknown',
        license: null,
        safetyNotes: 'Static GenX fallback candidate; not counted as live-authenticated discovery.',
        executable: 'candidate',
      },
      raw: {
        source: 'genx_static_runtime_fallback',
        capabilities,
      },
      discoveredAt,
    }
  })
}

function modelRecords(payload: unknown, inherited: Record<string, unknown> = {}): Record<string, unknown>[] {
  if (typeof payload === 'string' && payload.trim()) {
    return [{ ...inherited, id: payload.trim(), name: payload.trim() }]
  }
  if (Array.isArray(payload)) return payload.flatMap((entry) => modelRecords(entry, inherited))
  if (!isRecord(payload)) return []
  if (looksLikeModelRecord(payload)) return [{ ...inherited, ...payload }]

  const records: Record<string, unknown>[] = []
  for (const [key, value] of Object.entries(payload)) {
    if (!isModelContainerKey(key) && !isKnownCapabilityKey(key)) continue
    const nextInherited = isKnownCapabilityKey(key)
      ? { ...inherited, category: inherited.category ?? key }
      : inherited
    records.push(...modelRecords(value, nextInherited))
  }
  return records
}

function looksLikeModelRecord(record: Record<string, unknown>): boolean {
  return Boolean(firstString(
    record.id,
    record.model,
    record.modelId,
    record.model_id,
    record.slug,
    record.name,
  ))
}

function isModelContainerKey(key: string): boolean {
  return ['data', 'models', 'items', 'results', 'catalog', 'catalogue', 'available_models'].includes(key)
}

function isKnownCapabilityKey(key: string): boolean {
  return [
    'text',
    'chat',
    'reasoning',
    'code',
    'coding',
    'image',
    'images',
    'image_edit',
    'video',
    'videos',
    'image_to_video',
    'voice',
    'voices',
    'audio',
    'music',
    'transcription',
    'stt',
    'tts',
    'embeddings',
    'rerank',
  ].includes(key.toLowerCase())
}

function normalizeModel(
  provider: ProviderTruthDefinition,
  record: Record<string, unknown>,
  discoveredAt: string,
  discoverySource: ModelDiscoverySource,
): DiscoveredModel | null {
  const id = firstString(record.id, record.model, record.modelId, record.model_id, record.slug, record.name)
  if (!id) return null
  const tasks = stringList(
    record.pipeline_tag,
    record.task,
    record.tasks,
    record.task_type,
    record.capability,
    record.capabilities,
    record.type,
    record.category,
    record.tags,
  )
  const descriptor = [
    id,
    ...tasks,
    firstString(record.display_name, record.displayName, record.description) ?? '',
  ].join(' ').toLowerCase()
  const taskCapabilities = tasks.flatMap((task) =>
    TASK_CAPABILITY_MAP[task.toLowerCase()]
      ?? TASK_CAPABILITY_MAP[task.toLowerCase().replace(/\s+/g, '_')]
      ?? [],
  )
  const descriptorCapabilityMatches = descriptorCapabilities(provider.id, id, descriptor)
  const inferredContractCapabilities = inferProviderContractCapabilities(provider.id, id, descriptor, record)
  const capabilities = [...new Set([
    ...taskCapabilities,
    ...descriptorCapabilityMatches,
    ...(taskCapabilities.length === 0 ? inferredContractCapabilities : []),
  ])]
  const pricing = isRecord(record.pricing) ? Object.values(record.pricing) : []
  const capabilityEvidence: DiscoveredModel['capabilityEvidence'] = taskCapabilities.length > 0 || descriptorCapabilityMatches.length > 0
    ? 'model_metadata'
    : inferredContractCapabilities.length > 0 ? 'provider_contract' : 'unknown'
  const routeType = firstString(record.routeType, record.route_type)
  const durationLimit = MUSIC_DURATION_LIMITS[provider.id] && capabilities.includes('music')
    ? MUSIC_DURATION_LIMITS[provider.id]!
    : null
  const requiresDedicatedEndpoint = routeType === 'hf_specialist_endpoint'
    || provider.id === 'huggingface' && capabilities.some((capability) => capability === 'rerank' || capability === 'video' || capability === 'image_to_video' || capability === 'music' || capability === 'adult_video')
    || provider.id === 'together' && capabilities.some((capability) => capability === 'rerank')
  const adapterMissing = provider.id === 'mimo'
    && capabilities.some((capability) => ['image', 'agents'].includes(capability))
    || provider.id === 'qwen'
    && capabilities.some((capability) => ['tts', 'stt'].includes(capability))
  const executableState = adapterMissing
    ? 'ADAPTER_MISSING'
    : routeType === 'hf_specialist_endpoint'
    ? 'REQUIRES_DEDICATED_ENDPOINT'
    : routeType === 'policy_gated_candidate'
      ? 'CATALOG_ONLY'
      : requiresDedicatedEndpoint
        ? 'REQUIRES_DEDICATED_ENDPOINT'
      : capabilityEvidence === 'unknown' ? 'candidate' : true
  const executionClassification = executionClassificationFor(executableState, {
    routeType,
    provider: provider.id,
    capabilities,
  })
  return {
    provider: provider.id,
    id,
    discoverySource,
    capabilities,
    capabilityEvidence,
    status: availability(record),
    speed: metric(record.speed, record.latency_score),
    quality: metric(record.quality, record.quality_score),
    cost: metric(record.cost, record.cost_score, ...pricing),
    context: metric(record.context, record.context_length),
    adult: booleanOrUnknown(record.adult),
    streaming: booleanOrUnknown(
      record.streaming ?? record.supports_streaming ?? record.stream,
    ),
    research: booleanOrUnknown(record.research),
    artifactSupport: provider.features.artifactSupport,
    metadata: {
      task: tasks[0] ?? null,
      routeType,
      providerAvailable: availability(record) === 'unavailable' ? false : availability(record) === 'available' ? true : 'unknown',
      license: firstString(record.license, nestedString(record.cardData, 'license')),
      safetyPolicy: firstString(record.safetyPolicy, record.safety_policy),
      safetyNotes: firstString(record.safety, record.safetyNotes, record.safety_notes),
      adultGate: record.adult === true || firstString(record.safetyPolicy, record.safety_policy) === 'adult_gate_required',
      executable: executableState,
      executionClassification,
      providerLimitSeconds: durationLimit,
      endpointEnv: endpointEnvFor(provider.id, capabilities),
    },
    raw: record,
    discoveredAt,
  }
}

function executionClassificationFor(
  executable: NonNullable<DiscoveredModel['metadata']>['executable'],
  input: { routeType?: string | null; provider: ProviderId; capabilities: CapabilityId[] },
): NonNullable<DiscoveredModel['metadata']>['executionClassification'] {
  if (executable === true || executable === 'candidate') return 'executable'
  if (executable === 'REQUIRES_DEDICATED_ENDPOINT') return 'endpoint_required'
  if (executable === 'ADAPTER_MISSING') return 'adapter_missing'
  if (executable === 'CATALOG_ONLY') return input.routeType === 'policy_gated_candidate'
    ? 'blocked_by_policy'
    : 'unsupported_by_contract'
  if (executable === 'DURATION_LIMITED') return 'duration_limited'
  return 'unsupported_by_contract'
}

function endpointEnvFor(provider: ProviderId, capabilities: CapabilityId[]): string | null {
  if (provider === 'huggingface') {
    if (capabilities.includes('rerank')) return 'HF_ENDPOINT_RERANK'
    if (capabilities.includes('music')) return 'HF_ENDPOINT_MUSIC_GENERATION'
    if (capabilities.includes('video') || capabilities.includes('adult_video')) return 'HF_ENDPOINT_TEXT_TO_VIDEO'
    if (capabilities.includes('image_to_video')) return 'HF_ENDPOINT_IMAGE_TO_VIDEO'
  }
  if (provider === 'together' && capabilities.includes('rerank')) {
    return 'TOGETHER_DEDICATED_ENDPOINTS_JSON'
  }
  if (provider === 'together' && capabilities.some((capability) => capability === 'video' || capability === 'image_to_video')) {
    return 'TOGETHER_VIDEO_BASE_URL'
  }
  return null
}

async function fetchDiscoveryRecords(
  endpoint: string,
  headers: Record<string, string>,
  fetcher: FetchLike,
) {
  const response = await fetcher(endpoint, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Discovery returned HTTP ${response.status}.`)
  return modelRecords(await response.json() as unknown)
}

async function fetchGenxCategoryRecords(
  endpoint: string,
  headers: Record<string, string>,
  fetcher: FetchLike,
) {
  const urls = [
    endpoint,
    `${endpoint}?category=text`,
    `${endpoint}?category=image`,
    `${endpoint}?category=video`,
    `${endpoint}?category=voice`,
    `${endpoint}?category=audio`,
    `${endpoint}?category=transcription`,
  ]
  const records = new Map<string, Record<string, unknown>>()
  let lastError: Error | null = null
  for (const url of urls) {
    try {
      for (const record of await fetchDiscoveryRecords(url, headers, fetcher)) {
        const id = firstString(record.id, record.model, record.modelId, record.name)
        if (id) records.set(id, record)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('GenX discovery failed.')
    }
  }
  if (records.size === 0 && lastError) throw lastError
  return [...records.values()]
}

function descriptorCapabilities(providerId: ProviderId, modelId: string, descriptor: string): CapabilityId[] {
  const lowerModelId = modelId.toLowerCase()
  const capabilities = new Set<CapabilityId>()
  const add = (capability: CapabilityId, pattern: RegExp) => {
    if (pattern.test(descriptor) || pattern.test(lowerModelId)) capabilities.add(capability)
  }
  if (providerId === 'huggingface') {
    add('image', /\b(text[-_\s]?to[-_\s]?image|diffusion|sdxl|stable[-_\s]?diffusion|flux|pixart|kolors|recraft)\b/i)
    add('image_edit', /\b(image[-_\s]?to[-_\s]?image|image[-_\s]?(?:edit|editing)|inpaint(?:ing)?)\b/i)
    add('image_to_video', /\b(image[-_\s]?to[-_\s]?video|i2v)\b/i)
    add('video', /\b(text[-_\s]?to[-_\s]?video|video|wan|cogvideo|mochi|ltx[-_\s]?video|hunyuanvideo)\b/i)
    add('tts', /\b(text[-_\s]?to[-_\s]?speech|tts|mms[-_]?tts|bark|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(automatic[-_\s]?speech[-_\s]?recognition|asr|whisper|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
    add('embeddings', /\b(feature[-_\s]?extraction|embedding|sentence[-_\s]?transformers|mini?lm|bge|gte|e5)\b/i)
    add('rerank', /\b(text[-_\s]?ranking|rerank(?:er|ing)?|bge[-_\s]?reranker)\b/i)
  } else if (providerId === 'qwen') {
    add('image', /\b(qwen-image|wanx.*(?:t2i|image)|text2image|image[-_\s]synthesis)\b/i)
    add('video', /\b(wan.*t2v|video[-_\s]synthesis|text[-_\s]?to[-_\s]?video)\b/i)
    add('image_to_video', /\b(wan.*i2v|image[-_\s]?to[-_\s]?video|i2v)\b/i)
    add('tts', /\bqwen3-tts\b/i)
    add('stt', /\bqwen3-asr\b/i)
    add('embeddings', /\b(embed(?:ding)?|text[-_\s]?embedding)\b/i)
  } else if (providerId === 'together') {
    add('image', /\b(flux|recraft|stable[-_\s]?diffusion|playground|image)\b/i)
    add('video', /\b(video|kling|wan|seedance|mochi|hunyuanvideo|luma|minimax\/)\b/i)
    add('image_to_video', /\b(i2v|image[-_\s]?to[-_\s]?video)\b/i)
    add('tts', /\b(orpheus|tts|text[-_\s]?to[-_\s]?speech|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(whisper|asr|transcri(?:be|ption))\b/i)
    add('embeddings', /\b(embedding|jina-embeddings|bge|e5)\b/i)
    add('rerank', /\b(rerank(?:er|ing)?|text[-_\s]?ranking)\b/i)
  } else if (providerId === 'groq') {
    add('tts', /\b(orpheus|tts|text[-_\s]?to[-_\s]?speech|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(whisper|asr|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
  } else if (providerId === 'mimo') {
    add('image', /\b(text[-_\s]?to[-_\s]?image|image[-_\s]?generation)\b/i)
    add('vision', /\b(vision|visual|multimodal|image[-_\s]?text|(?:^|[-_/])vl(?:[-_/]|$))\b/i)
    add('tts', /\b(tts|speech[-_\s]generation|text[-_\s]?to[-_\s]?speech|voice)\b/i)
    add('stt', /\b(asr|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption)|whisper)\b/i)
    add('agents', /\b(agent|tool[-_\s]?calling|function[-_\s]?calling)\b/i)
  } else if (providerId === 'genx') {
    add('image', /\b(image|recraft|banana|grok[-_]?imagine)\b/i)
    add('video', /\b(video|veo|kling|seedance|pixverse)\b/i)
    add('image_to_video', /\b(i2v|image[-_\s]?to[-_\s]?video)\b/i)
    add('tts', /\b(tts|aura|voice)\b/i)
    add('stt', /\b(stt|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
    add('music', /\b(music|audio|lyria)\b/i)
  }

  if (!capabilities.has('tts') && !capabilities.has('stt')) {
    add('translation', /\btranslat(?:e|ion)\b/i)
    add('coding', /\b(code|coder|coding)\b/i)
    add('reasoning', /\b(reason(?:ing)?|think(?:ing)?|r1)\b/i)
    add('agents', /\b(agent|tool[-_\s]?calling|compound)\b/i)
    if (!isAudioModel(providerId, lowerModelId) && !isMediaModel(providerId, lowerModelId)) {
      add('chat', /\b(chat|instruct|language|llm|text[-_\s]?generation|completion|assistant)\b/i)
    }
  }

  if (providerId !== 'groq' || capabilities.has('stt') || capabilities.has('tts') || capabilities.has('vision')) {
    add('vision', /\b(vision|visual|multimodal|image[-_\s]?text|(?:^|[-_/])vl(?:[-_/]|$))\b/i)
    add('ocr', /\bocr\b/i)
    if ((providerId === 'huggingface' || providerId === 'groq') && /\b(image[-_\s]?text[-_\s]?to[-_\s]?text|image[-_\s]?to[-_\s]?text|visual)\b/i.test(descriptor)) {
      capabilities.add('image')
    }
  }
  return [...capabilities]
}

function inferProviderContractCapabilities(
  providerId: ProviderId,
  modelId: string,
  descriptor: string,
  record: Record<string, unknown>,
): CapabilityId[] {
  const lowerModelId = modelId.toLowerCase()
  const category = firstString(record.category, record.type)?.toLowerCase() ?? ''

  if (providerId === 'genx') {
    const capabilities = new Set<CapabilityId>()
    if (GENX_IMAGE_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'image') capabilities.add('image')
    if (GENX_IMAGE_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'image') capabilities.add('avatar')
    if (GENX_VIDEO_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'video') capabilities.add('video')
    if (GENX_I2V_MODELS.some((entry) => entry.toLowerCase() === lowerModelId)) capabilities.add('image_to_video')
    if (GENX_AUDIO_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'audio') capabilities.add('music')
    if (GENX_TTS_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'voice') capabilities.add('tts')
    if (GENX_STT_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'transcription') capabilities.add('stt')
    if (category === 'text' || (!capabilities.size && GENX_TEXT_HINT.test(descriptor))) {
      capabilities.add('chat')
      if (/code|coder|codex/.test(descriptor)) capabilities.add('coding')
      if (/reason|think/.test(descriptor)) capabilities.add('reasoning')
    }
    return [...capabilities]
  }

  if (providerId === 'qwen') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/qwen-image/, /wanx.*(?:t2i|image)/],
    image_edit: [/qwen-image.*edit/, /image[-_\s]?edit/],
    video: [/wan.*t2v/, /video[-_\s]?synthesis/],
    image_to_video: [/wan.*i2v/, /image[-_\s]?to[-_\s]?video/, /\bi2v\b/],
    tts: [/qwen3-tts/],
    stt: [/qwen3-asr/],
    embeddings: [/embed(?:ding)?/, /text[-_\s]?embedding/],
    translation: [/translat/],
    chat: [/qwen[-_].*(turbo|plus|max|chat|instruct)/, /deepseek/],
    reasoning: [/qwen[-_].*(plus|max|reason)/, /deepseek[-_/].*r1/],
    coding: [/coder/, /code/],
  })

  if (providerId === 'together') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/flux/, /recraft/, /stable[-_]?diffusion/, /playground/, /seedream/, /image/],
    image_edit: [/image[-_\s]?edit/, /image[-_\s]?to[-_\s]?image/, /inpaint/],
    video: [/video/, /kling/, /wan/, /seedance/, /mochi/, /hunyuanvideo/, /luma/, /minimax\//],
    image_to_video: [/\bi2v\b/, /image[-_\s]?to[-_\s]?video/],
    tts: [/orpheus/, /\btts\b/, /speech/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    embeddings: [/embedding/, /jina-embeddings/, /bge/, /\be5\b/],
    rerank: [/rerank/, /text[-_\s]?ranking/],
    chat: [/llama/, /mistral/, /qwen/, /gemma/, /chat/, /instruct/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  })

  if (providerId === 'groq') return providerContractFromPatterns(lowerModelId, descriptor, {
    tts: [/orpheus/, /\btts\b/, /speech/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    chat: [/llama/, /gemma/, /qwen/, /chat/, /instruct/, /versatile/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['tts', 'stt'] })

  if (providerId === 'mimo') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/image/, /text[-_\s]?to[-_\s]?image/, /vision[-_\s]?generation/],
    vision: [/vision/, /visual/, /multimodal/, /image[-_\s]?text/, /(?:^|[-_/])vl(?:[-_/]|$)/],
    tts: [/\btts\b/, /speech/, /voice/],
    stt: [/\basr\b/, /transcri/, /speech[-_\s]?to[-_\s]?text/, /whisper/],
    agents: [/agent/, /tool[-_\s]?calling/, /function[-_\s]?calling/],
    chat: [/mimo-v/, /chat/, /instruct/],
    reasoning: [/reason/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['image', 'vision', 'tts', 'stt', 'agents'] })

  if (providerId === 'huggingface') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/flux/, /stable[-_]?diffusion/, /sdxl/, /pixart/, /kolors/, /recraft/],
    image_edit: [/inpaint/, /image[-_]?edit/],
    video: [/wan/, /cogvideo/, /mochi/, /ltx[-_]?video/, /hunyuanvideo/, /text[-_\s]?to[-_\s]?video/],
    image_to_video: [/\bi2v\b/, /image[-_\s]?to[-_\s]?video/],
    tts: [/mms-tts/, /\btts\b/, /bark/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    embeddings: [/sentence-transformers/, /embedding/, /mini?lm/, /bge/, /gte/, /\be5\b/],
    rerank: [/rerank/, /text[-_\s]?ranking/, /bge[-_]?reranker/],
    documents: [/document[-_]?question[-_]?answering/],
    translation: [/translat/],
    vision: [/vision/, /visual/, /image[-_\s]?text/, /(?:^|[-_/])vl(?:[-_/]|$)/],
    ocr: [/ocr/],
    chat: [/llama/, /mistral/, /gemma/, /chat/, /instruct/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['image', 'image_edit', 'video', 'image_to_video', 'tts', 'stt', 'embeddings', 'rerank', 'documents', 'translation', 'vision', 'ocr'] })

  return []
}

function providerContractFromPatterns(
  modelId: string,
  descriptor: string,
  patterns: Partial<Record<CapabilityId, RegExp[]>>,
  options: { excludeTextIfMatched?: CapabilityId[] } = {},
): CapabilityId[] {
  const matched = new Set<CapabilityId>()
  for (const [capability, matchers] of Object.entries(patterns) as Array<[CapabilityId, RegExp[] | undefined]>) {
    if (matchers?.some((pattern) => pattern.test(modelId) || pattern.test(descriptor))) {
      matched.add(capability)
    }
  }
  if (options.excludeTextIfMatched?.some((capability) => matched.has(capability))) {
    matched.delete('chat')
    matched.delete('reasoning')
    matched.delete('coding')
  }
  return [...matched]
}

function isAudioModel(providerId: ProviderId, modelId: string) {
  return providerContractFromPatterns(modelId, modelId, providerId === 'groq'
    ? { tts: [/orpheus/, /tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]synthesis/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
    : providerId === 'mimo'
      ? { tts: [/tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]generation/, /voice/], stt: [/asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/, /whisper/] }
      : providerId === 'qwen'
        ? { tts: [/qwen3-tts/], stt: [/qwen3-asr/] }
        : providerId === 'together'
          ? { tts: [/orpheus/, /tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]synthesis/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
          : providerId === 'huggingface'
            ? { tts: [/mms-tts/, /tts/, /bark/, /text[-_\s]?to[-_\s]?speech/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
            : { tts: [/tts/, /voice/], stt: [/stt/, /transcri/] }).length > 0
}

function isMediaModel(providerId: ProviderId, modelId: string) {
  return providerContractFromPatterns(modelId, modelId, providerId === 'qwen'
    ? { image: [/qwen-image/, /wanx.*(?:t2i|image)/], video: [/wan.*t2v/], image_to_video: [/wan.*i2v/] }
    : providerId === 'together'
      ? { image: [/flux/, /recraft/, /stable[-_]?diffusion/, /image/], video: [/video/, /kling/, /wan/, /seedance/, /mochi/, /hunyuanvideo/, /minimax\//], image_to_video: [/i2v/] }
      : providerId === 'huggingface'
        ? { image: [/flux/, /stable[-_]?diffusion/, /sdxl/, /pixart/, /kolors/, /recraft/], video: [/wan/, /cogvideo/, /mochi/, /ltx[-_]?video/, /hunyuanvideo/], image_to_video: [/i2v/] }
      : providerId === 'mimo'
        ? { image: [/image/, /text[-_\s]?to[-_\s]?image/], vision: [/vision/, /visual/, /multimodal/, /(?:^|[-_/])vl(?:[-_/]|$)/] }
        : providerId === 'genx'
          ? { image: [/image/, /recraft/, /banana/, /imagine/], video: [/video/, /veo/, /kling/, /seedance/, /pixverse/], image_to_video: [/i2v/] }
          : {}).length > 0
}

const GENX_TEXT_HINT = /\b(gpt|claude|gemini|grok|chat|text|language|codex|coder|reason)\b/i

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

function nestedString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null
  return firstString(value[key])
}

function metric(...values: unknown[]): number | null {
  for (const entry of values) {
    if (typeof entry === 'number' && Number.isFinite(entry)) return entry
    if (typeof entry === 'string' && entry.trim()) {
      const numeric = Number(entry)
      if (Number.isFinite(numeric)) return numeric
    }
  }
  return null
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
