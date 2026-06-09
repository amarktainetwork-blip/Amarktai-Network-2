import type {
  AppCapabilityPackage,
  AppCostProfile,
  CapabilityDefinition,
  CapabilityKey,
  ModelRouteDefinition,
  ProviderDefinition,
  ProviderKey,
  ProviderMeshTruth,
  RoutePlanPreview,
  RoutePlanStep,
} from './types'

export const PROVIDERS: ProviderDefinition[] = [
  {
    key: 'genx',
    displayName: 'GenX',
    role: 'Premium unified execution backbone for reasoning, coding, image, video, avatar, music, voice, files, sessions, and async media jobs.',
    defaultCostClass: 'premium',
    strengths: ['premium reasoning', 'premium media', 'Kling Avatar', 'Lyria music', 'Veo/Kling/Seedance/PixVerse video', 'Recraft/Nano/Grok image'],
    bestFor: ['reasoning', 'code', 'image_generation', 'video_generation', 'avatar_video', 'music_generation', 'tts', 'stt'],
    avoidFor: ['cheap app chat', 'high-volume low-risk drafts'] as CapabilityKey[],
    vaultKeyAliases: ['genx', 'GenX', 'GENX_API_KEY'],
  },
  {
    key: 'huggingface',
    displayName: 'Hugging Face',
    role: 'Open-source task universe, specialist model fallback, model discovery, and private endpoint route later.',
    defaultCostClass: 'cheap',
    strengths: ['task breadth', 'open-source models', 'private endpoints', 'image/audio/video/text fallback'],
    bestFor: ['image_generation', 'image_editing', 'video_generation', 'stt', 'tts', 'embeddings', 'rerank', 'rag'],
    avoidFor: ['premium final render without model proof'] as CapabilityKey[],
    vaultKeyAliases: ['huggingface', 'Hugging Face', 'HF_TOKEN', 'HUGGINGFACE_API_KEY'],
  },
  {
    key: 'qwen',
    displayName: 'Qwen / DashScope',
    role: 'Balanced specialist for coding, reasoning, image, video, voice, ASR, multimodal understanding, embeddings, and rerank.',
    defaultCostClass: 'balanced',
    strengths: ['image/video/voice', 'multimodal', 'coding', 'ASR/TTS', 'embeddings/rerank'],
    bestFor: ['reasoning', 'code', 'image_generation', 'image_editing', 'video_generation', 'voice_design', 'voice_clone', 'tts', 'stt', 'embeddings', 'rerank'],
    avoidFor: [] as CapabilityKey[],
    vaultKeyAliases: ['qwen', 'Qwen / DashScope', 'DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
  },
  {
    key: 'mimo',
    displayName: 'Xiaomi MiMo',
    role: 'Long-context planner, validator, cheap/basic app AI, ASR, TTS, voice design, and voice clone layer.',
    defaultCostClass: 'balanced',
    strengths: ['1M context planning', 'structured output', 'function calls', 'web search', 'ASR', 'TTS', 'voice clone/design'],
    bestFor: ['reasoning', 'research', 'marketing_automation', 'voice_design', 'voice_clone', 'tts', 'stt', 'self_learning'],
    avoidFor: ['premium final video render'] as CapabilityKey[],
    vaultKeyAliases: ['mimo', 'Xiaomi MiMo', 'MIMO_API_KEY', 'MINIMAX_API_KEY'],
  },
  {
    key: 'together',
    displayName: 'Together AI',
    role: 'Low-cost open model fallback for text, vision, image, embeddings, rerank, and structured outputs.',
    defaultCostClass: 'cheap',
    strengths: ['cheap text', 'image fallback', 'embeddings', 'rerank', 'open model variety'],
    bestFor: ['chat', 'streaming_text', 'image_generation', 'embeddings', 'rerank', 'research'],
    avoidFor: ['premium final avatar/video'] as CapabilityKey[],
    vaultKeyAliases: ['together', 'Together AI', 'TOGETHER_API_KEY'],
  },
  {
    key: 'groq',
    displayName: 'Groq',
    role: 'Fast text, fast drafts, high-volume simple app AI, STT, and low-latency routing.',
    defaultCostClass: 'cheap',
    strengths: ['very fast text', 'STT', 'draft variations', 'low latency'],
    bestFor: ['chat', 'streaming_text', 'stt', 'research', 'lyrics_generation'],
    avoidFor: ['premium media generation'] as CapabilityKey[],
    vaultKeyAliases: ['groq', 'Groq', 'GROQ_API_KEY'],
  },
]

export const CAPABILITIES: CapabilityDefinition[] = [
  { key: 'chat', label: 'Chat', description: 'General conversational assistant responses.', defaultExecution: 'streaming', needsArtifact: false, needsApprovalDefault: false },
  { key: 'streaming_text', label: 'Streaming text', description: 'Token-streamed text generation and tool logs.', defaultExecution: 'streaming', needsArtifact: false, needsApprovalDefault: false },
  { key: 'reasoning', label: 'Reasoning', description: 'Complex planning, analysis, and validation.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'code', label: 'Code', description: 'Code generation, patch planning, and repo repair support.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'repo_workbench', label: 'Repo workbench', description: 'Repo audit, repair, PR, and deployment workflows.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'research', label: 'Research', description: 'Web/app/domain research and summaries.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: false },
  { key: 'web_search', label: 'Web search', description: 'Search and retrieval for current public information.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'marketing_automation', label: 'Marketing automation', description: 'Campaigns, social posts, ads, email, video, and connected-app marketing.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'brand_kit', label: 'Brand kit', description: 'App brand identity, tone, colors, logo, claims, CTAs, and marketing rules.', defaultExecution: 'sync', needsArtifact: true, needsApprovalDefault: false },
  { key: 'image_generation', label: 'Image generation', description: 'Text-to-image and image creation.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'image_editing', label: 'Image editing', description: 'Image-to-image, edit, inpaint, outpaint, and reference-guided image creation.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'image_to_video', label: 'Image to video', description: 'Animate or transform still images into video clips.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: true },
  { key: 'video_generation', label: 'Video generation', description: 'Short text-to-video or image-to-video clips.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: true },
  { key: 'long_video_pipeline', label: 'Long video pipeline', description: 'Script, scene planning, multiple clips, voice, music, captions, and FFmpeg stitching.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'music_generation', label: 'Music / song generation', description: 'Songs, music beds, instrumentals, jingles, and app theme music.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'lyrics_generation', label: 'Lyrics generation', description: 'Song structure, lyrics, rhymes, hooks, and style blending.', defaultExecution: 'sync', needsArtifact: true, needsApprovalDefault: false },
  { key: 'audio_generation', label: 'Audio generation', description: 'General audio generation and editing.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'tts', label: 'Text to speech', description: 'Speech synthesis from text.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'voice_design', label: 'Voice design', description: 'Prompt-designed voices and timbre generation.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: true },
  { key: 'voice_clone', label: 'Voice clone', description: 'Voice cloning from uploaded/approved samples.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: true },
  { key: 'stt', label: 'Speech to text', description: 'Transcription and audio-to-text.', defaultExecution: 'sync', needsArtifact: true, needsApprovalDefault: false },
  { key: 'realtime_voice', label: 'Realtime voice', description: 'Live voice input/output sessions.', defaultExecution: 'streaming', needsArtifact: false, needsApprovalDefault: false },
  { key: 'avatar_image', label: 'Avatar image', description: 'Generate or manage avatar portraits and character assets.', defaultExecution: 'async_job', needsArtifact: true, needsApprovalDefault: false },
  { key: 'avatar_video', label: 'Avatar video', description: 'Talking avatar or digital presenter video.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'embeddings', label: 'Embeddings', description: 'Vector embeddings for search and memory.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'rerank', label: 'Rerank', description: 'Ranking search results or candidate outputs.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'rag', label: 'RAG / knowledge retrieval', description: 'Document and app knowledge retrieval.', defaultExecution: 'pipeline', needsArtifact: false, needsApprovalDefault: false },
  { key: 'documents', label: 'Documents', description: 'Document extraction, summaries, QA, and transformation.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: false },
  { key: 'browser_automation', label: 'Browser automation', description: 'Playwright-driven browsing/testing/scraping inside safe boundaries.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'repo_actions', label: 'Repo actions', description: 'GitHub, git, branch, PR, and deployment actions.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'app_events', label: 'App events', description: 'Connected-app event ingestion and event bus processing.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'webhooks', label: 'Webhooks', description: 'Inbound/outbound app callbacks and HMAC-secured integration events.', defaultExecution: 'sync', needsArtifact: false, needsApprovalDefault: false },
  { key: 'artifact_storage', label: 'Artifact storage', description: 'Store, serve, and manage generated assets.', defaultExecution: 'sync', needsArtifact: true, needsApprovalDefault: false },
  { key: 'self_learning', label: 'Self learning', description: 'Telemetry-based route scoring and provider optimization.', defaultExecution: 'pipeline', needsArtifact: false, needsApprovalDefault: false },
  { key: 'self_healing', label: 'Self healing', description: 'Failure detection, retry/fallback, code repair, and route recovery.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
  { key: 'mcp_tools', label: 'MCP / tools', description: 'Sandboxed external tools for repo, filesystem, browser, database, and app automation.', defaultExecution: 'pipeline', needsArtifact: true, needsApprovalDefault: true },
]

export const MODEL_ROUTES: ModelRouteDefinition[] = [
  {
    provider: 'genx',
    modelId: 'lyria-3-pro-preview',
    displayName: 'GenX Lyria 3 Pro Preview',
    capabilities: ['music_generation', 'audio_generation'],
    roles: ['executor', 'media_provider'],
    costClass: 'premium',
    executionType: 'async_job',
    certification: 'proven',
    priority: 10,
    supportsReferenceMedia: true,
    notes: 'Primary full music/song generation route. Existing VPS has completed GenX music artifacts.',
  },
  {
    provider: 'genx',
    modelId: 'kling-avatar-v2-pro',
    displayName: 'GenX Kling Avatar 2.0 Pro',
    capabilities: ['avatar_video', 'image_to_video', 'video_generation'],
    roles: ['executor', 'media_provider'],
    costClass: 'premium',
    executionType: 'async_job',
    certification: 'available',
    priority: 10,
    supportsReferenceMedia: true,
    notes: 'Primary premium talking avatar route: image + audio to video.',
  },
  {
    provider: 'genx',
    modelId: 'veo-kling-seedance-pixverse-routes',
    displayName: 'GenX premium video routes',
    capabilities: ['video_generation', 'image_to_video', 'long_video_pipeline'],
    roles: ['executor', 'media_provider'],
    costClass: 'premium',
    executionType: 'async_job',
    certification: 'available',
    priority: 8,
    supportsReferenceMedia: true,
    notes: 'Premium video execution family for clips used by the long-video pipeline.',
  },
  {
    provider: 'genx',
    modelId: 'gpt-5.4-mini',
    displayName: 'GenX GPT-5.4 Mini',
    capabilities: ['chat', 'streaming_text', 'reasoning', 'code', 'research'],
    roles: ['planner', 'executor', 'validator'],
    costClass: 'premium',
    executionType: 'streaming',
    certification: 'available',
    priority: 7,
    supportsStreaming: true,
    supportsFiles: true,
    notes: 'Premium general reasoning/coding route.',
  },
  {
    provider: 'huggingface',
    modelId: 'hf-task-router',
    displayName: 'Hugging Face Task Router',
    capabilities: ['chat', 'image_generation', 'image_editing', 'video_generation', 'image_to_video', 'stt', 'tts', 'audio_generation', 'embeddings', 'rerank', 'rag', 'documents'],
    roles: ['fallback_executor', 'media_provider', 'tool_provider'],
    costClass: 'cheap',
    executionType: 'async_job',
    certification: 'available',
    priority: 7,
    supportsFiles: true,
    supportsReferenceMedia: true,
    notes: 'Open-source model/task universe. Must be routed by task tags and model capability.',
  },
  {
    provider: 'qwen',
    modelId: 'qwen3.7-plus-or-max',
    displayName: 'Qwen reasoning/coding route',
    capabilities: ['chat', 'streaming_text', 'reasoning', 'code', 'research', 'documents'],
    roles: ['planner', 'executor', 'validator'],
    costClass: 'balanced',
    executionType: 'streaming',
    certification: 'available',
    priority: 8,
    supportsStreaming: true,
    supportsFiles: true,
    supportsLongContext: true,
    notes: 'Balanced reasoning, coding, multilingual, multimodal route.',
  },
  {
    provider: 'qwen',
    modelId: 'qwen-image-wan-voice-routes',
    displayName: 'Qwen image/video/voice routes',
    capabilities: ['image_generation', 'image_editing', 'avatar_image', 'video_generation', 'image_to_video', 'tts', 'voice_design', 'voice_clone', 'stt', 'embeddings', 'rerank'],
    roles: ['executor', 'media_provider', 'voice_provider', 'fallback_executor'],
    costClass: 'balanced',
    executionType: 'async_job',
    certification: 'available',
    priority: 8,
    supportsFiles: true,
    supportsReferenceMedia: true,
    supportsVoiceClone: true,
    supportsVoiceDesign: true,
    notes: 'Qwen/Wan/Voice family route group for media and voice capabilities.',
  },
  {
    provider: 'mimo',
    modelId: 'mimo-v2.5-pro',
    displayName: 'Mimo v2.5 Pro',
    capabilities: ['chat', 'streaming_text', 'reasoning', 'code', 'research', 'marketing_automation', 'self_learning'],
    roles: ['planner', 'validator', 'executor'],
    costClass: 'balanced',
    executionType: 'streaming',
    certification: 'available',
    priority: 9,
    supportsStreaming: true,
    supportsFiles: true,
    supportsLongContext: true,
    notes: '1M-context planning, validation, route planning, and connected-app orchestration.',
  },
  {
    provider: 'mimo',
    modelId: 'mimo-v2.5-asr-tts-voiceclone-voicedesign',
    displayName: 'Mimo audio/voice family',
    capabilities: ['stt', 'tts', 'voice_design', 'voice_clone', 'realtime_voice'],
    roles: ['executor', 'voice_provider'],
    costClass: 'balanced',
    executionType: 'async_job',
    certification: 'available',
    priority: 8,
    supportsVoiceClone: true,
    supportsVoiceDesign: true,
    notes: 'ASR, TTS, voice clone, and voice design route family.',
  },
  {
    provider: 'together',
    modelId: 'together-open-model-routes',
    displayName: 'Together open model routes',
    capabilities: ['chat', 'streaming_text', 'reasoning', 'image_generation', 'embeddings', 'rerank', 'research'],
    roles: ['executor', 'fallback_executor'],
    costClass: 'cheap',
    executionType: 'streaming',
    certification: 'available',
    priority: 6,
    supportsStreaming: true,
    notes: 'Cheap/balanced open model fallback and image/embedding/rerank route.',
  },
  {
    provider: 'groq',
    modelId: 'groq-fast-text-stt-routes',
    displayName: 'Groq fast text/STT routes',
    capabilities: ['chat', 'streaming_text', 'research', 'lyrics_generation', 'stt'],
    roles: ['executor', 'fallback_executor'],
    costClass: 'cheap',
    executionType: 'streaming',
    certification: 'available',
    priority: 7,
    supportsStreaming: true,
    notes: 'Fast text, high-volume drafts, and STT route.',
  },
]

export const APP_CAPABILITY_PACKAGES: AppCapabilityPackage[] = [
  {
    id: 'basic_ai_app',
    label: 'Basic AI App',
    description: 'Low-cost app assistant, summaries, translation, simple support, and basic automation.',
    defaultCostProfile: 'low_cost',
    capabilities: ['chat', 'streaming_text', 'reasoning', 'research'],
    preferredProviders: ['groq', 'together', 'qwen', 'mimo', 'huggingface'],
    fallbackProviders: ['genx'],
    requiredAgents: ['responder', 'classifier', 'researcher'],
    approvalRequiredFor: ['video_generation', 'music_generation', 'avatar_video'],
  },
  {
    id: 'marketing_engine',
    label: 'Marketing Engine',
    description: 'Campaign planning, copy, images, videos, voice, email, social posts, brand-kit-aware outputs, and cross-app marketing.',
    defaultCostProfile: 'balanced',
    capabilities: ['marketing_automation', 'brand_kit', 'research', 'image_generation', 'video_generation', 'music_generation', 'tts', 'artifact_storage', 'app_events', 'webhooks'],
    preferredProviders: ['mimo', 'qwen', 'groq', 'together', 'huggingface', 'genx'],
    fallbackProviders: ['genx', 'huggingface', 'qwen'],
    requiredAgents: ['planner', 'marketing', 'creative', 'media', 'qa', 'memory'],
    approvalRequiredFor: ['long_video_pipeline', 'avatar_video', 'voice_clone'],
  },
  {
    id: 'media_factory',
    label: 'Media Factory',
    description: 'Images, songs, voices, avatars, short videos, and long-form media pipelines.',
    defaultCostProfile: 'premium',
    capabilities: ['image_generation', 'image_editing', 'music_generation', 'audio_generation', 'tts', 'voice_design', 'voice_clone', 'avatar_image', 'avatar_video', 'video_generation', 'long_video_pipeline', 'artifact_storage'],
    preferredProviders: ['genx', 'qwen', 'mimo', 'huggingface', 'together'],
    fallbackProviders: ['qwen', 'huggingface', 'genx'],
    requiredAgents: ['creative_director', 'media_agent', 'voice_agent', 'avatar_agent', 'qa_agent'],
    approvalRequiredFor: ['long_video_pipeline', 'avatar_video', 'voice_clone'],
  },
  {
    id: 'repo_builder',
    label: 'Repo Builder',
    description: 'Repo audit, code repair, testing, PR creation, deploy planning, and self-healing code workflows.',
    defaultCostProfile: 'balanced',
    capabilities: ['code', 'repo_workbench', 'repo_actions', 'research', 'browser_automation', 'self_healing', 'artifact_storage'],
    preferredProviders: ['qwen', 'mimo', 'genx', 'groq', 'together'],
    fallbackProviders: ['genx', 'huggingface'],
    requiredAgents: ['architect', 'code_repairer', 'tester', 'deployment_agent', 'qa_agent'],
    approvalRequiredFor: ['repo_actions', 'mcp_tools'],
  },
  {
    id: 'trading_forex_ops',
    label: 'Trading / Forex Ops',
    description: 'Market summaries, guarded reasoning, numeric parsing, risk review, and high-risk action approvals.',
    defaultCostProfile: 'balanced',
    capabilities: ['chat', 'reasoning', 'research', 'documents', 'self_learning', 'webhooks'],
    preferredProviders: ['groq', 'qwen', 'mimo', 'together'],
    fallbackProviders: ['genx'],
    requiredAgents: ['market_analyst', 'risk_evaluator', 'auditor'],
    approvalRequiredFor: ['repo_actions'],
  },
  {
    id: 'companion_family_pet_equine',
    label: 'Companion / Family / Pet / Equine',
    description: 'Personalized assistants, app memory, image analysis, reminders, voice, avatars, and brand-safe media.',
    defaultCostProfile: 'balanced',
    capabilities: ['chat', 'reasoning', 'research', 'image_generation', 'image_editing', 'tts', 'stt', 'avatar_image', 'avatar_video', 'brand_kit', 'artifact_storage'],
    preferredProviders: ['qwen', 'mimo', 'huggingface', 'groq', 'genx'],
    fallbackProviders: ['together', 'genx'],
    requiredAgents: ['domain_expert', 'memory_agent', 'voice_agent', 'avatar_agent', 'safety_agent'],
    approvalRequiredFor: ['avatar_video', 'voice_clone'],
  },
  {
    id: 'custom_app',
    label: 'Custom App',
    description: 'Start with a clean capability registry and manually select required capabilities.',
    defaultCostProfile: 'balanced',
    capabilities: ['chat', 'reasoning', 'research'],
    preferredProviders: ['qwen', 'mimo', 'groq', 'together', 'huggingface'],
    fallbackProviders: ['genx'],
    requiredAgents: ['router', 'planner'],
    approvalRequiredFor: ['long_video_pipeline', 'avatar_video', 'voice_clone', 'repo_actions', 'mcp_tools'],
  },
]

function routeCandidatesFor(capability: CapabilityKey, costProfile: AppCostProfile = 'balanced'): ModelRouteDefinition[] {
  return MODEL_ROUTES
    .filter((route) => route.capabilities.includes(capability))
    .sort((a, b) => {
      const costBias = costProfile === 'low_cost'
        ? scoreCost(a.costClass) - scoreCost(b.costClass)
        : costProfile === 'premium'
          ? scoreCost(b.costClass) - scoreCost(a.costClass)
          : 0

      if (costBias !== 0) return costBias
      return b.priority - a.priority
    })
}

function scoreCost(cost: ModelRouteDefinition['costClass']): number {
  if (cost === 'cheap') return 1
  if (cost === 'balanced') return 2
  return 3
}

function providersFor(capability: CapabilityKey, costProfile: AppCostProfile = 'balanced'): ProviderKey[] {
  const providers = routeCandidatesFor(capability, costProfile).map((route) => route.provider)
  return Array.from(new Set(providers))
}

function modelHintsFor(capability: CapabilityKey, costProfile: AppCostProfile = 'balanced'): string[] {
  return routeCandidatesFor(capability, costProfile).slice(0, 5).map((route) => route.modelId)
}

export function createRoutePlanPreview(input: {
  appSlug: string
  taskLabel: string
  capability: CapabilityKey
  packageId?: string
  costProfile?: AppCostProfile
}): RoutePlanPreview {
  const costProfile = input.costProfile ?? 'balanced'
  const steps: RoutePlanStep[] = []

  const needsPlanner = ['music_generation', 'avatar_video', 'video_generation', 'long_video_pipeline', 'marketing_automation', 'repo_workbench'].includes(input.capability)

  if (needsPlanner) {
    steps.push({
      id: 'planner',
      label: 'Plan task, constraints, route, and output structure',
      capability: 'reasoning',
      role: 'planner',
      providerCandidates: providersFor('reasoning', costProfile),
      modelHints: modelHintsFor('reasoning', costProfile),
      required: true,
    })
  }

  if (input.capability === 'music_generation') {
    steps.push(
      {
        id: 'lyrics',
        label: 'Create or improve song structure and lyrics',
        capability: 'lyrics_generation',
        role: 'planner',
        providerCandidates: providersFor('lyrics_generation', costProfile),
        modelHints: modelHintsFor('lyrics_generation', costProfile),
        required: true,
      },
      {
        id: 'music',
        label: 'Generate music/song artifact',
        capability: 'music_generation',
        role: 'executor',
        providerCandidates: providersFor('music_generation', costProfile),
        modelHints: modelHintsFor('music_generation', costProfile),
        required: true,
      },
    )
  } else if (input.capability === 'avatar_video') {
    steps.push(
      {
        id: 'avatar-image',
        label: 'Create or select avatar image',
        capability: 'avatar_image',
        role: 'media_provider',
        providerCandidates: providersFor('avatar_image', costProfile),
        modelHints: modelHintsFor('avatar_image', costProfile),
        required: true,
      },
      {
        id: 'voice',
        label: 'Create or select voice profile',
        capability: 'voice_design',
        role: 'voice_provider',
        providerCandidates: providersFor('voice_design', costProfile),
        modelHints: modelHintsFor('voice_design', costProfile),
        required: true,
      },
      {
        id: 'talking-video',
        label: 'Generate talking avatar video',
        capability: 'avatar_video',
        role: 'executor',
        providerCandidates: providersFor('avatar_video', costProfile),
        modelHints: modelHintsFor('avatar_video', costProfile),
        required: true,
      },
    )
  } else if (input.capability === 'long_video_pipeline') {
    steps.push(
      {
        id: 'references',
        label: 'Create reference images and style anchors',
        capability: 'image_generation',
        role: 'media_provider',
        providerCandidates: providersFor('image_generation', costProfile),
        modelHints: modelHintsFor('image_generation', costProfile),
        required: true,
      },
      {
        id: 'clips',
        label: 'Generate short video clips/scenes',
        capability: 'video_generation',
        role: 'media_provider',
        providerCandidates: providersFor('video_generation', costProfile),
        modelHints: modelHintsFor('video_generation', costProfile),
        required: true,
      },
      {
        id: 'voice-music',
        label: 'Generate voiceover and optional music bed',
        capability: 'tts',
        role: 'voice_provider',
        providerCandidates: providersFor('tts', costProfile),
        modelHints: modelHintsFor('tts', costProfile),
        required: false,
      },
      {
        id: 'stitch',
        label: 'Compile final video with FFmpeg',
        capability: 'long_video_pipeline',
        role: 'artifact_provider',
        providerCandidates: [],
        modelHints: ['ffmpeg'],
        required: true,
      },
    )
  } else {
    steps.push({
      id: 'execute',
      label: 'Execute selected capability',
      capability: input.capability,
      role: 'executor',
      providerCandidates: providersFor(input.capability, costProfile),
      modelHints: modelHintsFor(input.capability, costProfile),
      required: true,
    })
  }

  steps.push({
    id: 'qa-learning',
    label: 'Validate output, save artifact, and log route learning',
    capability: 'self_learning',
    role: 'validator',
    providerCandidates: providersFor('reasoning', costProfile),
    modelHints: modelHintsFor('reasoning', costProfile),
    required: true,
  })

  return {
    appSlug: input.appSlug,
    packageId: input.packageId,
    taskLabel: input.taskLabel,
    detectedCapability: input.capability,
    costProfile,
    steps,
  }
}

export function buildProviderMeshTruth(): ProviderMeshTruth {
  const provenRoutes = MODEL_ROUTES.filter((route) => route.certification === 'proven').length
  const experimentalRoutes = MODEL_ROUTES.filter((route) => route.certification === 'experimental').length
  const needsSetupRoutes = MODEL_ROUTES.filter((route) => route.certification === 'needs_setup').length

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      providers: PROVIDERS.length,
      capabilities: CAPABILITIES.length,
      modelRoutes: MODEL_ROUTES.length,
      appPackages: APP_CAPABILITY_PACKAGES.length,
      provenRoutes,
      experimentalRoutes,
      needsSetupRoutes,
    },
    providers: PROVIDERS,
    capabilities: CAPABILITIES,
    routes: MODEL_ROUTES,
    packages: APP_CAPABILITY_PACKAGES,
  }
}
