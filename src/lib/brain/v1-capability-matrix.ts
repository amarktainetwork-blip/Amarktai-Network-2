import {
  APPROVED_DIRECT_PROVIDER_IDS,
  getProviderMeshNode,
  type ApprovedDirectProviderId,
} from '@/lib/provider-mesh'
import {
  UNIVERSAL_MODEL_ROUTES,
  type UniversalCapabilityGroup,
} from '@/lib/universal-model-catalog'

export const AI_CAPABILITY_CATEGORIES = [
  'text',
  'multimodal',
  'computer_vision',
  'video',
  'audio',
  'music',
  'avatar_voice',
  'tabular',
  'agents_or_planning',
  'experimental',
] as const

export type CapabilityGroup = typeof AI_CAPABILITY_CATEGORIES[number]
export type AiCapabilityStatus =
  | 'working'
  | 'partially_wired'
  | 'provider_available_not_wired'
  | 'unavailable'

export type V1CapabilityReadiness =
  | 'ready'
  | 'ready_with_fallback'
  | 'needs_input'
  | 'adapter_missing'
  | 'provider_config_missing'
  | 'blocked'
  | 'post_launch'

export const CONNECTED_APP_AI_SCOPES = [
  'ai:text:execute',
  'ai:image:execute',
  'ai:video:execute',
  'ai:audio:execute',
  'ai:music:execute',
  'ai:avatar:execute',
  'ai:research:execute',
  'ai:data:execute',
  'ai:campaign:execute',
] as const

export type ConnectedAppAiScope = typeof CONNECTED_APP_AI_SCOPES[number]

export interface AiCapabilityProviderRoute {
  provider: ApprovedDirectProviderId
  modelIds: string[]
  executable: boolean
  adapter: string
  source: 'provider_mesh' | 'universal_model_catalog' | 'media_capability_registry'
  route: string | null
  outputType: string
  adapterImplemented: boolean
}

export interface AiCapabilityDefinition {
  id: string
  label: string
  group: CapabilityGroup
  description: string
  inputTypes: string[]
  outputTypes: string[]
  requiredScope: ConnectedAppAiScope
  providerRoutes: AiCapabilityProviderRoute[]
  executableEndpoint: string | null
  status: AiCapabilityStatus
  blocker: string | null
  exposeToConnectedAppsV1: boolean
  createsArtifact: boolean
  longRunning: boolean
  readiness: V1CapabilityReadiness
  outputType: string
  requiredInputs: string[]
  requiredSourceInput: 'image' | 'audio' | 'video' | 'document' | 'avatar' | null
  fallbackOrder: ApprovedDirectProviderId[]
  adapterImplemented: boolean
  lastLiveTest: {
    status: 'passed' | 'failed' | 'untested'
    testedAt: string | null
    detail: string | null
  }
  fallbackArtifactType?: string

  // Compatibility fields used by the app AI package recommender.
  defaultProviders: ApprovedDirectProviderId[]
  specialistRouteRequired: boolean
  appPermissionRequired: boolean
  safetyNotes?: string
}

type CapabilityInput = Omit<
  AiCapabilityDefinition,
  | 'defaultProviders'
  | 'specialistRouteRequired'
  | 'appPermissionRequired'
  | 'providerRoutes'
  | 'readiness'
  | 'outputType'
  | 'requiredInputs'
  | 'requiredSourceInput'
  | 'fallbackOrder'
  | 'adapterImplemented'
  | 'lastLiveTest'
> & {
  providers?: ApprovedDirectProviderId[]
  executableProviders?: ApprovedDirectProviderId[]
  providerRouteSource?: AiCapabilityProviderRoute['source']
}

const APPROVED_PROVIDER_SET = new Set<string>(APPROVED_DIRECT_PROVIDER_IDS)

function capability(input: CapabilityInput): AiCapabilityDefinition {
  const declaredProviders = (input.providers ?? []).filter((provider) => APPROVED_PROVIDER_SET.has(provider))
  const providers = declaredProviders
  const executableProviders = new Set(input.executableProviders ?? [])
  const modelGroups = modelGroupsFor(input)
  const providerRoutes = providers.map((provider): AiCapabilityProviderRoute => {
    const models = UNIVERSAL_MODEL_ROUTES
      .filter((model) =>
        model.provider === provider
        && model.enabled
        && model.capabilities.some((modelCapability) => modelGroups.includes(modelCapability)),
      )
      .filter((model) => modelMatchesCapability(input.id, model.modelId))
      .map((model) => model.modelId)
    return {
      provider,
      modelIds: models.length > 0
        ? [...new Set(models)]
        : provider === 'huggingface'
          ? ['custom:huggingface-endpoint']
          : [],
      executable: executableProviders.has(provider),
      adapter: providerAdapter(provider),
      source: input.providerRouteSource ?? (models.length ? 'universal_model_catalog' : 'provider_mesh'),
      route: executableProviders.has(provider)
        ? input.executableEndpoint ?? CONNECTED_APP_EXECUTION_ENDPOINT
        : null,
      outputType: input.outputTypes[0] ?? 'unknown',
      adapterImplemented: executableProviders.has(provider),
    }
  })
  const requiredSourceInput = requiredSourceFor(input.inputTypes)
  const executableRouteCount = providerRoutes.filter((route) => route.executable).length
  const readiness = capabilityReadiness(input, executableRouteCount, requiredSourceInput)

  return {
    ...input,
    providerRoutes,
    readiness,
    outputType: input.outputTypes[0] ?? 'unknown',
    requiredInputs: [...input.inputTypes],
    requiredSourceInput,
    fallbackOrder: providerRoutes.filter((route) => route.executable).map((route) => route.provider),
    adapterImplemented: executableRouteCount > 0,
    lastLiveTest: { status: 'untested', testedAt: null, detail: null },
    defaultProviders: providers,
    specialistRouteRequired: false,
    appPermissionRequired: true,
  }
}

function modelMatchesCapability(capabilityId: string, modelId: string): boolean {
  const normalized = modelId.toLowerCase()
  if (capabilityId === 'text_to_video') return !/(i2v|image.to.video)/.test(normalized)
  if (capabilityId === 'image_to_video' || capabilityId === 'image_text_to_video') {
    return /(i2v|image.to.video|veo)/.test(normalized)
  }
  return true
}

function requiredSourceFor(inputTypes: readonly string[]): AiCapabilityDefinition['requiredSourceInput'] {
  for (const type of ['image', 'audio', 'video', 'document', 'avatar'] as const) {
    if (inputTypes.includes(type)) return type
  }
  return null
}

function capabilityReadiness(
  input: CapabilityInput,
  executableRouteCount: number,
  requiredSourceInput: AiCapabilityDefinition['requiredSourceInput'],
): V1CapabilityReadiness {
  if (input.id === 'music_generation') return 'post_launch'
  if (input.id === 'reinforcement_learning' || input.id === 'robotics') return 'blocked'
  if (executableRouteCount === 0) {
    return input.status === 'unavailable' ? 'post_launch' : 'adapter_missing'
  }
  if (requiredSourceInput) return 'needs_input'
  if (input.status === 'partially_wired' || executableRouteCount > 1) return 'ready_with_fallback'
  return 'ready'
}

function providerAdapter(provider: ApprovedDirectProviderId): string {
  return `${provider}_capability_adapter`
}

function modelGroupsFor(input: CapabilityInput): UniversalCapabilityGroup[] {
  if (input.id === 'embeddings' || input.id === 'rerank' || input.id === 'text_ranking') {
    return ['embeddings/moderation']
  }
  if (input.id === 'automatic_speech_recognition') return ['STT']
  if (input.id === 'text_to_speech' || input.id === 'voice_clone_or_voice_design') return ['voice/TTS']
  if (input.group === 'music' || input.id === 'text_to_audio') return ['music/audio']
  if (input.group === 'video' || input.inputTypes.includes('video') || input.outputTypes.includes('video')) {
    return ['video']
  }
  if (
    input.group === 'computer_vision'
    || input.inputTypes.includes('image')
    || input.outputTypes.includes('image')
    || input.outputTypes.includes('3d_asset')
  ) {
    return ['image']
  }
  if (input.group === 'multimodal') return ['image', 'video', 'chat', 'reasoning']
  return input.id === 'reasoning' ? ['reasoning'] : ['chat', 'reasoning']
}

const textProviders: ApprovedDirectProviderId[] = ['genx', 'qwen', 'mimo', 'groq', 'together', 'huggingface']
const visionProviders: ApprovedDirectProviderId[] = ['genx', 'qwen', 'mimo', 'huggingface']
const imageProviders: ApprovedDirectProviderId[] = ['genx', 'qwen', 'together', 'huggingface']
const hfOnly: ApprovedDirectProviderId[] = ['huggingface']
const CONNECTED_APP_EXECUTION_ENDPOINT = '/api/connected-apps/capabilities/execute'

export const AI_CAPABILITY_TAXONOMY: readonly AiCapabilityDefinition[] = [
  capability({ id: 'chat', label: 'Chat', group: 'text', inputTypes: ['text', 'conversation'], outputTypes: ['text'], description: 'Conversational responses with app context.', providers: textProviders, executableProviders: ['genx', 'qwen', 'mimo', 'groq', 'together', 'huggingface'], executableEndpoint: '/api/brain/request', status: 'working', blocker: null, requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: true, createsArtifact: false, longRunning: false }),
  capability({ id: 'reasoning', label: 'Reasoning', group: 'agents_or_planning', inputTypes: ['text', 'context'], outputTypes: ['text', 'plan'], description: 'Multi-step reasoning and structured planning.', providers: ['genx', 'qwen', 'mimo', 'groq', 'together'], executableProviders: ['genx', 'qwen', 'mimo', 'groq', 'together'], executableEndpoint: '/api/brain/request', status: 'working', blocker: null, requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: true, createsArtifact: false, longRunning: false }),
  capability({ id: 'research', label: 'Research', group: 'agents_or_planning', inputTypes: ['text', 'url'], outputTypes: ['research_result', 'sources'], description: 'Structured research using the canonical capability router.', providers: ['genx', 'qwen', 'mimo', 'groq', 'together'], executableProviders: ['genx', 'qwen', 'mimo', 'groq', 'together'], executableEndpoint: '/api/brain/research', status: 'working', blocker: null, requiredScope: 'ai:research:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false }),
  capability({ id: 'text_generation', label: 'Text Generation', group: 'text', inputTypes: ['text', 'context'], outputTypes: ['text'], description: 'Generate app-facing text and structured copy.', providers: textProviders, executableProviders: ['genx', 'qwen', 'mimo', 'groq', 'together', 'huggingface'], executableEndpoint: '/api/brain/request', status: 'working', blocker: null, requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false }),

  ...([
    ['text_classification', 'Text Classification', ['text'], ['labels']],
    ['zero_shot_classification', 'Zero-Shot Classification', ['text', 'labels'], ['labels']],
    ['translation', 'Translation', ['text', 'language'], ['text']],
    ['summarization', 'Summarization', ['text', 'document'], ['text']],
    ['question_answering', 'Question Answering', ['text', 'context'], ['text']],
    ['table_question_answering', 'Table Question Answering', ['table', 'text'], ['text']],
  ] as const).map(([id, label, inputTypes, outputTypes]) => capability({
    id, label, group: 'text', inputTypes: [...inputTypes], outputTypes: [...outputTypes],
    description: `${label} through an approved text provider; the current executable surface is an admin capability test rather than a connected-app contract.`,
    providers: id === 'zero_shot_classification' ? ['huggingface', 'qwen'] : textProviders,
    executableProviders: id === 'zero_shot_classification' ? ['huggingface', 'qwen'] : textProviders,
    executableEndpoint: '/api/admin/provider-capability-test', status: 'partially_wired',
    blocker: 'A dedicated connected-app request schema and normalized result contract are not wired.',
    requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: false,
  })),

  ...([
    ['token_classification', 'Token Classification', ['text'], ['tokens', 'labels']],
    ['sentence_similarity', 'Sentence Similarity', ['text_pair'], ['score']],
    ['feature_extraction', 'Feature Extraction', ['text'], ['vector']],
    ['fill_mask', 'Fill Mask', ['text'], ['tokens', 'scores']],
  ] as const).map(([id, label, inputTypes, outputTypes]) => capability({
    id, label, group: 'text', inputTypes: [...inputTypes], outputTypes: [...outputTypes],
    description: `${label} is available from Hugging Face but has no canonical execution adapter.`,
    providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired',
    blocker: 'No provider-specific execution adapter and normalized result contract are wired.',
    requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: false,
  })),

  capability({ id: 'text_ranking', label: 'Text Ranking', group: 'text', inputTypes: ['query', 'documents'], outputTypes: ['ranked_documents'], description: 'Rank documents against a query.', providers: ['huggingface'], executableProviders: ['huggingface'], executableEndpoint: '/api/brain/rerank', status: 'working', blocker: null, requiredScope: 'ai:text:execute', exposeToConnectedAppsV1: true, createsArtifact: false, longRunning: false }),
  capability({ id: 'embeddings', label: 'Embeddings', group: 'text', inputTypes: ['text', 'text_array'], outputTypes: ['vector', 'vector_array'], description: 'Create text embeddings for retrieval and similarity.', providers: ['qwen', 'genx', 'huggingface', 'together'], executableProviders: ['qwen'], executableEndpoint: '/api/brain/embeddings', status: 'working', blocker: null, requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: true, createsArtifact: false, longRunning: false }),
  capability({ id: 'rerank', label: 'Rerank', group: 'text', inputTypes: ['query', 'documents'], outputTypes: ['ranked_documents'], description: 'Rerank candidate documents with a specialist model.', providers: ['huggingface', 'together'], executableProviders: ['huggingface'], executableEndpoint: '/api/brain/rerank', status: 'working', blocker: null, requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: true, createsArtifact: false, longRunning: false }),

  ...([
    ['document_question_answering', 'Document Question Answering', ['document', 'text'], ['text']],
    ['visual_question_answering', 'Visual Question Answering', ['image', 'text'], ['text']],
    ['image_text_to_text', 'Image and Text to Text', ['image', 'text'], ['text']],
    ['image_to_text', 'Image to Text', ['image'], ['text']],
  ] as const).map(([id, label, inputTypes, outputTypes]) => capability({
    id, label, group: 'multimodal', inputTypes: [...inputTypes], outputTypes: [...outputTypes],
    description: `${label} is represented by approved vision providers but lacks a canonical binary-input request adapter.`,
    providers: visionProviders, executableEndpoint: null, status: 'provider_available_not_wired',
    blocker: 'The connected-app gateway does not yet accept and normalize the required image or document input.',
    requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: false,
  })),

  capability({ id: 'image_text_to_image', label: 'Image and Text to Image', group: 'multimodal', inputTypes: ['image', 'text'], outputTypes: ['image'], description: 'Edit or transform a source image from instructions.', providers: imageProviders, executableEndpoint: '/api/brain/image-edit', status: 'partially_wired', blocker: 'The honest endpoint exists, but no approved source-image provider adapter is wired.', requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: false }),
  capability({ id: 'image_to_image', label: 'Image to Image', group: 'computer_vision', inputTypes: ['image', 'text'], outputTypes: ['image'], description: 'Transform a source image.', providers: imageProviders, executableEndpoint: '/api/brain/image-edit', status: 'partially_wired', blocker: 'The honest endpoint exists, but no approved source-image provider adapter is wired.', requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: false }),
  capability({ id: 'text_to_image', label: 'Text to Image', group: 'computer_vision', inputTypes: ['text'], outputTypes: ['image'], description: 'Generate an image from a text prompt.', providers: imageProviders, executableProviders: ['genx', 'qwen', 'together', 'huggingface'], providerRouteSource: 'media_capability_registry', executableEndpoint: '/api/brain/image', status: 'working', blocker: null, requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false }),

  ...([
    ['image_classification', 'Image Classification', ['image'], ['labels']],
    ['zero_shot_image_classification', 'Zero-Shot Image Classification', ['image', 'labels'], ['labels']],
    ['object_detection', 'Object Detection', ['image'], ['bounding_boxes']],
    ['zero_shot_object_detection', 'Zero-Shot Object Detection', ['image', 'labels'], ['bounding_boxes']],
    ['image_segmentation', 'Image Segmentation', ['image'], ['mask']],
    ['mask_generation', 'Mask Generation', ['image', 'points'], ['mask']],
    ['depth_estimation', 'Depth Estimation', ['image'], ['depth_map']],
    ['keypoint_detection', 'Keypoint Detection', ['image'], ['keypoints']],
    ['image_feature_extraction', 'Image Feature Extraction', ['image'], ['vector']],
  ] as const).map(([id, label, inputTypes, outputTypes]) => capability({
    id, label, group: 'computer_vision', inputTypes: [...inputTypes], outputTypes: [...outputTypes],
    description: `${label} is available through Hugging Face task models but is not wired into the capability gateway.`,
    providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired',
    blocker: 'No image upload adapter, task invocation contract, or normalized result schema is wired.',
    requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: id === 'image_segmentation' || id === 'mask_generation' || id === 'depth_estimation', longRunning: false,
  })),

  capability({ id: 'image_to_video', label: 'Image to Video', group: 'video', inputTypes: ['image', 'text'], outputTypes: ['video'], description: 'Generate video from a required source image.', providers: ['qwen', 'genx'], executableProviders: ['qwen', 'genx'], executableEndpoint: '/api/brain/video-generate', status: 'partially_wired', blocker: 'A source image is required before an image-to-video route can run.', requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: true }),
  capability({ id: 'image_text_to_video', label: 'Image and Text to Video', group: 'video', inputTypes: ['image', 'text'], outputTypes: ['video'], description: 'Generate guided video from image and text.', providers: ['genx', 'qwen'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No source-image video adapter is wired.', requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'text_to_video', label: 'Text to Video', group: 'video', inputTypes: ['text'], outputTypes: ['video'], description: 'Start a real text-to-video provider job and persist completed output.', providers: ['genx', 'qwen'], executableProviders: ['genx', 'qwen'], providerRouteSource: 'media_capability_registry', executableEndpoint: '/api/brain/video-generate', status: 'working', blocker: null, requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: true }),
  capability({ id: 'video_to_video', label: 'Video to Video', group: 'video', inputTypes: ['video', 'text'], outputTypes: ['video'], description: 'Transform an existing video.', providers: ['genx', 'qwen'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No source-video upload and transformation adapter is wired.', requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'video_text_to_text', label: 'Video and Text to Text', group: 'multimodal', inputTypes: ['video', 'text'], outputTypes: ['text'], description: 'Analyze a video with a text instruction.', providers: ['genx', 'qwen', 'mimo', 'huggingface'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No video ingestion and analysis contract is wired.', requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: true }),
  capability({ id: 'video_classification', label: 'Video Classification', group: 'video', inputTypes: ['video'], outputTypes: ['labels'], description: 'Classify a video.', providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No video upload adapter or Hugging Face task contract is wired.', requiredScope: 'ai:video:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: true }),
  capability({ id: 'visual_document_retrieval', label: 'Visual Document Retrieval', group: 'multimodal', inputTypes: ['document', 'query'], outputTypes: ['ranked_regions'], description: 'Retrieve relevant visual document regions.', providers: ['huggingface'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No visual document indexing and retrieval pipeline is wired.', requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: true }),

  capability({ id: 'text_to_3d', label: 'Text to 3D', group: 'experimental', inputTypes: ['text'], outputTypes: ['3d_asset'], description: 'Generate a 3D asset from text.', providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No approved 3D model route, storage contract, or viewer artifact type is wired.', requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'image_to_3d', label: 'Image to 3D', group: 'experimental', inputTypes: ['image'], outputTypes: ['3d_asset'], description: 'Generate a 3D asset from an image.', providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No source-image 3D route, storage contract, or viewer artifact type is wired.', requiredScope: 'ai:image:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),

  capability({ id: 'text_to_speech', label: 'Text to Speech', group: 'audio', inputTypes: ['text', 'voice'], outputTypes: ['audio'], description: 'Synthesize speech and persist the audio artifact.', providers: ['groq', 'genx', 'huggingface'], executableProviders: ['groq', 'genx', 'huggingface'], providerRouteSource: 'media_capability_registry', executableEndpoint: '/api/brain/tts', status: 'working', blocker: null, requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false }),
  capability({ id: 'automatic_speech_recognition', label: 'Automatic Speech Recognition', group: 'audio', inputTypes: ['audio'], outputTypes: ['transcript'], description: 'Transcribe uploaded audio and persist the transcript.', providers: ['genx', 'groq', 'huggingface'], executableProviders: ['genx', 'groq', 'huggingface'], providerRouteSource: 'media_capability_registry', executableEndpoint: '/api/brain/stt', status: 'working', blocker: null, requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false }),
  capability({ id: 'text_to_audio', label: 'Text to Audio', group: 'audio', inputTypes: ['text'], outputTypes: ['audio'], description: 'Generate non-speech audio from text.', providers: ['genx', 'huggingface'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'The current audio route is music-oriented; a normalized sound-generation contract is not wired.', requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'audio_to_audio', label: 'Audio to Audio', group: 'audio', inputTypes: ['audio', 'text'], outputTypes: ['audio'], description: 'Transform or enhance audio.', providers: ['huggingface', 'mimo'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No audio upload/transformation adapter is wired.', requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'audio_classification', label: 'Audio Classification', group: 'audio', inputTypes: ['audio'], outputTypes: ['labels'], description: 'Classify uploaded audio.', providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No audio upload and Hugging Face classification adapter is wired.', requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: false }),
  capability({ id: 'voice_activity_detection', label: 'Voice Activity Detection', group: 'audio', inputTypes: ['audio'], outputTypes: ['time_ranges'], description: 'Detect speech regions in audio.', providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No voice activity task adapter is wired.', requiredScope: 'ai:audio:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: false }),

  capability({ id: 'music_generation', label: 'Music Generation', group: 'music', inputTypes: ['text', 'lyrics', 'style'], outputTypes: ['music'], description: 'Real music audio generation is post-launch; V1 creates a useful music blueprint artifact.', providers: ['genx', 'huggingface'], executableEndpoint: null, status: 'unavailable', blocker: 'No approved music-audio adapter has passed the V1 artifact and playback contract.', requiredScope: 'ai:music:execute', exposeToConnectedAppsV1: true, createsArtifact: true, longRunning: false, fallbackArtifactType: 'music_blueprint' }),
  capability({ id: 'lyrics_generation', label: 'Lyrics Generation', group: 'music', inputTypes: ['text', 'style'], outputTypes: ['lyrics'], description: 'Generate and persist song lyrics.', providers: textProviders, executableProviders: textProviders, executableEndpoint: '/api/admin/music-studio', status: 'working', blocker: null, requiredScope: 'ai:music:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: false }),
  capability({ id: 'avatar_generation', label: 'Avatar Generation', group: 'avatar_voice', inputTypes: ['text', 'image'], outputTypes: ['avatar'], description: 'Create a reusable avatar asset.', providers: ['genx'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'GenX advertises avatar support, but no approved avatar asset contract is wired.', requiredScope: 'ai:avatar:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'avatar_video', label: 'Avatar Video', group: 'avatar_voice', inputTypes: ['avatar', 'audio', 'text'], outputTypes: ['video'], description: 'Create a speaking avatar video.', providers: ['genx'], executableEndpoint: '/api/brain/avatar-video', status: 'partially_wired', blocker: 'The endpoint reports honest needs-setup state; no approved lip-sync execution adapter is wired.', requiredScope: 'ai:avatar:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true, fallbackArtifactType: 'avatar_storyboard' }),
  capability({ id: 'voice_clone_or_voice_design', label: 'Voice Clone or Voice Design', group: 'avatar_voice', inputTypes: ['audio', 'text', 'voice_profile'], outputTypes: ['voice_profile', 'audio'], description: 'Design or clone a voice where provider policy permits.', providers: ['genx'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No consent record, voice-profile artifact, or approved cloning adapter is wired.', requiredScope: 'ai:avatar:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true, safetyNotes: 'Requires recorded speaker consent and anti-impersonation policy enforcement.' }),

  ...([
    ['tabular_classification', 'Tabular Classification', ['table'], ['labels']],
    ['tabular_regression', 'Tabular Regression', ['table'], ['numbers']],
    ['time_series_forecasting', 'Time Series Forecasting', ['time_series'], ['forecast']],
  ] as const).map(([id, label, inputTypes, outputTypes]) => capability({
    id, label, group: 'tabular', inputTypes: [...inputTypes], outputTypes: [...outputTypes],
    description: `${label} is available in the Hugging Face ecosystem but has no AmarktAI data adapter.`,
    providers: hfOnly, executableEndpoint: null, status: 'provider_available_not_wired',
    blocker: 'No validated tabular/time-series schema, task adapter, or result contract is wired.',
    requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true,
  })),

  capability({ id: 'reinforcement_learning', label: 'Reinforcement Learning', group: 'experimental', inputTypes: ['environment', 'policy'], outputTypes: ['policy', 'metrics'], description: 'Train or evaluate reinforcement-learning policies.', providers: [], executableEndpoint: null, status: 'unavailable', blocker: 'No training environment, compute scheduler, safety contract, or approved execution provider exists.', requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'robotics', label: 'Robotics', group: 'experimental', inputTypes: ['sensor_data', 'task'], outputTypes: ['control_plan'], description: 'Plan or control robotics tasks.', providers: [], executableEndpoint: null, status: 'unavailable', blocker: 'Physical control is outside V1 and requires hardware-specific safety and approval systems.', requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: false, longRunning: true, safetyNotes: 'No physical actuation may be exposed through connected apps in V1.' }),
  capability({ id: 'any_to_any', label: 'Any to Any', group: 'experimental', inputTypes: ['multimodal'], outputTypes: ['multimodal'], description: 'General arbitrary modality conversion.', providers: ['genx', 'qwen', 'mimo', 'huggingface'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'No bounded input/output contract exists; individual modality routes must be used.', requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'multimodal_generation', label: 'Multimodal Generation', group: 'multimodal', inputTypes: ['text', 'image', 'audio', 'video'], outputTypes: ['text', 'image', 'audio', 'video'], description: 'Generate coordinated outputs across modalities.', providers: ['genx', 'qwen'], executableEndpoint: null, status: 'provider_available_not_wired', blocker: 'Individual media routes exist, but no atomic multimodal orchestration and artifact bundle contract is wired.', requiredScope: 'ai:data:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'campaign_generation', label: 'Campaign Generation', group: 'agents_or_planning', inputTypes: ['brief', 'brand_context'], outputTypes: ['campaign_plan', 'content'], description: 'Create a campaign plan and content set.', providers: textProviders, executableProviders: textProviders, executableEndpoint: '/api/brain/request', status: 'partially_wired', blocker: 'Text generation works, but there is no dedicated campaign schema, artifact bundle, or approval contract.', requiredScope: 'ai:campaign:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: true }),
  capability({ id: 'brand_aware_content_generation', label: 'Brand-Aware Content Generation', group: 'agents_or_planning', inputTypes: ['brief', 'brand_context'], outputTypes: ['content'], description: 'Generate content grounded in an app brand profile.', providers: textProviders, executableProviders: textProviders, executableEndpoint: '/api/brain/request', status: 'partially_wired', blocker: 'App-context text generation exists, but brand-profile retrieval and proof are not a dedicated execution contract.', requiredScope: 'ai:campaign:execute', exposeToConnectedAppsV1: false, createsArtifact: true, longRunning: false }),
] as const

export const V1_CAPABILITY_MATRIX = AI_CAPABILITY_TAXONOMY

export function getCapabilityTaxonomyByGroup(): Record<CapabilityGroup, AiCapabilityDefinition[]> {
  const grouped = AI_CAPABILITY_CATEGORIES.reduce((result, category) => {
    result[category] = []
    return result
  }, {} as Record<CapabilityGroup, AiCapabilityDefinition[]>)
  for (const capabilityDefinition of AI_CAPABILITY_TAXONOMY) {
    grouped[capabilityDefinition.group].push(capabilityDefinition)
  }
  return grouped
}

export function getCapabilityDefinition(id: string): AiCapabilityDefinition | undefined {
  return AI_CAPABILITY_TAXONOMY.find((capabilityDefinition) => capabilityDefinition.id === id)
}

export function getAiCapabilityTruthSummary() {
  const byStatus = {
    working: 0,
    partially_wired: 0,
    provider_available_not_wired: 0,
    unavailable: 0,
  } satisfies Record<AiCapabilityStatus, number>
  for (const capabilityDefinition of AI_CAPABILITY_TAXONOMY) {
    byStatus[capabilityDefinition.status] += 1
  }
  return {
    total: AI_CAPABILITY_TAXONOMY.length,
    byStatus,
    approvedProviders: APPROVED_DIRECT_PROVIDER_IDS.map((id) => ({
      id,
      displayName: getProviderMeshNode(id)?.displayName ?? id,
    })),
  }
}
