import { MODEL_REGISTRY, type CostTier, type ModelRole } from '@/lib/model-registry'
import { listGenXModels, GENX_AUDIO_MODELS, GENX_IMAGE_MODELS, GENX_STT_MODELS, GENX_TEXT_MODELS, GENX_TTS_MODELS, GENX_VIDEO_MODELS } from '@/lib/genx-client'
import { getServiceKey } from '@/lib/service-vault'
import { getProviderGovernanceByKey } from '@/lib/ai-provider-governance'

export type ModelModality = 'text' | 'image' | 'video' | 'voice_tts' | 'voice_stt' | 'music' | 'embedding' | 'rerank' | 'multimodal'

export interface ProviderModelOption {
  provider: string
  modelId: string
  displayName: string
  family: string
  modalities: ModelModality[]
  roles: ModelRole[]
  costTier: CostTier | 'unknown'
  contextWindow?: number
  source: 'static' | 'genx_live' | 'provider_live' | 'custom_supported'
  enabled: boolean
  notes?: string
}

export interface ProviderModelCatalog {
  provider: string
  displayName: string
  configured: boolean
  governanceStatus: string | null
  supportsCustomModelIds: boolean
  supportsLiveDiscovery: boolean
  liveDiscoveryStatus: 'not_attempted' | 'success' | 'failed' | 'not_supported'
  models: ProviderModelOption[]
  recommendedDefaults: Record<string, string>
  notes: string[]
}

const QWEN_MODELS: ProviderModelOption[] = [
  model('qwen', 'qwen-plus', 'Qwen Plus', 'Qwen', ['text'], ['chat', 'reasoning', 'coding', 'creative'], 'very_low', 128_000, 'static', true, 'Strong cheap default for chat, coding and multilingual work.'),
  model('qwen', 'qwen-turbo', 'Qwen Turbo', 'Qwen', ['text'], ['chat', 'creative'], 'very_low', 128_000, 'static', true, 'Fast low-cost route.'),
  model('qwen', 'qwen-max', 'Qwen Max', 'Qwen', ['text'], ['chat', 'reasoning', 'coding'], 'medium', 128_000, 'static', true, 'Higher quality Qwen route when available on the account.'),
  model('qwen', 'qwen-long', 'Qwen Long', 'Qwen', ['text'], ['chat', 'reasoning', 'coding'], 'low', 1_000_000, 'static', true, 'Long-context option for large documents/leads if enabled in DashScope.'),
  model('qwen', 'qwen-vl-plus', 'Qwen VL Plus', 'Qwen VL', ['multimodal', 'image'], ['vision', 'chat', 'reasoning'], 'low', 128_000, 'static', true, 'Vision/multimodal route.'),
  model('qwen', 'qwen-omni-turbo', 'Qwen Omni Turbo', 'Qwen Omni', ['multimodal', 'voice_tts', 'voice_stt'], ['voice_interaction', 'chat', 'reasoning'], 'low', 128_000, 'static', true, 'Omni/voice-capable route where enabled.'),
  model('qwen', 'wanx2.1-t2i-turbo', 'Wanx 2.1 Text-to-Image Turbo', 'Wanx', ['image'], ['image_generation', 'creative'], 'low', undefined, 'static', true, 'DashScope AIGC image endpoint required.'),
  model('qwen', 'wanx2.1-i2v-turbo', 'Wanx 2.1 Image-to-Video Turbo', 'Wanx', ['video'], ['video_generation', 'creative'], 'medium', undefined, 'static', true, 'DashScope AIGC video endpoint required.'),
]

const MINIMAX_MODELS: ProviderModelOption[] = [
  model('minimax', 'MiniMax-M2.7', 'MiniMax M2.7', 'MiniMax M2', ['text'], ['chat', 'reasoning', 'coding', 'creative'], 'low', 204_800, 'static', true, 'Primary MiniMax/Mimo text model.'),
  model('minimax', 'MiniMax-M2.7-highspeed', 'MiniMax M2.7 Highspeed', 'MiniMax M2', ['text'], ['chat', 'coding', 'creative'], 'low', 204_800, 'static', true, 'Fast MiniMax/Mimo text route.'),
  model('minimax', 'MiniMax-M2.5', 'MiniMax M2.5', 'MiniMax M2', ['text'], ['chat', 'reasoning', 'coding'], 'low', 204_800, 'static', true, 'Good coding/refactor route.'),
  model('minimax', 'M2-her', 'MiniMax M2-her', 'MiniMax Roleplay', ['text'], ['chat', 'creative'], 'low', 204_800, 'static', true, 'Character/personality app route.'),
  model('minimax', 'speech-2.8-hd', 'MiniMax Speech 2.8 HD', 'MiniMax Speech', ['voice_tts'], ['tts', 'voice_interaction'], 'medium', undefined, 'static', true, 'Premium TTS route.'),
  model('minimax', 'speech-2.6-turbo', 'MiniMax Speech 2.6 Turbo', 'MiniMax Speech', ['voice_tts'], ['tts', 'voice_interaction'], 'low', undefined, 'static', true, 'Fast/value TTS route.'),
  model('minimax', 'MiniMax-Hailuo-2.3', 'MiniMax Hailuo 2.3', 'Hailuo', ['video'], ['video_generation', 'creative'], 'medium', undefined, 'static', true, 'Text/image-to-video route.'),
  model('minimax', 'MiniMax-Hailuo-2.3-Fast', 'MiniMax Hailuo 2.3 Fast', 'Hailuo', ['video'], ['video_generation', 'creative'], 'low', undefined, 'static', true, 'Fast image-to-video route.'),
  model('minimax', 'Music2.6', 'MiniMax Music 2.6', 'MiniMax Music', ['music'], ['creative'], 'medium', undefined, 'static', true, 'Music/audio route when enabled.'),
]

const DEEPSEEK_MODELS: ProviderModelOption[] = [
  model('deepseek', 'deepseek-chat', 'DeepSeek Chat', 'DeepSeek V3', ['text'], ['chat', 'coding', 'creative'], 'very_low', 64_000, 'static', true),
  model('deepseek', 'deepseek-reasoner', 'DeepSeek Reasoner', 'DeepSeek R1', ['text'], ['reasoning', 'coding', 'validation'], 'very_low', 64_000, 'static', true),
]

const GEMINI_MODELS: ProviderModelOption[] = [
  model('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini', ['multimodal', 'text', 'image'], ['reasoning', 'chat', 'coding', 'vision'], 'medium', 1_000_000, 'static', true),
  model('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini', ['multimodal', 'text', 'image'], ['chat', 'reasoning', 'vision'], 'low', 1_000_000, 'static', true),
  model('gemini', 'gemini-2.5-flash-preview-tts', 'Gemini Flash TTS', 'Gemini TTS', ['voice_tts'], ['tts', 'voice_interaction'], 'low', undefined, 'static', true),
  model('gemini', 'text-embedding-004', 'Gemini Text Embedding', 'Gemini Embeddings', ['embedding'], ['embeddings'], 'very_low', 2_048, 'static', true),
]

const HF_MODELS: ProviderModelOption[] = [
  model('huggingface', 'meta-llama/Llama-3.1-8B-Instruct', 'Llama 3.1 8B Instruct', 'Llama', ['text'], ['chat', 'coding', 'creative'], 'low', 128_000, 'static', true),
  model('huggingface', 'meta-llama/Llama-3.3-70B-Instruct', 'Llama 3.3 70B Instruct', 'Llama', ['text'], ['chat', 'reasoning', 'coding'], 'low', 128_000, 'static', true),
  model('huggingface', 'google/gemma-3-27b-it', 'Gemma 3 27B IT', 'Gemma', ['text'], ['chat', 'reasoning', 'coding'], 'low', 128_000, 'static', true),
  model('huggingface', 'Qwen/Qwen3-32B', 'Qwen3 32B on HF', 'Qwen', ['text'], ['chat', 'reasoning', 'coding'], 'low', 128_000, 'static', true),
  model('huggingface', 'black-forest-labs/FLUX.1-schnell', 'FLUX.1 Schnell', 'FLUX', ['image'], ['image_generation', 'creative'], 'low', undefined, 'static', true),
  model('huggingface', 'stabilityai/stable-diffusion-3-medium', 'Stable Diffusion 3 Medium', 'Stable Diffusion', ['image'], ['image_generation', 'creative'], 'low', undefined, 'static', true),
  model('huggingface', 'openai/whisper-large-v3', 'Whisper Large v3', 'Whisper', ['voice_stt'], ['voice_interaction'], 'low', undefined, 'static', true),
  model('huggingface', 'hexgrad/Kokoro-82M', 'Kokoro 82M TTS', 'Kokoro', ['voice_tts'], ['tts', 'voice_interaction'], 'free', undefined, 'static', true),
  model('huggingface', 'sentence-transformers/all-MiniLM-L6-v2', 'All-MiniLM L6 v2', 'Sentence Transformers', ['embedding'], ['embeddings'], 'free', 512, 'static', true),
]

const MOONSHOT_MODELS: ProviderModelOption[] = [
  model('moonshot', 'kimi-k2.6', 'Kimi K2.6', 'Kimi K2', ['text'], ['reasoning', 'coding', 'chat'], 'medium', 1_000_000, 'static', true, 'Long-context/coding route. Replace with live model ID if account exposes a different version.'),
  model('moonshot', 'kimi-k2.5', 'Kimi K2.5', 'Kimi K2', ['text'], ['reasoning', 'coding', 'chat'], 'medium', 1_000_000, 'static', true, 'Useful for massive lead/data ingestion.'),
]

const ZHIPU_MODELS: ProviderModelOption[] = [
  model('zhipu', 'glm-5', 'GLM-5', 'GLM', ['text'], ['reasoning', 'coding', 'chat'], 'medium', 128_000, 'static', true, 'Agent/coding route where available.'),
  model('zhipu', 'glm-4.5', 'GLM-4.5', 'GLM', ['text'], ['reasoning', 'coding', 'chat'], 'low', 128_000, 'static', true, 'Agent/coding route where available.'),
  model('zhipu', 'glm-4.6v-flash', 'GLM-4.6V Flash', 'GLM Vision', ['multimodal', 'image'], ['vision', 'chat', 'reasoning'], 'low', 128_000, 'static', true, 'Vision/multimodal route where available.'),
]

const GROQ_MODELS: ProviderModelOption[] = [
  model('groq', 'llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'Llama', ['text'], ['chat', 'reasoning', 'coding', 'creative'], 'low', 128_000, 'static', true),
  model('groq', 'playai-tts', 'PlayAI TTS', 'PlayAI', ['voice_tts'], ['tts', 'voice_interaction'], 'low', undefined, 'static', true),
]

const TOGETHER_MODELS: ProviderModelOption[] = [
  model('together', 'meta-llama/Llama-3-70b-chat-hf', 'Llama 3 70B Chat', 'Llama', ['text'], ['chat', 'reasoning', 'coding', 'creative'], 'low', 8_192, 'static', true),
  model('together', 'black-forest-labs/FLUX.1-schnell', 'FLUX.1 Schnell', 'FLUX', ['image'], ['image_generation', 'creative'], 'low', undefined, 'static', true),
]

export const STATIC_PROVIDER_MODELS: Record<string, ProviderModelOption[]> = {
  qwen: QWEN_MODELS,
  minimax: MINIMAX_MODELS,
  mimo: MINIMAX_MODELS.map((entry) => ({ ...entry, provider: 'mimo' })),
  deepseek: DEEPSEEK_MODELS,
  gemini: GEMINI_MODELS,
  huggingface: HF_MODELS,
  moonshot: MOONSHOT_MODELS,
  zhipu: ZHIPU_MODELS,
  groq: GROQ_MODELS,
  together: TOGETHER_MODELS,
}

function model(
  provider: string,
  modelId: string,
  displayName: string,
  family: string,
  modalities: ModelModality[],
  roles: ModelRole[],
  costTier: CostTier | 'unknown',
  contextWindow?: number,
  source: ProviderModelOption['source'] = 'static',
  enabled = true,
  notes?: string,
): ProviderModelOption {
  return { provider, modelId, displayName, family, modalities, roles, costTier, contextWindow, source, enabled, notes }
}

function fromRegistry(provider: string): ProviderModelOption[] {
  return MODEL_REGISTRY
    .filter((entry) => entry.provider === provider && entry.enabled)
    .map((entry) => model(
      entry.provider,
      entry.model_id,
      entry.model_name,
      entry.family,
      [entry.category === 'voice' ? 'voice_tts' : entry.category === 'embeddings' ? 'embedding' : entry.category === 'music' ? 'music' : entry.category as ModelModality],
      [entry.primary_role, ...entry.secondary_roles],
      entry.cost_tier,
      entry.context_window,
      'static',
      entry.enabled,
      entry.specialist_domains.join(', '),
    ))
}

async function configured(provider: string) {
  const envMap: Record<string, string[]> = {
    genx: ['GENX_API_KEY'],
    qwen: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
    minimax: ['MINIMAX_API_KEY', 'MIMO_API_KEY'],
    mimo: ['MIMO_API_KEY', 'MINIMAX_API_KEY'],
    deepseek: ['DEEPSEEK_API_KEY'],
    gemini: ['GEMINI_API_KEY'],
    huggingface: ['HUGGINGFACE_API_KEY'],
    groq: ['GROQ_API_KEY'],
    together: ['TOGETHER_API_KEY'],
    moonshot: ['MOONSHOT_API_KEY'],
    zhipu: ['ZHIPU_API_KEY'],
  }
  for (const env of envMap[provider] ?? []) {
    const key = await getServiceKey(provider, env)
    if (key) return true
  }
  return false
}

async function genxCatalog(): Promise<ProviderModelOption[]> {
  const live = await listGenXModels().catch(() => [])
  if (live.length > 0) {
    return live.map((entry) => model('genx', entry.id, entry.name, entry.category ?? 'GenX', ['multimodal'], ['chat'], entry.costTier, entry.contextWindow, 'genx_live', true, entry.capabilities.join(', ')))
  }
  return [
    ...GENX_TEXT_MODELS.map((id) => model('genx', id, id, 'GenX Text', ['text'], ['chat', 'reasoning', 'coding'], 'unknown', undefined, 'static')),
    ...GENX_IMAGE_MODELS.map((id) => model('genx', id, id, 'GenX Image', ['image'], ['image_generation'], 'unknown', undefined, 'static')),
    ...GENX_VIDEO_MODELS.map((id) => model('genx', id, id, 'GenX Video', ['video'], ['video_generation'], 'unknown', undefined, 'static')),
    ...GENX_TTS_MODELS.map((id) => model('genx', id, id, 'GenX TTS', ['voice_tts'], ['tts'], 'unknown', undefined, 'static')),
    ...GENX_STT_MODELS.map((id) => model('genx', id, id, 'GenX STT', ['voice_stt'], ['voice_interaction'], 'unknown', undefined, 'static')),
    ...GENX_AUDIO_MODELS.map((id) => model('genx', id, id, 'GenX Audio', ['music'], ['creative'], 'unknown', undefined, 'static')),
  ]
}

export async function getProviderModelCatalog(provider: string): Promise<ProviderModelCatalog> {
  const key = provider === 'mimo' ? 'minimax' : provider
  const governance = getProviderGovernanceByKey(key)
  const isConfigured = await configured(key)
  const staticModels = [
    ...(provider === 'genx' ? await genxCatalog() : []),
    ...(STATIC_PROVIDER_MODELS[key] ?? []),
    ...fromRegistry(key),
  ]

  const deduped = [...new Map(staticModels.map((entry) => [`${entry.provider}:${entry.modelId}`, entry])).values()]
  const supportsCustom = ['genx', 'qwen', 'minimax', 'mimo', 'deepseek', 'gemini', 'huggingface', 'moonshot', 'zhipu', 'groq', 'together', 'openrouter'].includes(key)
  if (supportsCustom) {
    deduped.push(model(key, 'custom:model-id', 'Custom model ID', 'Custom', ['text', 'multimodal'], ['chat'], 'unknown', undefined, 'custom_supported', true, 'Use any provider-supported model ID or Hugging Face endpoint URL selected per app.'))
  }

  return {
    provider: key,
    displayName: governance?.displayName ?? key,
    configured: isConfigured,
    governanceStatus: governance?.status ?? null,
    supportsCustomModelIds: supportsCustom,
    supportsLiveDiscovery: key === 'genx' || key === 'huggingface',
    liveDiscoveryStatus: key === 'genx' ? (deduped.some((entry) => entry.source === 'genx_live') ? 'success' : 'failed') : key === 'huggingface' ? 'not_attempted' : 'not_supported',
    models: deduped,
    recommendedDefaults: recommendedDefaults(key),
    notes: notesForProvider(key),
  }
}

export async function getAllProviderModelCatalogs(): Promise<ProviderModelCatalog[]> {
  const providers = ['genx', 'qwen', 'minimax', 'deepseek', 'gemini', 'huggingface', 'groq', 'together', 'moonshot', 'zhipu', 'openrouter']
  return Promise.all(providers.map(getProviderModelCatalog))
}

function recommendedDefaults(provider: string): Record<string, string> {
  const defaults: Record<string, Record<string, string>> = {
    genx: { chat: 'auto:chat-balanced', coding: 'auto:coding-best', image: 'auto:image', voice: 'auto:voice-tts' },
    qwen: { chat: 'qwen-plus', cheap: 'qwen-turbo', longContext: 'qwen-long', image: 'wanx2.1-t2i-turbo', video: 'wanx2.1-i2v-turbo', voice: 'qwen-omni-turbo' },
    minimax: { chat: 'MiniMax-M2.7', cheap: 'MiniMax-M2.7-highspeed', roleplay: 'M2-her', voice: 'speech-2.8-hd', video: 'MiniMax-Hailuo-2.3', music: 'Music2.6' },
    deepseek: { chat: 'deepseek-chat', reasoning: 'deepseek-reasoner', coding: 'deepseek-reasoner' },
    gemini: { chat: 'gemini-2.5-flash', reasoning: 'gemini-2.5-pro', voice: 'gemini-2.5-flash-preview-tts', embedding: 'text-embedding-004' },
    huggingface: { chat: 'meta-llama/Llama-3.1-8B-Instruct', image: 'black-forest-labs/FLUX.1-schnell', stt: 'openai/whisper-large-v3', tts: 'hexgrad/Kokoro-82M', embedding: 'sentence-transformers/all-MiniLM-L6-v2' },
    moonshot: { longContext: 'kimi-k2.6', coding: 'kimi-k2.6' },
    zhipu: { chat: 'glm-5', coding: 'glm-5', vision: 'glm-4.6v-flash' },
  }
  return defaults[provider] ?? {}
}

function notesForProvider(provider: string): string[] {
  if (provider === 'huggingface') {
    return [
      'Use Inference Providers for serverless model calls by model ID.',
      'Use Inference Endpoints by setting a dedicated endpoint URL for heavy/consistent traffic.',
      'Any Hugging Face model ID should be accepted at app-configuration time; the static list is only a curated starter set.',
    ]
  }
  if (provider === 'qwen') return ['Qwen chat models use compatible-mode; Wanx image/video and Omni voice require specialist routes.']
  if (provider === 'minimax') return ['MiniMax text is OpenAI-compatible; video/music/voice require specialist routes. Mimo is treated as MiniMax unless a separate Mimo API is provided.']
  if (provider === 'genx') return ['GenX live catalog is preferred; static models are fallback only.']
  return []
}
