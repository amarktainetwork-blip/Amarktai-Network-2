/**
 * AmarktAI Capability OS taxonomy.
 *
 * This is the product-level capability map, not a fake model registry.
 *
 * Provider connections prove keys/services are alive.
 * Provider catalogs prove available models.
 * Capability taxonomy proves what the platform understands and must route.
 * Execution routes prove jobs/artifacts are actually created.
 */

export type CapabilityCategory =
  | 'multimodal'
  | 'computer_vision'
  | 'natural_language_processing'
  | 'audio'
  | 'tabular'
  | 'time_series'
  | 'reinforcement_learning'
  | 'robotics'
  | 'graph_machine_learning'
  | 'coding_agents'
  | 'app_builder'
  | 'media_studio'
  | 'platform_services'

export type CapabilityExecutionStatus =
  | 'connected_live'
  | 'dynamic_catalog_required'
  | 'route_required'
  | 'implemented'
  | 'blocked_until_provider_model_confirmed'

export type CapabilitySource =
  | 'huggingface_task'
  | 'genx_catalog'
  | 'qwen_wan_catalog'
  | 'mimo_catalog'
  | 'groq_catalog'
  | 'together_catalog'
  | 'amarktai_core'
  | 'local_service'

export type ConnectedProviderKey =
  | 'genx'
  | 'huggingface'
  | 'qwen'
  | 'mimo'
  | 'groq'
  | 'together'
  | 'github'
  | 'redis'
  | 'qdrant'
  | 'local_crawler'
  | 'playwright'
  | 'scrapy'
  | 'trafilatura'
  | 'ffmpeg'
  | 'storage'
  | 'smtp'

export interface CapabilityDefinition {
  id: string
  label: string
  category: CapabilityCategory
  source: CapabilitySource
  status: CapabilityExecutionStatus
  notes: string
}

function cap(
  id: string,
  label: string,
  category: CapabilityCategory,
  source: CapabilitySource,
  status: CapabilityExecutionStatus,
  notes: string,
): CapabilityDefinition {
  return { id, label, category, source, status, notes }
}

export const HUGGINGFACE_TASK_CAPABILITIES: readonly CapabilityDefinition[] = [
  // Multimodal
  cap('audio_text_to_text', 'Audio-Text-to-Text', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; route through task-aware inference client.'),
  cap('image_text_to_text', 'Image-Text-to-Text', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; VLM route required.'),
  cap('image_text_to_image', 'Image-Text-to-Image', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; image edit/generation route required.'),
  cap('image_text_to_video', 'Image-Text-to-Video', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; image-to-video route required.'),
  cap('visual_question_answering', 'Visual Question Answering', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; VQA route required.'),
  cap('document_question_answering', 'Document Question Answering', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; document parser + model route required.'),
  cap('video_text_to_text', 'Video-Text-to-Text', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; video understanding route required.'),
  cap('visual_document_retrieval', 'Visual Document Retrieval', 'multimodal', 'huggingface_task', 'route_required', 'HF task capability; retrieval/index route required.'),
  cap('any_to_any', 'Any-to-Any', 'multimodal', 'huggingface_task', 'dynamic_catalog_required', 'Meta-capability; must resolve to a concrete model route.'),

  // Computer Vision
  cap('depth_estimation', 'Depth Estimation', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('image_classification', 'Image Classification', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('object_detection', 'Object Detection', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('image_segmentation', 'Image Segmentation', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('text_to_image', 'Text-to-Image', 'computer_vision', 'huggingface_task', 'route_required', 'Image generation route.'),
  cap('image_to_text', 'Image-to-Text', 'computer_vision', 'huggingface_task', 'route_required', 'Caption/OCR/VLM route.'),
  cap('image_to_image', 'Image-to-Image', 'computer_vision', 'huggingface_task', 'route_required', 'Image edit/transform route.'),
  cap('image_to_video', 'Image-to-Video', 'computer_vision', 'huggingface_task', 'route_required', 'Image-to-video job route.'),
  cap('unconditional_image_generation', 'Unconditional Image Generation', 'computer_vision', 'huggingface_task', 'route_required', 'Image generation route.'),
  cap('video_classification', 'Video Classification', 'computer_vision', 'huggingface_task', 'route_required', 'Video analysis route.'),
  cap('text_to_video', 'Text-to-Video', 'computer_vision', 'huggingface_task', 'route_required', 'Video generation job route.'),
  cap('zero_shot_image_classification', 'Zero-Shot Image Classification', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('mask_generation', 'Mask Generation', 'computer_vision', 'huggingface_task', 'route_required', 'Segmentation/mask route.'),
  cap('zero_shot_object_detection', 'Zero-Shot Object Detection', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('text_to_3d', 'Text-to-3D', 'computer_vision', 'huggingface_task', 'route_required', '3D generation route; likely async artifact route.'),
  cap('image_to_3d', 'Image-to-3D', 'computer_vision', 'huggingface_task', 'route_required', '3D generation route; likely async artifact route.'),
  cap('image_feature_extraction', 'Image Feature Extraction', 'computer_vision', 'huggingface_task', 'route_required', 'Embedding/feature route.'),
  cap('keypoint_detection', 'Keypoint Detection', 'computer_vision', 'huggingface_task', 'route_required', 'Computer vision route.'),
  cap('video_to_video', 'Video-to-Video', 'computer_vision', 'huggingface_task', 'route_required', 'Video edit/transform job route.'),

  // NLP
  cap('text_classification', 'Text Classification', 'natural_language_processing', 'huggingface_task', 'route_required', 'NLP classifier route.'),
  cap('token_classification', 'Token Classification', 'natural_language_processing', 'huggingface_task', 'route_required', 'NER/token route.'),
  cap('table_question_answering', 'Table Question Answering', 'natural_language_processing', 'huggingface_task', 'route_required', 'Table QA route.'),
  cap('question_answering', 'Question Answering', 'natural_language_processing', 'huggingface_task', 'route_required', 'QA route.'),
  cap('zero_shot_classification', 'Zero-Shot Classification', 'natural_language_processing', 'huggingface_task', 'route_required', 'Classifier route.'),
  cap('translation', 'Translation', 'natural_language_processing', 'huggingface_task', 'route_required', 'Translation route.'),
  cap('summarization', 'Summarization', 'natural_language_processing', 'huggingface_task', 'route_required', 'Summarization route.'),
  cap('feature_extraction', 'Feature Extraction', 'natural_language_processing', 'huggingface_task', 'route_required', 'Embedding route.'),
  cap('text_generation', 'Text Generation', 'natural_language_processing', 'huggingface_task', 'route_required', 'LLM route.'),
  cap('fill_mask', 'Fill-Mask', 'natural_language_processing', 'huggingface_task', 'route_required', 'Masked language route.'),
  cap('sentence_similarity', 'Sentence Similarity', 'natural_language_processing', 'huggingface_task', 'route_required', 'Embedding/similarity route.'),
  cap('text_ranking', 'Text Ranking', 'natural_language_processing', 'huggingface_task', 'route_required', 'Rerank route.'),

  // Audio
  cap('text_to_speech', 'Text-to-Speech', 'audio', 'huggingface_task', 'route_required', 'TTS route.'),
  cap('text_to_audio', 'Text-to-Audio', 'audio', 'huggingface_task', 'route_required', 'Audio/music generation route.'),
  cap('automatic_speech_recognition', 'Automatic Speech Recognition', 'audio', 'huggingface_task', 'route_required', 'STT route.'),
  cap('audio_to_audio', 'Audio-to-Audio', 'audio', 'huggingface_task', 'route_required', 'Audio transform route.'),
  cap('audio_classification', 'Audio Classification', 'audio', 'huggingface_task', 'route_required', 'Audio classifier route.'),
  cap('voice_activity_detection', 'Voice Activity Detection', 'audio', 'huggingface_task', 'route_required', 'VAD route.'),

  // Other ML
  cap('tabular_classification', 'Tabular Classification', 'tabular', 'huggingface_task', 'route_required', 'Traditional ML route.'),
  cap('tabular_regression', 'Tabular Regression', 'tabular', 'huggingface_task', 'route_required', 'Traditional ML route.'),
  cap('time_series_forecasting', 'Time Series Forecasting', 'time_series', 'huggingface_task', 'route_required', 'Forecasting route.'),
  cap('reinforcement_learning', 'Reinforcement Learning', 'reinforcement_learning', 'huggingface_task', 'blocked_until_provider_model_confirmed', 'RL is a project/workflow capability, not simple inference.'),
  cap('robotics', 'Robotics', 'robotics', 'huggingface_task', 'blocked_until_provider_model_confirmed', 'Robotics needs environment/tool integration, not simple inference.'),
  cap('graph_machine_learning', 'Graph Machine Learning', 'graph_machine_learning', 'huggingface_task', 'route_required', 'Graph ML route.'),
] as const

export const AMARKTAI_CORE_CAPABILITIES: readonly CapabilityDefinition[] = [
  cap('app_builder', 'App Builder', 'app_builder', 'amarktai_core', 'implemented', 'Create full apps from prompt, files, and refinements.'),
  cap('repo_import', 'Repo Import', 'coding_agents', 'amarktai_core', 'implemented', 'Import GitHub repositories into a guarded workspace.'),
  cap('repo_audit', 'Repo Audit', 'coding_agents', 'amarktai_core', 'implemented', 'Audit repos for blockers and improvement plans.'),
  cap('patch_generation', 'Patch Generation', 'coding_agents', 'amarktai_core', 'implemented', 'Generate code patches through guarded workbench flows.'),
  cap('safe_test_runner', 'Safe Test Runner', 'coding_agents', 'amarktai_core', 'implemented', 'Run allowed tests and checks from workbench jobs.'),
  cap('pull_request_creation', 'Pull Request Creation', 'coding_agents', 'amarktai_core', 'implemented', 'Create PRs through GitHub integration.'),
  cap('vps_deployment', 'VPS Deployment', 'coding_agents', 'amarktai_core', 'route_required', 'Deployments require approval, logs, rollback, and VPS command routing.'),
  cap('media_studio', 'Media Studio', 'media_studio', 'amarktai_core', 'route_required', 'Unified image/video/voice/music generation UI.'),
  cap('artifact_library', 'Artifact Library', 'platform_services', 'amarktai_core', 'implemented', 'Persist and display generated files, media and job results.'),
  cap('connected_apps_command_center', 'Connected Apps Command Center', 'platform_services', 'amarktai_core', 'route_required', 'Register apps, receive events, issue commands, and share artifacts.'),
] as const

export const CAPABILITY_TAXONOMY: readonly CapabilityDefinition[] = [
  ...HUGGINGFACE_TASK_CAPABILITIES,
  ...AMARKTAI_CORE_CAPABILITIES,
] as const

export const PROVIDER_CAPABILITY_POLICY = [
  {
    provider: 'genx',
    mode: 'dynamic_catalog',
    capabilities: ['text_generation', 'text_to_image', 'text_to_video', 'image_to_video', 'text_to_audio', 'text_to_speech', 'automatic_speech_recognition', 'media_studio'],
    notes: 'Pull /api/v1/models and /api/v1/account/pricing; media uses async jobs.',
  },
  {
    provider: 'huggingface',
    mode: 'task_catalog',
    capabilities: HUGGINGFACE_TASK_CAPABILITIES.map((capability) => capability.id),
    notes: 'Use task-specific inference clients for non-chat tasks; OpenAI-compatible endpoint is chat-only.',
  },
  {
    provider: 'qwen',
    mode: 'model_studio_catalog',
    capabilities: ['text_generation', 'image_text_to_text', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'video_to_video', 'text_to_speech', 'automatic_speech_recognition'],
    notes: 'Qwen/Wan/DashScope capability families; runtime provider key remains qwen.',
  },
  {
    provider: 'mimo',
    mode: 'live_discovery',
    capabilities: ['text_generation', 'image_text_to_text', 'video_text_to_text', 'text_to_speech', 'automatic_speech_recognition'],
    notes: 'Only route model IDs confirmed by live API/model discovery.',
  },
  {
    provider: 'groq',
    mode: 'live_models',
    capabilities: ['text_generation', 'automatic_speech_recognition', 'text_to_speech', 'repo_audit', 'patch_generation'],
    notes: 'Use Groq model listing/current docs; do not force stale preview models.',
  },
  {
    provider: 'together',
    mode: 'endpoint_catalog',
    capabilities: ['text_generation', 'feature_extraction', 'text_ranking', 'text_to_image', 'image_to_image', 'automatic_speech_recognition', 'text_to_speech'],
    notes: 'Use endpoint-specific catalog for serverless chat, images, audio, embeddings and rerank.',
  },
  {
    provider: 'github',
    mode: 'service',
    capabilities: ['repo_import', 'pull_request_creation'],
    notes: 'GitHub is a service/tool provider, not an AI model provider.',
  },
  {
    provider: 'ffmpeg',
    mode: 'local_service',
    capabilities: ['video_to_video', 'audio_to_audio'],
    notes: 'Local media post-processing and format conversion.',
  },
  {
    provider: 'qdrant',
    mode: 'local_service',
    capabilities: ['visual_document_retrieval', 'sentence_similarity', 'feature_extraction'],
    notes: 'Vector retrieval backend.',
  },
  {
    provider: 'local_crawler',
    mode: 'local_service',
    capabilities: ['repo_audit', 'document_question_answering'],
    notes: 'Local crawl/render/research ingestion layer.',
  },
] as const

export function getCapabilityTaxonomy(): readonly CapabilityDefinition[] {
  return CAPABILITY_TAXONOMY
}

export function getCapabilityById(id: string): CapabilityDefinition | undefined {
  return CAPABILITY_TAXONOMY.find((capability) => capability.id === id)
}

export function getCapabilitiesByProvider(provider: string): readonly string[] {
  return PROVIDER_CAPABILITY_POLICY.find((entry) => entry.provider === provider)?.capabilities ?? []
}

export function getConnectedProviderKeys(): readonly ConnectedProviderKey[] {
  return [
    'genx',
    'huggingface',
    'qwen',
    'mimo',
    'groq',
    'together',
    'github',
    'redis',
    'qdrant',
    'local_crawler',
    'playwright',
    'scrapy',
    'trafilatura',
    'ffmpeg',
    'storage',
    'smtp',
  ]
}

export function getCapabilityCategories(): readonly CapabilityCategory[] {
  return [...new Set(CAPABILITY_TAXONOMY.map((capability) => capability.category))]
}
