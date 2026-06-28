import type { ProviderMeshId } from '@/lib/provider-mesh'

export const ACTIVE_AI_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const
export type ActiveAIProviderKey = (typeof ACTIVE_AI_PROVIDER_KEYS)[number]
export const V1_PRODUCTION_AI_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq'] as const
export type V1ProductionAIProviderKey = (typeof V1_PRODUCTION_AI_PROVIDER_KEYS)[number]

export const REMOVED_AI_PROVIDER_KEYS = [
  'qwen',
  'dashscope',
  'wanx',
  'minimax',
  'openai',
  'gemini',
  'anthropic',
  'openrouter',
  'deepseek',
  'moonshot',
  'replicate',
  'cohere',
  'nvidia',
  'mistral',
] as const

export type CapabilityProofStatus =
  | 'untested'
  | 'unconfigured'
  | 'requires_endpoint'
  | 'requires_verification'
  | 'unsupported'
  | 'working'
  | 'failed'

export type ProviderTask =
  | 'health'
  | 'models'
  | 'chat'
  | 'streaming_chat'
  | 'text_generation'
  | 'research'
  | 'summarization'
  | 'translation'
  | 'embeddings'
  | 'rerank'
  | 'text_to_image'
  | 'image_to_image'
  | 'image_edit'
  | 'image_analysis'
  | 'ocr'
  | 'text_to_video'
  | 'image_to_video'
  | 'video_job_poll'
  | 'music_instrumental'
  | 'music_song'
  | 'text_to_speech'
  | 'speech_to_text'
  | 'avatar_image'
  | 'avatar_video'
  | 'adult_text'
  | 'adult_image'
  | 'adult_voice'
  | 'adult_video'

export type RuntimeCapabilityKey =
  | ProviderTask
  | 'rag_ingest'
  | 'rag_query'
  | 'memory_save'
  | 'memory_retrieve'
  | 'long_form_video_plan'
  | 'long_form_video_assembly'
  | 'artifact_create'
  | 'artifact_read'
  | 'artifact_download'
  | 'agent_run'
  | 'approval_request'
  | 'approval_decide'
  | 'publishing_blocked_until_approved'

export type ProviderAuthMethod = 'bearer' | 'api-key' | 'none'
export type ArtifactHandling = 'download' | 'remote_reference' | 'bytes' | 'text' | 'none'
export type ProviderAudience = 'normal_only' | 'adult_only' | 'normal_and_adult'

export interface ProviderTaskRuntime {
  readonly endpoint: string
  readonly method: 'GET' | 'POST'
  readonly routeShape: string
  readonly status: CapabilityProofStatus
  readonly requiresDedicatedEndpoint: boolean
  readonly dedicatedEndpointEnv?: string
  readonly supportsAsyncJob: boolean
  readonly artifactHandling: ArtifactHandling
  readonly notes: string
}

export interface ProviderRuntime {
  readonly key: ActiveAIProviderKey
  readonly displayName: string
  readonly envAliases: readonly string[]
  readonly baseUrl: string
  readonly authMethod: ProviderAuthMethod
  readonly supportedCapabilityKeys: readonly RuntimeCapabilityKey[]
  readonly unsupportedCapabilityKeys: readonly RuntimeCapabilityKey[]
  readonly taskEndpointMap: Partial<Record<ProviderTask, ProviderTaskRuntime>>
  readonly testEndpointMap: Partial<Record<ProviderTask | 'provider', string>>
  readonly asyncJobSupport: boolean
  readonly artifactHandling: ArtifactHandling
  readonly audience: ProviderAudience
  readonly normalAllowed: boolean
  readonly adultAllowed: boolean
  readonly adminNotes: string
}

const chatShape = 'OpenAI-compatible /chat/completions JSON messages'
const hfTaskShape = 'Hugging Face task-specific Inference API or configured Inference Endpoint'

export const PROVIDER_RUNTIME: Record<ActiveAIProviderKey, ProviderRuntime> = {
  genx: {
    key: 'genx',
    displayName: 'GenX',
    envAliases: ['GENX_API_KEY'],
    baseUrl: 'https://query.genx.sh',
    authMethod: 'bearer',
    supportedCapabilityKeys: [
      'health', 'models', 'chat', 'streaming_chat', 'text_generation', 'research',
      'summarization', 'translation', 'text_to_image', 'text_to_video', 'image_to_video',
      'video_job_poll', 'music_instrumental', 'music_song', 'text_to_speech',
      'speech_to_text', 'avatar_image',
    ],
    unsupportedCapabilityKeys: ['avatar_video', 'adult_text', 'adult_image', 'adult_voice', 'adult_video'],
    taskEndpointMap: {
      health: { endpoint: '/v1/models', method: 'GET', routeShape: 'Bearer-auth model list', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Health/model availability check only.' },
      models: { endpoint: '/v1/models', method: 'GET', routeShape: 'Bearer-auth model list', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Used by admin tests.' },
      chat: { endpoint: '/v1/chat/completions', method: 'POST', routeShape: chatShape, status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Implemented by callProvider/callGenXChat.' },
      streaming_chat: { endpoint: '/v1/chat/completions', method: 'POST', routeShape: 'streaming support requires live verification', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Do not mark working until live stream shape is proven.' },
      text_to_image: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX media response: url, job id, or error', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Route code handles url/job id; live model shape still needs proof.' },
      text_to_video: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX async video job or direct media URL', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Route starts jobs only when provider returns url/job id.' },
      image_to_video: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX image-to-video media call', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Endpoint shape is guarded until live proof.' },
      video_job_poll: { endpoint: '/v1/media/jobs/{id}', method: 'GET', routeShape: 'GenX async job polling', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Poll route must be live-tested before working state.' },
      music_instrumental: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX audio/media generation', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Audio URL/job handling exists; model contract needs live proof.' },
      music_song: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX full-song audio job', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Never claim full song working until endpoint and artifact proof pass.' },
      text_to_speech: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX audio generation', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'TTS route downloads URL before artifact creation.' },
      speech_to_text: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX audio transcription metadata task', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'text', notes: 'STT shape must be proven live.' },
      avatar_image: { endpoint: '/v1/media/generations', method: 'POST', routeShape: 'GenX image/avatar media generation', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'download', notes: 'Allowed only after route shape proof.' },
    },
    testEndpointMap: { provider: '/api/admin/providers/genx/test', health: '/api/admin/providers/genx/test', chat: '/api/admin/providers/genx/test' },
    asyncJobSupport: true,
    artifactHandling: 'download',
    audience: 'normal_only',
    normalAllowed: true,
    adultAllowed: false,
    adminNotes: 'Preferred runtime when a task endpoint shape is implemented; unknown media tasks remain requires_verification.',
  },
  huggingface: {
    key: 'huggingface',
    displayName: 'Hugging Face',
    envAliases: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    baseUrl: 'https://api-inference.huggingface.co',
    authMethod: 'bearer',
    supportedCapabilityKeys: [
      'health', 'models', 'chat', 'text_generation', 'embeddings', 'text_to_image',
      'image_to_image', 'image_edit', 'image_analysis', 'ocr', 'speech_to_text',
      'text_to_speech', 'music_instrumental', 'music_song', 'text_to_video',
      'image_to_video', 'avatar_image', 'adult_text', 'adult_image', 'adult_voice',
      'adult_video',
    ],
    unsupportedCapabilityKeys: ['streaming_chat'],
    taskEndpointMap: {
      health: { endpoint: 'https://huggingface.co/api/whoami-v2', method: 'GET', routeShape: 'HF account endpoint plus task fallback', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Missing token is unconfigured, not crash.' },
      chat: { endpoint: 'https://router.huggingface.co/v1/chat/completions', method: 'POST', routeShape: chatShape, status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Only chat/text may use router chat shape.' },
      text_to_image: { endpoint: '/models/{model}', method: 'POST', routeShape: hfTaskShape, status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'download', notes: 'Normal image routes must not expose adult model IDs.' },
      image_to_image: { endpoint: '/models/{model}', method: 'POST', routeShape: 'task-specific image-to-image payload', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'download', notes: 'Only where model supports image-to-image.' },
      image_edit: { endpoint: '/models/{model}', method: 'POST', routeShape: 'task-specific inpainting/image edit payload', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'download', notes: 'No generic chat fallback.' },
      embeddings: { endpoint: '/models/{embedding-model}', method: 'POST', routeShape: '{ inputs } feature extraction', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Feature extraction endpoint.' },
      speech_to_text: { endpoint: '/models/{asr-model}', method: 'POST', routeShape: 'audio bytes to ASR model', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'ASR route uses audio bytes, not chat.' },
      text_to_speech: { endpoint: '/models/{tts-model}', method: 'POST', routeShape: '{ inputs } returns audio bytes', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'bytes', notes: 'TTS route persists audio bytes.' },
      music_instrumental: { endpoint: '/models/facebook/musicgen-*', method: 'POST', routeShape: 'text-to-audio segment', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'bytes', notes: 'Segment/instrumental only.' },
      music_song: { endpoint: '${HF_ENDPOINT_ACE_STEP | HF_ENDPOINT_YUE | HF_ENDPOINT_DIFFRHYTHM}', method: 'POST', routeShape: 'dedicated HF endpoint full-song generation', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ENDPOINT_ACE_STEP', supportsAsyncJob: true, artifactHandling: 'download', notes: 'Full song requires a dedicated endpoint.' },
      text_to_video: { endpoint: '${HF_ENDPOINT_HUNYUAN_VIDEO | HF_ENDPOINT_LTX_VIDEO | HF_ENDPOINT_WAN2 | HF_ENDPOINT_COGVIDEOX}', method: 'POST', routeShape: 'dedicated HF endpoint video generation', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ENDPOINT_HUNYUAN_VIDEO', supportsAsyncJob: true, artifactHandling: 'download', notes: 'Quality video models require dedicated endpoints; serverless animation is untested.' },
      image_to_video: { endpoint: '${HF_ENDPOINT_LTX_VIDEO | HF_ENDPOINT_WAN2}', method: 'POST', routeShape: 'dedicated HF endpoint image-to-video generation', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ENDPOINT_LTX_VIDEO', supportsAsyncJob: true, artifactHandling: 'download', notes: 'Requires a task-specific endpoint.' },
      avatar_image: { endpoint: '${HF_AVATAR_IMAGE_ENDPOINT}', method: 'POST', routeShape: 'task-specific image endpoint', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_AVATAR_IMAGE_ENDPOINT', supportsAsyncJob: false, artifactHandling: 'download', notes: 'Normal avatar image may use a non-adult endpoint only.' },
      adult_text: { endpoint: '${HF_ADULT_TEXT_ENDPOINT}', method: 'POST', routeShape: 'adult-gated dedicated HF text endpoint', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ADULT_TEXT_ENDPOINT', supportsAsyncJob: false, artifactHandling: 'text', notes: 'Admin/app token plus adult permission required.' },
      adult_image: { endpoint: '${HF_ADULT_IMAGE_ENDPOINT}', method: 'POST', routeShape: 'adult-gated dedicated HF image endpoint', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ADULT_IMAGE_ENDPOINT', supportsAsyncJob: false, artifactHandling: 'download', notes: 'Hidden from normal routes.' },
      adult_voice: { endpoint: '${HF_ADULT_VOICE_ENDPOINT}', method: 'POST', routeShape: 'adult-gated dedicated HF voice endpoint', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ADULT_VOICE_ENDPOINT', supportsAsyncJob: false, artifactHandling: 'bytes', notes: 'Hidden from normal routes.' },
      adult_video: { endpoint: '${HF_ADULT_VIDEO_ENDPOINT}', method: 'POST', routeShape: 'adult-gated dedicated HF video endpoint', status: 'requires_endpoint', requiresDedicatedEndpoint: true, dedicatedEndpointEnv: 'HF_ADULT_VIDEO_ENDPOINT', supportsAsyncJob: true, artifactHandling: 'download', notes: 'Do not mark working until live execution and safety gates are proven.' },
    },
    testEndpointMap: { provider: '/api/admin/providers/huggingface/test', health: '/api/admin/providers/huggingface/test', adult_text: '/api/admin/providers/huggingface/test?task=adult_text' },
    asyncJobSupport: true,
    artifactHandling: 'download',
    audience: 'normal_and_adult',
    normalAllowed: true,
    adultAllowed: true,
    adminNotes: 'Task-based provider. Chat router is not used for non-chat tasks. Adult endpoints are hidden from normal execution.',
  },
  together: {
    key: 'together',
    displayName: 'Together AI',
    envAliases: ['TOGETHER_API_KEY'],
    baseUrl: 'https://api.together.xyz/v1',
    authMethod: 'bearer',
    supportedCapabilityKeys: ['health', 'models', 'chat', 'streaming_chat', 'text_generation', 'embeddings', 'rerank', 'text_to_image'],
    unsupportedCapabilityKeys: ['speech_to_text', 'text_to_speech', 'music_instrumental', 'music_song', 'adult_text', 'adult_image', 'adult_voice', 'adult_video'],
    taskEndpointMap: {
      health: { endpoint: '/models', method: 'GET', routeShape: 'model list', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Used for provider presence.' },
      chat: { endpoint: '/chat/completions', method: 'POST', routeShape: chatShape, status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Text/chat only.' },
      streaming_chat: { endpoint: '/chat/completions', method: 'POST', routeShape: 'OpenAI-compatible streaming', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Live stream shape must be proven.' },
      text_to_image: { endpoint: '/images/generations', method: 'POST', routeShape: 'Together image generation with FLUX image models', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'remote_reference', notes: 'FLUX models are image-only and never video.' },
      embeddings: { endpoint: '/embeddings', method: 'POST', routeShape: 'Together embeddings JSON', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Endpoint shape declared; live proof required.' },
      rerank: { endpoint: '/rerank', method: 'POST', routeShape: 'Together rerank JSON if enabled', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Return unsupported if endpoint/model unavailable.' },
      text_to_video: { endpoint: '/videos/generations', method: 'POST', routeShape: 'async video job if Together account exposes current video API', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'remote_reference', notes: 'No FLUX image model may be routed as video.' },
      video_job_poll: { endpoint: '/videos/{id}', method: 'GET', routeShape: 'async video polling if supported', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: true, artifactHandling: 'remote_reference', notes: 'Return unsupported until live shape is proven.' },
    },
    testEndpointMap: { provider: '/api/admin/providers/together/test', chat: '/api/admin/providers/together/test?task=chat', text_to_image: '/api/admin/providers/together/test?task=text_to_image' },
    asyncJobSupport: true,
    artifactHandling: 'remote_reference',
    audience: 'normal_only',
    normalAllowed: true,
    adultAllowed: false,
    adminNotes: 'Together supports chat/text and FLUX image generation. Video is requires_verification and must not reuse image models.',
  },
  groq: {
    key: 'groq',
    displayName: 'Groq',
    envAliases: ['GROQ_API_KEY'],
    baseUrl: 'https://api.groq.com/openai/v1',
    authMethod: 'bearer',
    supportedCapabilityKeys: ['health', 'models', 'chat', 'streaming_chat', 'text_generation', 'research', 'summarization', 'translation', 'speech_to_text', 'text_to_speech'],
    unsupportedCapabilityKeys: ['text_to_image', 'image_edit', 'text_to_video', 'image_to_video', 'music_instrumental', 'music_song', 'avatar_image', 'avatar_video', 'adult_text', 'adult_image', 'adult_voice', 'adult_video'],
    taskEndpointMap: {
      health: { endpoint: '/chat/completions', method: 'POST', routeShape: 'minimal chat completion', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Chat-shaped health check.' },
      chat: { endpoint: '/chat/completions', method: 'POST', routeShape: chatShape, status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Fast text/code/reasoning path.' },
      streaming_chat: { endpoint: '/chat/completions', method: 'POST', routeShape: 'OpenAI-compatible stream', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Streaming text only.' },
      speech_to_text: { endpoint: '/audio/transcriptions', method: 'POST', routeShape: 'multipart audio transcription', status: 'working', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Used by STT route.' },
      text_to_speech: { endpoint: '/audio/speech', method: 'POST', routeShape: 'Groq Orpheus/OpenAI-compatible speech endpoint if account/model enabled', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'bytes', notes: 'TTS route attempts Groq only when selected/configured; no fake success.' },
    },
    testEndpointMap: { provider: '/api/admin/providers/groq/test', chat: '/api/admin/providers/groq/test?task=chat', speech_to_text: '/api/admin/providers/groq/test?task=speech_to_text' },
    asyncJobSupport: false,
    artifactHandling: 'text',
    audience: 'normal_only',
    normalAllowed: true,
    adultAllowed: false,
    adminNotes: 'Groq is text, streaming text, vision/OCR where model supports it, STT, and TTS when the account/model supports Orpheus speech. It is not an image/video/music/avatar generator.',
  },
  mimo: {
    key: 'mimo',
    displayName: 'Xiaomi MiMo',
    envAliases: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
    baseUrl: 'https://api.xiaomimimo.com/v1',
    authMethod: 'bearer',
    supportedCapabilityKeys: ['health', 'models', 'chat', 'streaming_chat', 'text_generation', 'research', 'summarization', 'translation', 'image_analysis', 'ocr'],
    unsupportedCapabilityKeys: ['text_to_image', 'image_edit', 'text_to_video', 'image_to_video', 'music_instrumental', 'music_song', 'text_to_speech', 'speech_to_text', 'avatar_image', 'avatar_video', 'adult_text', 'adult_image', 'adult_voice', 'adult_video'],
    taskEndpointMap: {
      health: { endpoint: '/models', method: 'GET', routeShape: 'Xiaomi MiMo model list if enabled', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'none', notes: 'Configured but unverified until live key test passes.' },
      chat: { endpoint: '/chat/completions', method: 'POST', routeShape: chatShape, status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'MiMo endpoint must remain Xiaomi MiMo, not MiniMax.' },
      streaming_chat: { endpoint: '/chat/completions', method: 'POST', routeShape: 'OpenAI-compatible stream if Xiaomi endpoint supports it', status: 'requires_verification', requiresDedicatedEndpoint: false, supportsAsyncJob: false, artifactHandling: 'text', notes: 'Do not claim working before live proof.' },
    },
    testEndpointMap: { provider: '/api/admin/providers/mimo/test', chat: '/api/admin/providers/mimo/test?task=chat' },
    asyncJobSupport: false,
    artifactHandling: 'text',
    audience: 'normal_only',
    normalAllowed: false,
    adultAllowed: false,
    adminNotes: 'Xiaomi MiMo Token Plan is reserved for developer/repo/tooling or V2. V1 production app backend execution is disabled unless a backend-eligible MiMo API plan is explicitly added later.',
  },
} as const

export function getActiveProviderRuntimeKeys(): ActiveAIProviderKey[] {
  return [...ACTIVE_AI_PROVIDER_KEYS]
}

export function isV1ProductionAIProviderKey(value: string): value is V1ProductionAIProviderKey {
  return (V1_PRODUCTION_AI_PROVIDER_KEYS as readonly string[]).includes(value)
}

export function getV1ProductionProviderRuntimes(): ProviderRuntime[] {
  return V1_PRODUCTION_AI_PROVIDER_KEYS.map((key) => PROVIDER_RUNTIME[key])
}

export function isActiveAIProviderKey(value: string): value is ActiveAIProviderKey {
  return (ACTIVE_AI_PROVIDER_KEYS as readonly string[]).includes(value)
}

export function getProviderRuntime(key: string): ProviderRuntime | null {
  return isActiveAIProviderKey(key) ? PROVIDER_RUNTIME[key] : null
}

export function getAllProviderRuntimes(): ProviderRuntime[] {
  return ACTIVE_AI_PROVIDER_KEYS.map((key) => PROVIDER_RUNTIME[key])
}

export function getProviderTaskRuntime(provider: string, task: ProviderTask): ProviderTaskRuntime | null {
  return getProviderRuntime(provider)?.taskEndpointMap[task] ?? null
}

export function getEligibleProvidersForCapability(
  capability: RuntimeCapabilityKey,
  options: { adult?: boolean } = {},
): ProviderRuntime[] {
  return getAllProviderRuntimes().filter((provider) => {
    if (!options.adult && capability.startsWith('adult_')) return false
    if (options.adult && !provider.adultAllowed) return false
    if (!options.adult && provider.audience === 'adult_only') return false
    return provider.supportedCapabilityKeys.includes(capability)
  })
}

export function sanitizeRuntimeProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'Provider request failed')
  return raw
    .replace(/(authorization|bearer|token|api[-_ ]?key|key)\s*[:=]\s*[A-Za-z0-9._~+/=-]+/gi, '$1=[redacted]')
    .replace(/\b(sk|hf|ghp|tp|xai|mimo|genx)-?[A-Za-z0-9_-]{8,}\b/gi, '[redacted]')
    .replace(/redis(s)?:\/\/[^@\s]+@/gi, 'redis$1://[redacted]@')
    .slice(0, 300)
}

export function providerKeyForMesh(key: ActiveAIProviderKey): ProviderMeshId {
  return key
}
