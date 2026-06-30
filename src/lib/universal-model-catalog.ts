import {
  APPROVED_AI_PROVIDERS,
  type ApprovedProviderKey,
} from '@/lib/approved-ai-catalog'
import {
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_STT_MODELS,
  GENX_TEXT_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
  listGenXModels,
  type GenXModel,
} from '@/lib/genx-client'
import { getAllProviderModelCatalogs, type ProviderModelOption } from '@/lib/ai-model-catalog'

export type UniversalCapabilityGroup =
  | 'coding'
  | 'reasoning'
  | 'chat'
  | 'image'
  | 'video'
  | 'music/audio'
  | 'voice/TTS'
  | 'STT'
  | 'embeddings/moderation'
  | 'adult'

export type AdultPolicyValue =
  | 'off'
  | 'suggestive'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'full_adult_app_mode'
  | 'specialist'

export interface UniversalModelRoute {
  provider: ApprovedProviderKey
  modelId: string
  displayName: string
  capabilities: UniversalCapabilityGroup[]
  costTier: string
  source: 'genx_live' | 'genx_fallback' | 'static_catalog' | 'huggingface_task'
  configured?: boolean
  taskBased?: boolean
  supportsAdult?: boolean
}

export interface UniversalModelCatalog {
  providers: typeof APPROVED_AI_PROVIDERS
  models: UniversalModelRoute[]
  grouped: Record<UniversalCapabilityGroup, UniversalModelRoute[]>
  genx: {
    live: boolean
    modelCount: number
  }
  adultPolicies: AdultPolicyValue[]
}

export const ADULT_POLICY_VALUES: readonly AdultPolicyValue[] = [
  'off',
  'suggestive',
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
  'full_adult_app_mode',
  'specialist',
] as const

export function normalizeAdultPolicy(value?: string): AdultPolicyValue {
  if (value === 'full_adult') return 'full_adult_app_mode'
  return ADULT_POLICY_VALUES.includes(value as AdultPolicyValue) ? value as AdultPolicyValue : 'off'
}

export function adultPolicyAllows(policy: string | undefined, capability: string): boolean {
  const normalized = normalizeAdultPolicy(policy)
  if (normalized === 'full_adult_app_mode' || normalized === 'specialist') return true
  if (capability === 'adult_text') return ['suggestive', 'adult_text'].includes(normalized)
  if (capability === 'adult_image') return ['suggestive', 'adult_image'].includes(normalized)
  if (capability === 'adult_video') return ['adult_video'].includes(normalized)
  if (capability === 'adult_voice') return ['adult_voice'].includes(normalized)
  return normalized !== 'off'
}

export async function getUniversalModelCatalog(): Promise<UniversalModelCatalog> {
  const [liveGenx, providerCatalogs] = await Promise.all([
    listGenXModels().catch(() => []),
    getAllProviderModelCatalogs().catch(() => []),
  ])
  const genxModels = liveGenx.length ? liveGenx.map(fromGenXLive) : genxFallbackModels()
  const staticModels = providerCatalogs
    .flatMap((catalog) => catalog.models.map((model) => fromStaticModel(model, catalog.configured)))
    .filter((model) => model.provider !== 'genx')
  const models = dedupeModels([...genxModels, ...staticModels])
  return {
    providers: APPROVED_AI_PROVIDERS,
    models,
    grouped: groupModels(models),
    genx: { live: liveGenx.length > 0, modelCount: liveGenx.length || genxModels.length },
    adultPolicies: [...ADULT_POLICY_VALUES],
  }
}

function fromGenXLive(model: GenXModel): UniversalModelRoute {
  return {
    provider: 'genx',
    modelId: model.id,
    displayName: model.name || model.id,
    capabilities: capabilityGroups(model.capabilities.join(' '), model.category),
    costTier: model.costTier,
    source: 'genx_live',
    configured: true,
    supportsAdult: model.supportsAdult || model.capabilities.some((capability) => String(capability).startsWith('adult')),
  }
}

function fromStaticModel(model: ProviderModelOption, configured: boolean): UniversalModelRoute {
  return {
    provider: model.provider as ApprovedProviderKey,
    modelId: model.modelId,
    displayName: model.displayName,
    capabilities: capabilityGroups([...model.roles, ...model.modalities].join(' ')),
    costTier: model.costTier,
    source: 'static_catalog',
    configured,
  }
}

function genxFallbackModels(): UniversalModelRoute[] {
  const rows: UniversalModelRoute[] = []
  for (const modelId of GENX_TEXT_MODELS) rows.push(fallback('genx', modelId, ['chat', 'reasoning', 'coding']))
  for (const modelId of GENX_IMAGE_MODELS) rows.push(fallback('genx', modelId, ['image']))
  for (const modelId of GENX_VIDEO_MODELS) rows.push(fallback('genx', modelId, ['video']))
  for (const modelId of GENX_AUDIO_MODELS) rows.push(fallback('genx', modelId, ['music/audio']))
  for (const modelId of GENX_TTS_MODELS) rows.push(fallback('genx', modelId, ['voice/TTS']))
  for (const modelId of GENX_STT_MODELS) rows.push(fallback('genx', modelId, ['STT']))
  return rows
}

function fallback(provider: ApprovedProviderKey, modelId: string, capabilities: UniversalCapabilityGroup[]): UniversalModelRoute {
  return { provider, modelId, displayName: modelId, capabilities, costTier: 'unknown', source: 'genx_fallback' }
}

function capabilityGroups(haystackInput: string, category = ''): UniversalCapabilityGroup[] {
  const haystack = `${haystackInput} ${category}`.toLowerCase()
  const groups = new Set<UniversalCapabilityGroup>()
  if (/code|coding|codex/.test(haystack)) groups.add('coding')
  if (/reason/.test(haystack)) groups.add('reasoning')
  if (/chat|text|language/.test(haystack)) groups.add('chat')
  if (/image|vision/.test(haystack)) groups.add('image')
  if (/video|avatar/.test(haystack)) groups.add('video')
  if (/music|audio|song|lyria/.test(haystack)) groups.add('music/audio')
  if (/tts|voice_tts|text-to-speech|speech/.test(haystack)) groups.add('voice/TTS')
  if (/stt|voice_stt|transcription|speech-to-text/.test(haystack)) groups.add('STT')
  if (/embedding|moderation|rerank/.test(haystack)) groups.add('embeddings/moderation')
  if (/adult|nsfw/.test(haystack)) groups.add('adult')
  if (groups.size === 0) groups.add('chat')
  return [...groups]
}

function groupModels(models: UniversalModelRoute[]): Record<UniversalCapabilityGroup, UniversalModelRoute[]> {
  const grouped = {
    coding: [],
    reasoning: [],
    chat: [],
    image: [],
    video: [],
    'music/audio': [],
    'voice/TTS': [],
    STT: [],
    'embeddings/moderation': [],
    adult: [],
  } as Record<UniversalCapabilityGroup, UniversalModelRoute[]>
  for (const model of models) {
    for (const capability of model.capabilities) grouped[capability].push(model)
  }
  return grouped
}

function dedupeModels(models: UniversalModelRoute[]): UniversalModelRoute[] {
  const seen = new Set<string>()
  const out: UniversalModelRoute[] = []
  for (const model of models) {
    const key = `${model.provider}:${model.modelId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(model)
  }
  return out
}
