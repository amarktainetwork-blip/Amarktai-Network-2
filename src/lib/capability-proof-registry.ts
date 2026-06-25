import {
  getEligibleProvidersForCapability,
  type ActiveAIProviderKey,
  type CapabilityProofStatus,
  type RuntimeCapabilityKey,
} from '@/lib/provider-runtime'

export type CapabilityAudience = 'normal' | 'adult' | 'suggestive'
export type CapabilityCategory = 'text' | 'image' | 'video' | 'audio' | 'memory' | 'rag' | 'artifact' | 'agent' | 'approval' | 'publishing'

export interface RuntimeCapabilityProof {
  key: RuntimeCapabilityKey
  label: string
  description: string
  category: CapabilityCategory
  audience: CapabilityAudience
  appFacing: boolean
  adminTest: boolean
  eligibleProviders: readonly ActiveAIProviderKey[]
  requiresProviderKey: boolean
  requiresStorage: boolean
  requiresAsyncJob: boolean
  requiresDedicatedEndpoint: boolean
  status: CapabilityProofStatus
  testRoute: string | null
  executionRoute: string | null
  lastErrorSource: string | null
  artifactType: 'document' | 'image' | 'video' | 'audio' | 'transcript' | null
}

const requiredCapabilityKeys = [
  'chat',
  'streaming_chat',
  'research',
  'text_generation',
  'summarization',
  'translation',
  'embeddings',
  'rerank',
  'rag_ingest',
  'rag_query',
  'memory_save',
  'memory_retrieve',
  'text_to_image',
  'image_to_image',
  'image_edit',
  'image_analysis',
  'ocr',
  'text_to_video',
  'image_to_video',
  'video_job_poll',
  'long_form_video_plan',
  'long_form_video_assembly',
  'text_to_speech',
  'speech_to_text',
  'music_instrumental',
  'music_song',
  'avatar_image',
  'avatar_video',
  'artifact_create',
  'artifact_read',
  'artifact_download',
  'agent_run',
  'approval_request',
  'approval_decide',
  'publishing_blocked_until_approved',
  'adult_text',
  'adult_image',
  'adult_voice',
  'adult_video',
] as const satisfies readonly RuntimeCapabilityKey[]

export type RequiredRuntimeCapabilityKey = (typeof requiredCapabilityKeys)[number]

function providers(key: RequiredRuntimeCapabilityKey, adult = false): ActiveAIProviderKey[] {
  return getEligibleProvidersForCapability(key, { adult }).map((provider) => provider.key)
}

function entry(
  input: Omit<RuntimeCapabilityProof, 'eligibleProviders'> & {
    key: RequiredRuntimeCapabilityKey
    eligibleProviders?: readonly ActiveAIProviderKey[]
  },
): RuntimeCapabilityProof {
  return { ...input, eligibleProviders: input.eligibleProviders ?? providers(input.key, input.audience === 'adult') }
}

export const RUNTIME_CAPABILITY_PROOFS: Record<RequiredRuntimeCapabilityKey, RuntimeCapabilityProof> = {
  chat: entry({ key: 'chat', label: 'Chat', description: 'Provider-routed chat completion.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=chat', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: null }),
  streaming_chat: entry({ key: 'streaming_chat', label: 'Streaming chat', description: 'Provider-routed streaming text.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=streaming_chat', executionRoute: '/api/brain/stream', lastErrorSource: null, artifactType: null }),
  research: entry({ key: 'research', label: 'Research', description: 'Research synthesis through text providers and crawler tools.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=research', executionRoute: '/api/admin/research/assist', lastErrorSource: null, artifactType: 'document' }),
  text_generation: entry({ key: 'text_generation', label: 'Text generation', description: 'General non-chat text generation.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=text_generation', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: null }),
  summarization: entry({ key: 'summarization', label: 'Summarization', description: 'Summarize supplied text or retrieved context.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=summarization', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: null }),
  translation: entry({ key: 'translation', label: 'Translation', description: 'Translate supplied text.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=translation', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: null }),
  embeddings: entry({ key: 'embeddings', label: 'Embeddings', description: 'Generate embedding vectors.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=embeddings', executionRoute: '/api/brain/embeddings', lastErrorSource: null, artifactType: null }),
  rerank: entry({ key: 'rerank', label: 'Rerank', description: 'Rank documents for a query.', category: 'text', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=rerank', executionRoute: '/api/brain/rerank', lastErrorSource: null, artifactType: null }),
  rag_ingest: entry({ key: 'rag_ingest', label: 'RAG ingest', description: 'Ingest content into retrieval storage.', category: 'rag', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/rag/ingest', executionRoute: '/api/admin/rag/ingest', lastErrorSource: null, artifactType: 'document' }),
  rag_query: entry({ key: 'rag_query', label: 'RAG query', description: 'Query retrieval storage and synthesize answer.', category: 'rag', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: ['huggingface', 'genx', 'groq', 'together', 'mimo'], requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/rag/query', executionRoute: '/api/admin/rag/query', lastErrorSource: null, artifactType: null }),
  memory_save: entry({ key: 'memory_save', label: 'Memory save', description: 'Persist scoped app memory.', category: 'memory', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/memory', executionRoute: '/api/admin/memory', lastErrorSource: null, artifactType: null }),
  memory_retrieve: entry({ key: 'memory_retrieve', label: 'Memory retrieve', description: 'Retrieve scoped app memory.', category: 'memory', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/memory', executionRoute: '/api/admin/memory', lastErrorSource: null, artifactType: null }),
  text_to_image: entry({ key: 'text_to_image', label: 'Text to image', description: 'Generate image artifacts from prompts.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=text_to_image', executionRoute: '/api/brain/image', lastErrorSource: null, artifactType: 'image' }),
  image_to_image: entry({ key: 'image_to_image', label: 'Image to image', description: 'Transform an input image.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=image_to_image', executionRoute: '/api/brain/image-edit', lastErrorSource: null, artifactType: 'image' }),
  image_edit: entry({ key: 'image_edit', label: 'Image edit', description: 'Edit/inpaint an input image.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=image_edit', executionRoute: '/api/brain/image-edit', lastErrorSource: null, artifactType: 'image' }),
  image_analysis: entry({ key: 'image_analysis', label: 'Image analysis', description: 'Analyze images with vision-capable models.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=image_analysis', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: null }),
  ocr: entry({ key: 'ocr', label: 'OCR', description: 'Extract text from images/documents.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: false, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=ocr', executionRoute: '/api/brain/request', lastErrorSource: null, artifactType: 'transcript' }),
  text_to_video: entry({ key: 'text_to_video', label: 'Text to video', description: 'Generate video jobs from prompts.', category: 'video', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=text_to_video', executionRoute: '/api/brain/video-generate', lastErrorSource: null, artifactType: 'video' }),
  image_to_video: entry({ key: 'image_to_video', label: 'Image to video', description: 'Generate video jobs from image inputs.', category: 'video', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=image_to_video', executionRoute: '/api/brain/video-generate', lastErrorSource: null, artifactType: 'video' }),
  video_job_poll: entry({ key: 'video_job_poll', label: 'Video job poll', description: 'Poll async provider video jobs.', category: 'video', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=video_job_poll', executionRoute: '/api/brain/video-generate/[jobId]', lastErrorSource: null, artifactType: 'video' }),
  long_form_video_plan: entry({ key: 'long_form_video_plan', label: 'Long-form video plan', description: 'Plan scenes for long-form video.', category: 'video', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: ['genx', 'groq', 'together', 'mimo'], requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=long_form_video_plan', executionRoute: '/api/brain/video', lastErrorSource: null, artifactType: 'document' }),
  long_form_video_assembly: entry({ key: 'long_form_video_assembly', label: 'Long-form video assembly', description: 'Assemble scenes into a stored video.', category: 'video', audience: 'normal', appFacing: false, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/settings/test-storage', executionRoute: null, lastErrorSource: 'ffmpeg assembly requires end-to-end proof', artifactType: 'video' }),
  text_to_speech: entry({ key: 'text_to_speech', label: 'Text to speech', description: 'Generate spoken audio.', category: 'audio', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=text_to_speech', executionRoute: '/api/brain/tts', lastErrorSource: null, artifactType: 'audio' }),
  speech_to_text: entry({ key: 'speech_to_text', label: 'Speech to text', description: 'Transcribe supplied audio.', category: 'audio', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=speech_to_text', executionRoute: '/api/brain/stt', lastErrorSource: null, artifactType: 'transcript' }),
  music_instrumental: entry({ key: 'music_instrumental', label: 'Instrumental music', description: 'Generate instrumental audio segments.', category: 'audio', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/providers/[id]/test?task=music_instrumental', executionRoute: '/api/admin/music-studio', lastErrorSource: null, artifactType: 'audio' }),
  music_song: entry({ key: 'music_song', label: 'Full song', description: 'Generate a complete song artifact.', category: 'audio', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: true, status: 'requires_endpoint', testRoute: '/api/admin/providers/[id]/test?task=music_song', executionRoute: '/api/admin/music-studio', lastErrorSource: 'full-song endpoint not configured/proven', artifactType: 'audio' }),
  avatar_image: entry({ key: 'avatar_image', label: 'Avatar image', description: 'Generate avatar/character images.', category: 'image', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=avatar_image', executionRoute: '/api/brain/avatar-video', lastErrorSource: null, artifactType: 'image' }),
  avatar_video: entry({ key: 'avatar_video', label: 'Avatar video', description: 'Generate talking avatar video jobs.', category: 'video', audience: 'normal', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: false, status: 'requires_verification', testRoute: '/api/admin/providers/[id]/test?task=avatar_video', executionRoute: '/api/brain/avatar-video', lastErrorSource: null, artifactType: 'video' }),
  artifact_create: entry({ key: 'artifact_create', label: 'Artifact create', description: 'Persist generated output.', category: 'artifact', audience: 'normal', appFacing: false, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/settings/test-storage', executionRoute: '/api/admin/artifacts', lastErrorSource: null, artifactType: 'document' }),
  artifact_read: entry({ key: 'artifact_read', label: 'Artifact read', description: 'Read stored artifact metadata.', category: 'artifact', audience: 'normal', appFacing: false, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/artifacts', executionRoute: '/api/admin/artifacts', lastErrorSource: null, artifactType: null }),
  artifact_download: entry({ key: 'artifact_download', label: 'Artifact download', description: 'Download stored artifact bytes.', category: 'artifact', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/artifacts/file/[...key]', executionRoute: '/api/artifacts/file/[...key]', lastErrorSource: null, artifactType: null }),
  agent_run: entry({ key: 'agent_run', label: 'Agent run', description: 'Run an app/platform agent task.', category: 'agent', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: ['genx', 'groq', 'together', 'mimo'], requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/agents/run', executionRoute: '/api/admin/agents/run', lastErrorSource: null, artifactType: 'document' }),
  approval_request: entry({ key: 'approval_request', label: 'Approval request', description: 'Create an approval gate item.', category: 'approval', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/approvals', executionRoute: '/api/admin/approvals', lastErrorSource: null, artifactType: null }),
  approval_decide: entry({ key: 'approval_decide', label: 'Approval decide', description: 'Approve or reject a gate item.', category: 'approval', audience: 'normal', appFacing: false, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/approvals/decide', executionRoute: '/api/admin/approvals/decide', lastErrorSource: null, artifactType: null }),
  publishing_blocked_until_approved: entry({ key: 'publishing_blocked_until_approved', label: 'Publishing approval gate', description: 'Publishing remains blocked until approval.', category: 'publishing', audience: 'normal', appFacing: true, adminTest: true, eligibleProviders: [], requiresProviderKey: false, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: false, status: 'working', testRoute: '/api/admin/publishing', executionRoute: '/api/admin/publishing', lastErrorSource: null, artifactType: null }),
  adult_text: entry({ key: 'adult_text', label: 'Adult text', description: 'Adult-gated text generation.', category: 'text', audience: 'adult', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: true, status: 'requires_endpoint', testRoute: '/api/admin/providers/huggingface/test?task=adult_text', executionRoute: '/api/brain/adult-text', lastErrorSource: 'HF adult endpoint required', artifactType: 'document' }),
  adult_image: entry({ key: 'adult_image', label: 'Adult image', description: 'Adult-gated image generation.', category: 'image', audience: 'adult', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: true, status: 'requires_endpoint', testRoute: '/api/admin/providers/huggingface/test?task=adult_image', executionRoute: '/api/brain/adult-image', lastErrorSource: 'HF adult endpoint required', artifactType: 'image' }),
  adult_voice: entry({ key: 'adult_voice', label: 'Adult voice', description: 'Adult-gated voice generation.', category: 'audio', audience: 'adult', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: false, requiresDedicatedEndpoint: true, status: 'requires_endpoint', testRoute: '/api/admin/providers/huggingface/test?task=adult_voice', executionRoute: '/api/brain/tts', lastErrorSource: 'HF adult voice endpoint required', artifactType: 'audio' }),
  adult_video: entry({ key: 'adult_video', label: 'Adult video', description: 'Adult-gated video generation.', category: 'video', audience: 'adult', appFacing: true, adminTest: true, requiresProviderKey: true, requiresStorage: true, requiresAsyncJob: true, requiresDedicatedEndpoint: true, status: 'requires_endpoint', testRoute: '/api/admin/providers/huggingface/test?task=adult_video', executionRoute: '/api/brain/video-generate', lastErrorSource: 'HF adult video endpoint required and execution not live-proven', artifactType: 'video' }),
}

export const REQUIRED_RUNTIME_CAPABILITY_KEYS: readonly RequiredRuntimeCapabilityKey[] = requiredCapabilityKeys

export function getRuntimeCapabilityProof(key: string): RuntimeCapabilityProof | null {
  const normalized = key as RequiredRuntimeCapabilityKey
  return Object.prototype.hasOwnProperty.call(RUNTIME_CAPABILITY_PROOFS, normalized) ? RUNTIME_CAPABILITY_PROOFS[normalized] : null
}

export function getAllRuntimeCapabilityProofs(): RuntimeCapabilityProof[] {
  return requiredCapabilityKeys.map((key) => RUNTIME_CAPABILITY_PROOFS[key])
}
