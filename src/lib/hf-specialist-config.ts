import type { AiCapabilityProviderRoute } from '@/lib/ai-capability-taxonomy'

export type HfSpecialistCapability =
  | 'image_edit'
  | 'rerank'
  | 'embeddings'
  | 'music'
  | 'tts'
  | 'stt'
  | 'video'
  | 'image_to_video'
  | 'adult_image'
  | 'adult_video'
  | 'adult_avatar'

export type HfExecutionMode = 'router_model_api' | 'specialist_endpoint' | 'adult_only'

export interface HfSpecialistDefinition {
  capability: HfSpecialistCapability
  canonicalCapabilityIds: string[]
  model: string
  task: string
  executionMode: HfExecutionMode
  supportsRouterModelApi: boolean
  adultOnly: boolean
  notes: string
}

export interface HfSpecialistRegistryEntry extends HfSpecialistDefinition {
  endpoint: string | null
  endpointSource: 'specialist_registry' | 'model_api' | 'missing'
  configured: boolean
  requiredEnv: string[]
}

export interface HfSpecialistResolution {
  capability: string
  model: string | null
  endpoint: string | null
  modelSource: 'registry' | 'route' | 'missing'
  endpointSource: 'specialist_registry' | 'model_api' | 'missing'
  endpointRequired: boolean
  configured: boolean
  requiredEnv: string[]
  adultOnly: boolean
  supportsRouterModelApi: boolean
  registryCapability: HfSpecialistCapability | null
}

export const HF_SPECIALIST_REGISTRY: readonly HfSpecialistDefinition[] = [
  {
    capability: 'embeddings',
    canonicalCapabilityIds: ['embeddings', 'feature_extraction'],
    model: 'BAAI/bge-small-en-v1.5',
    task: 'feature-extraction',
    executionMode: 'router_model_api',
    supportsRouterModelApi: true,
    adultOnly: false,
    notes: 'Embeddings have a real Hugging Face router/model API path.',
  },
  {
    capability: 'rerank',
    canonicalCapabilityIds: ['rerank', 'text_ranking'],
    model: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    task: 'text-ranking',
    executionMode: 'specialist_endpoint',
    supportsRouterModelApi: false,
    adultOnly: false,
    notes: 'Rerank remains specialist-endpoint only in current launch truth.',
  },
  {
    capability: 'image_edit',
    canonicalCapabilityIds: ['image_edit', 'image_text_to_image', 'image_to_image'],
    model: 'timbrooks/instruct-pix2pix',
    task: 'image-to-image',
    executionMode: 'router_model_api',
    supportsRouterModelApi: true,
    adultOnly: false,
    notes: 'Image-to-image has a real Hugging Face model API path, but launch proof is still incomplete.',
  },
  {
    capability: 'music',
    canonicalCapabilityIds: ['music_generation', 'text_to_audio'],
    model: 'facebook/musicgen-small',
    task: 'text-to-audio',
    executionMode: 'specialist_endpoint',
    supportsRouterModelApi: false,
    adultOnly: false,
    notes: 'Music remains specialist-endpoint only until provider-safe runtime proof exists.',
  },
  {
    capability: 'tts',
    canonicalCapabilityIds: ['text_to_speech'],
    model: 'facebook/mms-tts-eng',
    task: 'text-to-speech',
    executionMode: 'router_model_api',
    supportsRouterModelApi: true,
    adultOnly: false,
    notes: 'TTS has a real Hugging Face router/model API path.',
  },
  {
    capability: 'stt',
    canonicalCapabilityIds: ['automatic_speech_recognition'],
    model: 'openai/whisper-large-v3',
    task: 'automatic-speech-recognition',
    executionMode: 'router_model_api',
    supportsRouterModelApi: true,
    adultOnly: false,
    notes: 'STT has a real Hugging Face router/model API path.',
  },
  {
    capability: 'video',
    canonicalCapabilityIds: ['text_to_video'],
    model: 'Wan-AI/Wan2.1-T2V-14B',
    task: 'text-to-video',
    executionMode: 'specialist_endpoint',
    supportsRouterModelApi: false,
    adultOnly: false,
    notes: 'Text-to-video remains specialist-endpoint only in current launch truth.',
  },
  {
    capability: 'image_to_video',
    canonicalCapabilityIds: ['image_to_video', 'image_text_to_video'],
    model: 'Wan-AI/Wan2.1-I2V-14B-480P',
    task: 'image-to-video',
    executionMode: 'specialist_endpoint',
    supportsRouterModelApi: false,
    adultOnly: false,
    notes: 'Image-to-video remains specialist-endpoint only in current launch truth.',
  },
  {
    capability: 'adult_image',
    canonicalCapabilityIds: ['adult_image', 'text_to_image'],
    model: 'SG161222/RealVisXL_V4.0',
    task: 'text-to-image',
    executionMode: 'adult_only',
    supportsRouterModelApi: false,
    adultOnly: true,
    notes: 'Adult image candidates are policy-gated only and not exposed as public execution routes.',
  },
  {
    capability: 'adult_video',
    canonicalCapabilityIds: ['adult_video', 'text_to_video'],
    model: 'NSFW-API/NSFW_Wan_14b',
    task: 'text-to-video',
    executionMode: 'adult_only',
    supportsRouterModelApi: false,
    adultOnly: true,
    notes: 'Adult video candidates remain gated and specialist-endpoint dependent.',
  },
  {
    capability: 'adult_avatar',
    canonicalCapabilityIds: ['adult_avatar', 'avatar_generation'],
    model: 'SG161222/RealVisXL_V4.0',
    task: 'text-to-image',
    executionMode: 'adult_only',
    supportsRouterModelApi: false,
    adultOnly: true,
    notes: 'Adult avatar remains adult-only and not exposed as a public HF runtime lane.',
  },
] as const

export const HF_ENDPOINT_REQUIRED_CAPABILITIES = HF_SPECIALIST_REGISTRY
  .filter((entry) => entry.executionMode === 'specialist_endpoint')
  .map((entry) => entry.canonicalCapabilityIds[0] ?? entry.capability) as readonly string[]

const CAPABILITY_ALIAS_MAP: Record<string, HfSpecialistCapability> = Object.fromEntries(
  HF_SPECIALIST_REGISTRY.flatMap((entry) => [
    [entry.capability, entry.capability],
    ...entry.canonicalCapabilityIds.map((id) => [id, entry.capability] as const),
  ]),
) as Record<string, HfSpecialistCapability>

function parseRegistryEnv(): Partial<Record<HfSpecialistCapability, string>> {
  const raw = process.env.HF_SPECIALIST_ENDPOINTS_JSON?.trim()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [CAPABILITY_ALIAS_MAP[key], publicHttpsUrl(typeof value === 'string' ? value : null)] as const)
        .filter((entry): entry is [HfSpecialistCapability, string] => Boolean(entry[0] && entry[1])),
    )
  } catch {
    return {}
  }
}

function publicHttpsUrl(raw?: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (
      host === 'localhost'
      || host === '0.0.0.0'
      || host.startsWith('127.')
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || host.startsWith('169.254.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) return null
    return url.toString()
  } catch {
    return null
  }
}

export function getHfSpecialistDefinition(capability: string): HfSpecialistDefinition | null {
  const key = CAPABILITY_ALIAS_MAP[capability]
  return HF_SPECIALIST_REGISTRY.find((entry) => entry.capability === key) ?? null
}

export function getAllHfSpecialistRegistryEntries(): HfSpecialistRegistryEntry[] {
  const registryEnv = parseRegistryEnv()
  return HF_SPECIALIST_REGISTRY.map((entry) => {
    const endpoint = registryEnv[entry.capability] ?? null
    const configured = entry.supportsRouterModelApi || Boolean(endpoint) || entry.adultOnly
    return {
      ...entry,
      endpoint,
      endpointSource: endpoint
        ? 'specialist_registry'
        : entry.supportsRouterModelApi
          ? 'model_api'
          : 'missing',
      configured,
      requiredEnv: entry.executionMode === 'specialist_endpoint'
        ? ['HF_SPECIALIST_ENDPOINTS_JSON']
        : ['HF_SPECIALIST_ENDPOINTS_JSON'],
    }
  })
}

export function resolveHfSpecialistConfig(
  capability: string,
  route?: Pick<AiCapabilityProviderRoute, 'modelIds'>,
): HfSpecialistResolution {
  const definition = getHfSpecialistDefinition(capability)
  const routeModel = route?.modelIds.find((model) => model && !model.startsWith('custom:') && !model.startsWith('task:')) ?? null
  if (!definition) {
    return {
      capability,
      model: routeModel,
      endpoint: routeModel ? `https://router.huggingface.co/hf-inference/models/${routeModel}` : null,
      modelSource: routeModel ? 'route' : 'missing',
      endpointSource: routeModel ? 'model_api' : 'missing',
      endpointRequired: false,
      configured: Boolean(routeModel),
      requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON'],
      adultOnly: false,
      supportsRouterModelApi: Boolean(routeModel),
      registryCapability: null,
    }
  }

  const registryEnv = parseRegistryEnv()
  const endpoint = registryEnv[definition.capability] ?? null
  const model = definition.model || routeModel
  const endpointRequired = definition.executionMode === 'specialist_endpoint'
  return {
    capability,
    model,
    endpoint: endpointRequired
      ? endpoint
      : model
        ? `https://router.huggingface.co/hf-inference/models/${model}`
        : null,
    modelSource: definition.model ? 'registry' : routeModel ? 'route' : 'missing',
    endpointSource: endpoint
      ? 'specialist_registry'
      : endpointRequired
        ? 'missing'
        : 'model_api',
    endpointRequired,
    configured: definition.adultOnly || (!endpointRequired && Boolean(model)) || Boolean(endpoint),
    requiredEnv: ['HF_SPECIALIST_ENDPOINTS_JSON'],
    adultOnly: definition.adultOnly,
    supportsRouterModelApi: definition.supportsRouterModelApi,
    registryCapability: definition.capability,
  }
}
