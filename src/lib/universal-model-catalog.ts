import {
  AI_PROVIDER_MESH,
  type ApprovedDirectProviderId,
  type ProviderCapability,
} from '@/lib/provider-mesh'
import { listGenXModels, type GenXModel } from '@/lib/genx-client'

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

export type UniversalCostTier = 'free' | 'very_low' | 'low' | 'medium' | 'high' | 'premium' | 'unknown'
export type UniversalLatencyTier = 'ultra_low' | 'low' | 'medium' | 'high'

export interface UniversalModelRoute {
  provider: ApprovedDirectProviderId
  modelId: string
  displayName: string
  family: string
  capabilities: UniversalCapabilityGroup[]
  providerCapabilities: ProviderCapability[]
  costTier: UniversalCostTier
  latencyTier: UniversalLatencyTier
  contextWindow: number
  source: 'canonical_static' | 'genx_live'
  enabled: boolean
  configured?: boolean
  taskBased?: boolean
  supportsAdult?: boolean
  recommendedFor?: Array<'assistant' | 'repo_workbench' | 'media_studio'>
}

export interface UniversalModelCatalog {
  providers: typeof AI_PROVIDER_MESH
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
  if (capability === 'adult_video') return normalized === 'adult_video'
  if (capability === 'adult_voice') return normalized === 'adult_voice'
  return normalized !== 'off'
}

function route(
  provider: ApprovedDirectProviderId,
  modelId: string,
  displayName: string,
  family: string,
  capabilities: UniversalCapabilityGroup[],
  providerCapabilities: ProviderCapability[],
  options: Partial<Omit<UniversalModelRoute,
    'provider' | 'modelId' | 'displayName' | 'family' | 'capabilities' | 'providerCapabilities' | 'source'
  >> = {},
): UniversalModelRoute {
  return {
    provider,
    modelId,
    displayName,
    family,
    capabilities,
    providerCapabilities,
    costTier: options.costTier ?? 'medium',
    latencyTier: options.latencyTier ?? 'medium',
    contextWindow: options.contextWindow ?? 32_768,
    source: 'canonical_static',
    enabled: options.enabled ?? true,
    configured: options.configured,
    taskBased: options.taskBased,
    supportsAdult: options.supportsAdult,
    recommendedFor: options.recommendedFor,
  }
}

export const UNIVERSAL_MODEL_ROUTES: readonly UniversalModelRoute[] = [
  route('genx', 'gpt-5.4-mini', 'GenX Assistant Balanced', 'GenX routed GPT', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'medium', recommendedFor: ['assistant', 'repo_workbench'] }),
  route('genx', 'gpt-5.3-codex', 'GenX Coding Best', 'GenX routed Codex', ['coding', 'reasoning'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'premium', recommendedFor: ['repo_workbench'] }),
  route('genx', 'claude-sonnet-4.5', 'Claude Sonnet 4.5 via GenX', 'GenX routed Claude', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'premium' }),
  route('genx', 'gemini-2.5-pro', 'Gemini 2.5 Pro via GenX', 'GenX routed Gemini', ['chat', 'reasoning', 'image', 'video'], ['text', 'reasoning', 'vision', 'video'], { costTier: 'premium' }),
  route('genx', 'gpt-image-1', 'GPT Image via GenX', 'GenX routed image', ['image'], ['image'], { costTier: 'high', recommendedFor: ['media_studio'] }),
  route('genx', 'veo-3.1', 'Veo 3.1 via GenX', 'GenX routed video', ['video'], ['video', 'async_jobs'], { costTier: 'premium', latencyTier: 'high', recommendedFor: ['media_studio'] }),
  route('genx', 'lyria-2', 'Lyria via GenX', 'GenX routed music', ['music/audio'], ['music', 'audio', 'async_jobs'], { costTier: 'high', latencyTier: 'high', recommendedFor: ['media_studio'] }),
  route('genx', 'gpt-4o-mini-tts', 'Speech Synthesis via GenX', 'GenX routed speech', ['voice/TTS'], ['tts', 'audio'], { costTier: 'low', recommendedFor: ['media_studio'] }),
  route('genx', 'gpt-4o-transcribe', 'Speech Transcription via GenX', 'GenX routed speech', ['STT'], ['stt', 'audio'], { costTier: 'low', recommendedFor: ['media_studio'] }),
  route('genx', 'text-embedding-3-large', 'Embeddings via GenX', 'GenX routed embeddings', ['embeddings/moderation'], ['embeddings'], { costTier: 'low' }),

  route('huggingface', 'mistralai/Mistral-7B-Instruct-v0.3', 'Mistral 7B Instruct on Hugging Face', 'Mistral', ['chat', 'coding'], ['text', 'code'], { costTier: 'low', taskBased: true, recommendedFor: ['assistant'] }),
  route('huggingface', 'stabilityai/stable-diffusion-xl-base-1.0', 'Stable Diffusion XL on Hugging Face', 'Stable Diffusion XL', ['image'], ['image'], { costTier: 'low', taskBased: true, supportsAdult: true, recommendedFor: ['media_studio'] }),
  route('huggingface', 'Wan-AI/Wan2.1-T2V-14B-Diffusers', 'Wan 2.1 Text to Video on Hugging Face', 'Wan', ['video'], ['video'], { costTier: 'medium', taskBased: true, supportsAdult: true, recommendedFor: ['media_studio'] }),
  route('huggingface', 'facebook/musicgen-small', 'MusicGen Small on Hugging Face', 'MusicGen', ['music/audio'], ['music', 'audio'], { costTier: 'low', taskBased: true, recommendedFor: ['media_studio'] }),
  route('huggingface', 'openai/whisper-large-v3', 'Whisper Large v3 on Hugging Face', 'Whisper', ['STT'], ['stt', 'audio'], { costTier: 'low', taskBased: true }),
  route('huggingface', 'facebook/mms-tts-eng', 'MMS TTS English', 'MMS', ['voice/TTS'], ['tts', 'audio'], { costTier: 'low', taskBased: true }),
  route('huggingface', 'sentence-transformers/all-MiniLM-L6-v2', 'MiniLM Embeddings', 'Sentence Transformers', ['embeddings/moderation'], ['embeddings'], { costTier: 'free', taskBased: true }),

  route('qwen', 'qwen-turbo', 'Qwen Turbo', 'Qwen', ['chat', 'coding'], ['text', 'code'], { costTier: 'very_low', latencyTier: 'low', recommendedFor: ['repo_workbench'] }),
  route('qwen', 'qwen-plus', 'Qwen Plus', 'Qwen', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code'], { costTier: 'low', recommendedFor: ['assistant'] }),
  route('qwen', 'qwen-max', 'Qwen Max', 'Qwen', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'vision'], { costTier: 'medium' }),
  route('qwen', 'qwen-image', 'Qwen Image', 'Qwen Image', ['image'], ['image'], { costTier: 'low', recommendedFor: ['media_studio'] }),
  route('qwen', 'qwen-image-plus', 'Qwen Image Plus', 'Qwen Image', ['image'], ['image'], { costTier: 'medium', recommendedFor: ['media_studio'] }),
  route('qwen', 'qwen-image-max', 'Qwen Image Max', 'Qwen Image', ['image'], ['image'], { costTier: 'high', recommendedFor: ['media_studio'] }),
  route('qwen', 'qwen-image-2.0', 'Qwen Image 2.0', 'Qwen Image', ['image'], ['image'], { costTier: 'low', recommendedFor: ['media_studio'] }),
  route('qwen', 'qwen-image-2.0-pro', 'Qwen Image 2.0 Pro', 'Qwen Image', ['image'], ['image'], { costTier: 'premium', recommendedFor: ['media_studio'] }),
  route('qwen', 'wan2.1-t2v-turbo', 'Wan Text to Video Turbo', 'Wan', ['video'], ['video', 'async_jobs'], { costTier: 'medium', latencyTier: 'high', recommendedFor: ['media_studio'] }),
  route('qwen', 'wan2.1-i2v-turbo', 'Wan Image to Video', 'Wan', ['video'], ['video', 'image_to_video', 'async_jobs'], { costTier: 'medium', latencyTier: 'high', recommendedFor: ['media_studio'] }),

  route('mimo', 'mimo-v2.5', 'Xiaomi MiMo V2.5', 'Xiaomi MiMo', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'medium', recommendedFor: ['assistant', 'repo_workbench'] }),
  route('mimo', 'mimo-v2.5-pro', 'Xiaomi MiMo V2.5 Pro', 'Xiaomi MiMo', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'premium', contextWindow: 128_000 }),

  route('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B on Groq', 'Llama 3.3', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code', 'tools'], { costTier: 'low', latencyTier: 'ultra_low', recommendedFor: ['assistant', 'repo_workbench'] }),
  route('groq', 'whisper-large-v3-turbo', 'Whisper Large v3 Turbo on Groq', 'Whisper', ['STT'], ['stt', 'audio'], { costTier: 'low', latencyTier: 'ultra_low' }),
  route('groq', 'canopylabs/orpheus-v1-english', 'Orpheus English TTS on Groq', 'Orpheus', ['voice/TTS'], ['tts', 'audio'], { costTier: 'low', latencyTier: 'ultra_low' }),

  route('together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Llama 3.3 70B on Together', 'Llama 3.3', ['chat', 'reasoning', 'coding'], ['text', 'reasoning', 'code'], { costTier: 'low', recommendedFor: ['assistant', 'repo_workbench'] }),
  route('together', 'black-forest-labs/FLUX.1-schnell', 'FLUX.1 Schnell on Together', 'FLUX', ['image'], ['image'], { costTier: 'medium', supportsAdult: true, recommendedFor: ['media_studio'] }),
  route('together', 'black-forest-labs/FLUX.1.1-pro', 'FLUX 1.1 Pro on Together', 'FLUX', ['image'], ['image'], { costTier: 'high', supportsAdult: true, recommendedFor: ['media_studio'] }),
] as const

export async function getUniversalModelCatalog(): Promise<UniversalModelCatalog> {
  const liveGenx = await listGenXModels().catch(() => [])
  const liveRoutes = liveGenx.map(fromGenXLive)
  const models = dedupeModels([
    ...liveRoutes,
    ...UNIVERSAL_MODEL_ROUTES,
  ])
  return {
    providers: AI_PROVIDER_MESH,
    models,
    grouped: groupModels(models),
    genx: {
      live: liveRoutes.length > 0,
      modelCount: liveRoutes.length || UNIVERSAL_MODEL_ROUTES.filter((model) => model.provider === 'genx').length,
    },
    adultPolicies: [...ADULT_POLICY_VALUES],
  }
}

function fromGenXLive(model: GenXModel): UniversalModelRoute {
  const capabilities = capabilityGroups(model.capabilities.join(' '), model.category)
  return {
    ...route(
    'genx',
    model.id,
    model.name || model.id,
    'GenX live catalog',
    capabilities,
    providerCapabilities(capabilities),
    {
      costTier: normalizeCostTier(model.costTier),
      configured: true,
      supportsAdult: model.supportsAdult || capabilities.includes('adult'),
    },
    ),
    source: 'genx_live',
  }
}

function normalizeCostTier(value: string): UniversalCostTier {
  return ['free', 'very_low', 'low', 'medium', 'high', 'premium'].includes(value)
    ? value as UniversalCostTier
    : 'unknown'
}

function capabilityGroups(input: string, category = ''): UniversalCapabilityGroup[] {
  const value = `${input} ${category}`.toLowerCase()
  const groups = new Set<UniversalCapabilityGroup>()
  if (/code|coding|codex/.test(value)) groups.add('coding')
  if (/reason/.test(value)) groups.add('reasoning')
  if (/chat|text|language/.test(value)) groups.add('chat')
  if (/image|vision/.test(value)) groups.add('image')
  if (/video|avatar/.test(value)) groups.add('video')
  if (/music|audio|song|lyria/.test(value)) groups.add('music/audio')
  if (/tts|text-to-speech/.test(value)) groups.add('voice/TTS')
  if (/stt|transcription|speech-to-text/.test(value)) groups.add('STT')
  if (/embedding|moderation|rerank/.test(value)) groups.add('embeddings/moderation')
  if (/adult|nsfw/.test(value)) groups.add('adult')
  if (groups.size === 0) groups.add('chat')
  return [...groups]
}

function providerCapabilities(groups: UniversalCapabilityGroup[]): ProviderCapability[] {
  const capabilities = new Set<ProviderCapability>()
  if (groups.includes('chat')) capabilities.add('text')
  if (groups.includes('coding')) capabilities.add('code')
  if (groups.includes('reasoning')) capabilities.add('reasoning')
  if (groups.includes('image')) capabilities.add('image')
  if (groups.includes('video')) capabilities.add('video')
  if (groups.includes('music/audio')) capabilities.add('music')
  if (groups.includes('voice/TTS')) capabilities.add('tts')
  if (groups.includes('STT')) capabilities.add('stt')
  if (groups.includes('embeddings/moderation')) capabilities.add('embeddings')
  return [...capabilities]
}

function groupModels(models: UniversalModelRoute[]): Record<UniversalCapabilityGroup, UniversalModelRoute[]> {
  const grouped: Record<UniversalCapabilityGroup, UniversalModelRoute[]> = {
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
  }
  for (const model of models) {
    for (const capability of model.capabilities) grouped[capability].push(model)
  }
  return grouped
}

function dedupeModels(models: UniversalModelRoute[]): UniversalModelRoute[] {
  const seen = new Set<string>()
  return models.filter((model) => {
    const key = `${model.provider}:${model.modelId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
