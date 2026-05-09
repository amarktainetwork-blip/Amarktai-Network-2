export type RootWorkspaceIdentity = {
  appSlug: 'amarktai-network'
  type: 'root_admin_app'
  access: 'full'
  providers: 'all_configured_providers'
  models: 'all_valid_configured_models'
  tools: 'all_configured_tools'
  agents: 'all_internal_agents'
  adultPolicy: 'settings_controlled'
  memory: 'root_admin_memory'
  workbench: 'full_access'
  studio: 'full_access'
  operations: 'full_access'
  message: string
}

export const ROOT_WORKSPACE: RootWorkspaceIdentity = {
  appSlug: 'amarktai-network',
  type: 'root_admin_app',
  access: 'full',
  providers: 'all_configured_providers',
  models: 'all_valid_configured_models',
  tools: 'all_configured_tools',
  agents: 'all_internal_agents',
  adultPolicy: 'settings_controlled',
  memory: 'root_admin_memory',
  workbench: 'full_access',
  studio: 'full_access',
  operations: 'full_access',
  message:
    'This is the root AmarktAI Network workspace. It has full access to configured providers and tools.',
}

export const EXTERNAL_APP_ONBOARDING_LABEL = 'Add external managed app'
export const LIVE_GENX_MODEL_COUNT = 58

export type GovernedProviderKey =
  | 'genx'
  | 'openai'
  | 'groq'
  | 'together'
  | 'huggingface'
  | 'qwen'
  | 'minimax'
  | 'github'
  | 'firecrawl'
  | 'playwright'
  | 'redis'
  | 'storage'
  | 'webdock'
  | 'smtp'
  | 'gemini'
  | 'xai'
  | 'mimo'
  | 'replicate'
  | 'elevenlabs'
  | 'deepgram'

export type GovernedCapability =
  | 'chat'
  | 'reasoning'
  | 'coding'
  | 'repo_audit'
  | 'research'
  | 'crawling'
  | 'browser_qa'
  | 'image_generation'
  | 'image_editing'
  | 'image_to_video'
  | 'video_generation'
  | 'music_generation'
  | 'song_generation'
  | 'lyrics_generation'
  | 'instrumental_music'
  | 'tts'
  | 'stt'
  | 'voice_selection'
  | 'voice_cloning'
  | 'embeddings'
  | 'rag'
  | 'moderation'
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'app_memory'
  | 'artifacts'
  | 'operations'

export type CapabilityReadiness =
  | 'production_ready'
  | 'partial'
  | 'available_not_wired'
  | 'not_verified'
  | 'blocked'
  | 'unsupported'

export type ExecutionMode = 'sync' | 'stream' | 'async_job' | 'internal'

export type GovernedModel = {
  provider: GovernedProviderKey
  providerLabel: string
  modelId: string
  label: string
  capabilities: GovernedCapability[]
  status: CapabilityReadiness
  route?: string
  requiredEnv: string[]
  execution: ExecutionMode
  polling: boolean
  artifacts: boolean
  approved: boolean
  routePresent: boolean
  notes: string
}

export type ProviderGovernance = {
  provider: GovernedProviderKey
  label: string
  approved: boolean
  routePresent: boolean
  requiredEnv: string[]
  unlocks: string
  liveTestRequired: boolean
  liveTestStatus: 'connected' | 'configured' | 'needs_key' | 'needs_live_test' | 'needs_test_route' | 'unsupported'
  notes: string
}

export type CapabilityGovernance = {
  capability: GovernedCapability
  label: string
  primaryProvider: GovernedProviderKey | null
  fallbackProviders: GovernedProviderKey[]
  route: string | null
  routeExists: boolean
  requiredEnv: string[]
  execution: ExecutionMode
  polling: boolean
  artifacts: boolean
  dashboardVisible: boolean
  status: CapabilityReadiness
  blocker?: string
  notes: string
}

export type CapabilityValidationInput = {
  appSlug?: string
  provider?: string | null
  modelId?: string | null
  capability: string
  adultPolicyAllows?: boolean
  productionMode?: boolean
  budgetAllows?: boolean
  requireConfiguredKey?: boolean
}

export type CapabilityValidationResult = {
  allowed: boolean
  capability: GovernedCapability | null
  provider?: GovernedProviderKey
  model?: GovernedModel
  reason: string
  blockers: string[]
}

const providerLabels: Record<GovernedProviderKey, string> = {
  genx: 'GenX',
  openai: 'OpenAI',
  groq: 'Groq',
  together: 'Together AI',
  huggingface: 'Hugging Face',
  qwen: 'Qwen / DashScope',
  minimax: 'MiniMax / Mimo',
  github: 'GitHub',
  firecrawl: 'Firecrawl',
  playwright: 'Playwright',
  redis: 'Redis',
  storage: 'Storage',
  webdock: 'Webdock',
  smtp: 'SMTP / email',
  gemini: 'Gemini',
  xai: 'xAI / Grok',
  mimo: 'Mimo',
  replicate: 'Replicate',
  elevenlabs: 'ElevenLabs',
  deepgram: 'Deepgram',
}

export const ROUTE_PRESENT_NOT_APPROVED_PROVIDERS: ProviderGovernance[] = [
  {
    provider: 'gemini',
    label: providerLabels.gemini,
    approved: false,
    routePresent: true,
    requiredEnv: ['GOOGLE_GENERATIVE_AI_API_KEY or GENX_API_KEY when exposed through GenX'],
    unlocks: 'Direct Gemini route-present support is visible, but GenX remains the approved orchestration layer.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Use GenX-owned Gemini models unless direct Gemini approval is added.',
  },
  {
    provider: 'xai',
    label: providerLabels.xai,
    approved: false,
    routePresent: true,
    requiredEnv: ['XAI_API_KEY'],
    unlocks: 'Adult text/image specialist routes where policy allows.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Route-present specialist provider, not a general approved dashboard provider.',
  },
  {
    provider: 'replicate',
    label: providerLabels.replicate,
    approved: false,
    routePresent: true,
    requiredEnv: ['REPLICATE_API_TOKEN'],
    unlocks: 'Legacy media experiments only.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Do not expose as a primary owner until governance approves the provider.',
  },
  {
    provider: 'elevenlabs',
    label: providerLabels.elevenlabs,
    approved: false,
    routePresent: true,
    requiredEnv: ['ELEVENLABS_API_KEY'],
    unlocks: 'Legacy TTS route visibility.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Not part of the approved provider stack for this phase.',
  },
  {
    provider: 'deepgram',
    label: providerLabels.deepgram,
    approved: false,
    routePresent: true,
    requiredEnv: ['DEEPGRAM_API_KEY'],
    unlocks: 'Legacy STT route visibility.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Not part of the approved provider stack for this phase.',
  },
]

export const PROVIDER_GOVERNANCE: ProviderGovernance[] = [
  {
    provider: 'genx',
    label: providerLabels.genx,
    approved: true,
    routePresent: true,
    requiredEnv: ['GENX_API_KEY'],
    unlocks: 'Primary orchestration for chat, reasoning, coding, image, video, Lyria music, TTS, and STT.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Approved primary provider. Live catalog target is 58 models.',
  },
  {
    provider: 'openai',
    label: providerLabels.openai,
    approved: true,
    routePresent: true,
    requiredEnv: ['OPENAI_API_KEY'],
    unlocks: 'Moderation, embeddings, fallback text, fallback image, and fallback audio.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Fallback and safety owner.',
  },
  {
    provider: 'groq',
    label: providerLabels.groq,
    approved: true,
    routePresent: true,
    requiredEnv: ['GROQ_API_KEY'],
    unlocks: 'Fast text, structured output where supported, STT, and TTS where route support exists.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Fast text fallback; media use must be capability filtered.',
  },
  {
    provider: 'qwen',
    label: providerLabels.qwen,
    approved: true,
    routePresent: true,
    requiredEnv: ['DASHSCOPE_API_KEY'],
    unlocks: 'Image/video and underused voice capabilities where routes are wired.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Qwen voice cloning/design is surfaced as available-not-wired unless a route exists.',
  },
  {
    provider: 'minimax',
    label: providerLabels.minimax,
    approved: true,
    routePresent: true,
    requiredEnv: ['MINIMAX_API_KEY'],
    unlocks: 'TTS, video, and voice specialist workflows where routes are wired.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'MiniMax/Mimo TTS is preserved and music is not treated as TTS.',
  },
  {
    provider: 'huggingface',
    label: providerLabels.huggingface,
    approved: true,
    routePresent: true,
    requiredEnv: ['HUGGINGFACE_API_TOKEN'],
    unlocks: 'Specialist/private endpoint models, embeddings/reranking, STT fallback, and policy-gated adult-safe specialist layers.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Underused specialist provider; model capability depends on deployed endpoint.',
  },
  {
    provider: 'together',
    label: providerLabels.together,
    approved: true,
    routePresent: true,
    requiredEnv: ['TOGETHER_API_KEY'],
    unlocks: 'Open-model fallback, structured output fallback, and adult text/image only through policy-gated routes.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Fallback only; never route media by default without capability proof.',
  },
  {
    provider: 'github',
    label: providerLabels.github,
    approved: true,
    routePresent: true,
    requiredEnv: ['GITHUB_TOKEN'],
    unlocks: 'Workbench repo import, branch loading, diffs, checks, commits, pushes, and PR creation.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Workbench owner. Token must never be displayed.',
  },
  {
    provider: 'firecrawl',
    label: providerLabels.firecrawl,
    approved: true,
    routePresent: true,
    requiredEnv: ['FIRECRAWL_API_KEY'],
    unlocks: 'Research, crawling, URL research, competitor research, and scraping.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Research/crawling owner.',
  },
  {
    provider: 'playwright',
    label: providerLabels.playwright,
    approved: true,
    routePresent: true,
    requiredEnv: [],
    unlocks: 'Browser QA, screenshots, app verification, and runtime checks.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Local runtime tool. Requires executable/browser availability.',
  },
  {
    provider: 'redis',
    label: providerLabels.redis,
    approved: true,
    routePresent: true,
    requiredEnv: ['REDIS_URL'],
    unlocks: 'Queues, realtime status, jobs, and async polling coordination.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Async workflow infrastructure.',
  },
  {
    provider: 'storage',
    label: providerLabels.storage,
    approved: true,
    routePresent: true,
    requiredEnv: ['STORAGE_* or configured blob/local storage'],
    unlocks: 'Artifacts, previews, uploads, downloads, and media persistence.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Artifact truth owner.',
  },
  {
    provider: 'webdock',
    label: providerLabels.webdock,
    approved: true,
    routePresent: true,
    requiredEnv: ['WEBDOCK_API_TOKEN'],
    unlocks: 'VPS status and deployment operations.',
    liveTestRequired: true,
    liveTestStatus: 'needs_live_test',
    notes: 'Deployment/runtime owner when configured.',
  },
  {
    provider: 'smtp',
    label: providerLabels.smtp,
    approved: true,
    routePresent: true,
    requiredEnv: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
    unlocks: 'Operational notifications and email delivery.',
    liveTestRequired: true,
    liveTestStatus: 'needs_test_route',
    notes: 'Optional enhancement for go-live communications.',
  },
  ...ROUTE_PRESENT_NOT_APPROVED_PROVIDERS,
]

const capabilityRoutes: Record<GovernedCapability, Pick<CapabilityGovernance, 'route' | 'routeExists' | 'execution' | 'polling' | 'artifacts' | 'dashboardVisible' | 'status'> & { requiredEnv: string[] }> = {
  chat: { route: '/api/admin/studio/stream', routeExists: true, requiredEnv: ['GENX_API_KEY or fallback text key'], execution: 'stream', polling: false, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  reasoning: { route: '/api/admin/studio/stream', routeExists: true, requiredEnv: ['GENX_API_KEY or fallback text key'], execution: 'stream', polling: false, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  coding: { route: '/api/admin/workbench/*', routeExists: true, requiredEnv: ['GENX_API_KEY or fallback coding key', 'GITHUB_TOKEN'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  repo_audit: { route: '/api/admin/workbench/*', routeExists: true, requiredEnv: ['GITHUB_TOKEN'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  research: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['FIRECRAWL_API_KEY or provider search support'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  crawling: { route: '/api/admin/research/*', routeExists: true, requiredEnv: ['FIRECRAWL_API_KEY'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  browser_qa: { route: '/api/admin/browser/*', routeExists: true, requiredEnv: [], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  image_generation: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or image provider key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  image_editing: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or image provider key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  image_to_video: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or video provider key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  video_generation: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or video provider key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  music_generation: { route: '/api/admin/music-studio', routeExists: true, requiredEnv: ['GENX_API_KEY'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  song_generation: { route: '/api/admin/music-studio', routeExists: true, requiredEnv: ['GENX_API_KEY'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  lyrics_generation: { route: '/api/admin/music-studio', routeExists: true, requiredEnv: ['GENX_API_KEY or text provider key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  instrumental_music: { route: '/api/admin/music-studio', routeExists: true, requiredEnv: ['GENX_API_KEY'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  tts: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or OPENAI_API_KEY or GROQ_API_KEY or MINIMAX_API_KEY'], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  stt: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['GENX_API_KEY or OPENAI_API_KEY or GROQ_API_KEY'], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  voice_selection: { route: '/api/admin/studio/execute', routeExists: true, requiredEnv: ['Provider-specific voice key'], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'partial' },
  voice_cloning: { route: null, routeExists: false, requiredEnv: ['Provider-specific voice cloning key'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'available_not_wired' },
  embeddings: { route: '/api/admin/memory/*', routeExists: true, requiredEnv: ['OPENAI_API_KEY or HUGGINGFACE_API_TOKEN'], execution: 'sync', polling: false, artifacts: false, dashboardVisible: true, status: 'partial' },
  rag: { route: '/api/admin/memory/*', routeExists: true, requiredEnv: ['OPENAI_API_KEY or HUGGINGFACE_API_TOKEN', 'storage'], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'partial' },
  moderation: { route: '/api/admin/policy/*', routeExists: true, requiredEnv: ['OPENAI_API_KEY'], execution: 'sync', polling: false, artifacts: false, dashboardVisible: true, status: 'partial' },
  adult_text: { route: '/api/admin/adult/text', routeExists: true, requiredEnv: ['Provider key plus adult policy enabled'], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'partial' },
  adult_image: { route: '/api/admin/adult/image', routeExists: true, requiredEnv: ['Provider key plus adult policy enabled'], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'partial' },
  adult_video: { route: null, routeExists: false, requiredEnv: [], execution: 'async_job', polling: true, artifacts: true, dashboardVisible: true, status: 'blocked' },
  adult_voice: { route: null, routeExists: false, requiredEnv: [], execution: 'sync', polling: false, artifacts: true, dashboardVisible: true, status: 'blocked' },
  app_memory: { route: '/api/admin/memory-learning/*', routeExists: true, requiredEnv: ['storage and optional embeddings provider'], execution: 'internal', polling: false, artifacts: true, dashboardVisible: true, status: 'partial' },
  artifacts: { route: '/api/admin/artifacts', routeExists: true, requiredEnv: ['storage'], execution: 'internal', polling: false, artifacts: true, dashboardVisible: true, status: 'production_ready' },
  operations: { route: '/api/admin/runtime-truth', routeExists: true, requiredEnv: [], execution: 'internal', polling: false, artifacts: false, dashboardVisible: true, status: 'production_ready' },
}

const ownership: Record<GovernedCapability, { primaryProvider: GovernedProviderKey | null; fallbackProviders: GovernedProviderKey[]; notes: string }> = {
  chat: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq', 'together'], notes: 'GenX owns primary conversational routing.' },
  reasoning: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq'], notes: 'Use reasoning/coding-capable text models only.' },
  coding: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq'], notes: 'Workbench must filter to coding/reasoning models.' },
  repo_audit: { primaryProvider: 'github', fallbackProviders: ['genx', 'openai'], notes: 'GitHub owns repo access; GenX/OpenAI own analysis.' },
  research: { primaryProvider: 'firecrawl', fallbackProviders: ['genx', 'openai'], notes: 'Firecrawl owns crawling; text model summarizes.' },
  crawling: { primaryProvider: 'firecrawl', fallbackProviders: ['playwright'], notes: 'Firecrawl first, Playwright for browser automation.' },
  browser_qa: { primaryProvider: 'playwright', fallbackProviders: [], notes: 'Playwright owns browser QA.' },
  image_generation: { primaryProvider: 'genx', fallbackProviders: ['openai', 'qwen', 'huggingface', 'together'], notes: 'Only image-capable models can appear in image workflows.' },
  image_editing: { primaryProvider: 'genx', fallbackProviders: ['openai', 'qwen', 'huggingface'], notes: 'Editing requires explicit model support.' },
  image_to_video: { primaryProvider: 'genx', fallbackProviders: ['qwen', 'minimax'], notes: 'Use video-capable route and async polling.' },
  video_generation: { primaryProvider: 'genx', fallbackProviders: ['qwen', 'minimax'], notes: 'Use async video jobs and artifact polling.' },
  music_generation: { primaryProvider: 'genx', fallbackProviders: ['minimax'], notes: 'Music uses Lyria/music routes, never voice_tts.' },
  song_generation: { primaryProvider: 'genx', fallbackProviders: ['minimax'], notes: 'Song generation is distinct from TTS.' },
  lyrics_generation: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq'], notes: 'Lyrics can be text-assisted but final music route owns audio.' },
  instrumental_music: { primaryProvider: 'genx', fallbackProviders: ['minimax'], notes: 'Instrumental music is not voice synthesis.' },
  tts: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq', 'minimax'], notes: 'MiniMax/Mimo TTS remains a first-class specialist route when wired.' },
  stt: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq', 'huggingface'], notes: 'STT accepts audio upload and transcript artifacts.' },
  voice_selection: { primaryProvider: 'genx', fallbackProviders: ['openai', 'groq', 'minimax'], notes: 'Voice selection only where the provider route supports voices.' },
  voice_cloning: { primaryProvider: 'minimax', fallbackProviders: ['qwen'], notes: 'Surfaced as underused/not wired unless a production-safe route exists.' },
  embeddings: { primaryProvider: 'openai', fallbackProviders: ['huggingface'], notes: 'OpenAI owns embeddings; HF can own private/specialist embeddings.' },
  rag: { primaryProvider: 'openai', fallbackProviders: ['huggingface'], notes: 'RAG depends on embeddings plus storage/vector search.' },
  moderation: { primaryProvider: 'openai', fallbackProviders: [], notes: 'Safety checks should route through moderation/policy owner.' },
  adult_text: { primaryProvider: 'together', fallbackProviders: ['huggingface', 'openai'], notes: 'Policy-gated only; disallowed categories stay blocked.' },
  adult_image: { primaryProvider: 'together', fallbackProviders: ['huggingface'], notes: 'Policy-gated non-explicit adult image only where provider policy permits.' },
  adult_video: { primaryProvider: null, fallbackProviders: [], notes: 'Blocked until provider policy, route, safeguards, artifacts, and live tests exist.' },
  adult_voice: { primaryProvider: null, fallbackProviders: [], notes: 'Blocked until provider policy, route, safeguards, artifacts, and live tests exist.' },
  app_memory: { primaryProvider: 'storage', fallbackProviders: ['openai', 'huggingface'], notes: 'Root memory is admin memory; external apps get scoped memory later.' },
  artifacts: { primaryProvider: 'storage', fallbackProviders: [], notes: 'Storage owns artifact persistence and previews.' },
  operations: { primaryProvider: 'redis', fallbackProviders: ['storage', 'playwright', 'webdock'], notes: 'Operations aggregates runtime truth across tools.' },
}

const genxModelIds = [
  'aura-2', 'claude-haiku-4-5', 'claude-opus-4-6', 'claude-opus-4-7',
  'claude-sonnet-4-6', 'gemini-3-flash', 'gemini-3.1-flash-lite',
  'gemini-3.1-pro', 'genxlm-pro-v1-img', 'genxlm-pro-v1-img-fast',
  'genxlm-pro-v1-tl', 'genxlm-pro-v1-tr', 'genxlm-voice-v1', 'gpt-5',
  'gpt-5-mini', 'gpt-5-nano', 'gpt-5.3-codex', 'gpt-5.4', 'gpt-5.4-mini',
  'gpt-5.4-pro', 'gpt-5.5', 'gpt-image-2', 'grok-4-fast',
  'grok-4.1-fast-reasoning', 'grok-4.2', 'grok-4.2-multi-agent',
  'grok-4.2-reasoning', 'grok-4.3', 'grok-imagine', 'grok-imagine-pro',
  'grok-imagine-video', 'grok-tts', 'kling-avatar-v2-pro', 'kling-v2.5-turbo',
  'kling-v2.5-turbo-i2v', 'kling-v2.6-pro', 'kling-v2.6-pro-i2v',
  'kling-v3-pro', 'kling-v3-pro-i2v', 'lyria-3-clip-preview',
  'lyria-3-pro-preview', 'nano-banana-2', 'nano-banana-pro', 'pixverse-v5.5',
  'pixverse-v5.5-i2v', 'pixverse-v6', 'pixverse-v6-i2v', 'recraft-v4',
  'recraft-v4-pro', 'recraft-v4-pro-vector', 'recraft-v4-vector',
  'seedance-2', 'seedance-2-i2v', 'seedance-2-r2v', 'seedance-v1-fast',
  'seedance-v1-fast-i2v', 'veo-3.1', 'veo-3.1-fast',
] as const

function inferGenXCapabilities(modelId: string): GovernedCapability[] {
  const id = modelId.toLowerCase()
  const caps = new Set<GovernedCapability>()
  if (id.includes('image') || id.includes('imagine') || id.includes('imagen') || id.includes('seedream') || id.includes('flux') || id.includes('stable-diffusion') || id.includes('banana') || id.includes('recraft') || id.includes('-img')) {
    caps.add('image_generation')
    if (id.includes('edit') || id.includes('seedream')) caps.add('image_editing')
  }
  if (id.includes('veo') || id.includes('kling') || id.includes('seedance') || id.includes('hailuo') || id.includes('video') || id.includes('pixverse')) {
    caps.add('video_generation')
    if (id.includes('i2v')) caps.add('image_to_video')
  }
  if (id.includes('lyria')) {
    caps.add('music_generation')
    caps.add('song_generation')
    caps.add('instrumental_music')
  }
  if (id.includes('tts') || id.includes('voice') || id.includes('aura')) {
    caps.add('tts')
    caps.add('voice_selection')
  }
  if (id.includes('transcribe') || id.includes('whisper') || id.includes('-tr')) caps.add('stt')
  if (id.includes('embedding')) caps.add('embeddings')
  if (caps.size === 0) {
    caps.add('chat')
    caps.add('reasoning')
    if (id.includes('coder') || id.includes('gpt') || id.includes('claude') || id.includes('deepseek') || id.includes('gemini')) caps.add('coding')
  }
  return [...caps]
}

function governedModel(
  provider: GovernedProviderKey,
  modelId: string,
  capabilities: GovernedCapability[],
  overrides: Partial<Omit<GovernedModel, 'provider' | 'providerLabel' | 'modelId' | 'label' | 'capabilities'>> = {},
): GovernedModel {
  return {
    provider,
    providerLabel: providerLabels[provider],
    modelId,
    label: `${providerLabels[provider]} ${modelId}`,
    capabilities,
    status: overrides.status ?? 'not_verified',
    route: overrides.route,
    requiredEnv: overrides.requiredEnv ?? PROVIDER_GOVERNANCE.find((entry) => entry.provider === provider)?.requiredEnv ?? [],
    execution: overrides.execution ?? 'sync',
    polling: overrides.polling ?? false,
    artifacts: overrides.artifacts ?? false,
    approved: overrides.approved ?? PROVIDER_GOVERNANCE.find((entry) => entry.provider === provider)?.approved ?? false,
    routePresent: overrides.routePresent ?? PROVIDER_GOVERNANCE.find((entry) => entry.provider === provider)?.routePresent ?? false,
    notes: overrides.notes ?? 'Capability from governance catalog. Live verification still required.',
  }
}

export const GOVERNED_MODELS: GovernedModel[] = [
  ...genxModelIds.map((modelId) => {
    const capabilities = inferGenXCapabilities(modelId)
    const primaryCapability = capabilities[0]
    const route = primaryCapability ? capabilityRoutes[primaryCapability]?.route ?? '/api/admin/studio/execute' : '/api/admin/studio/execute'
    const asyncCap = capabilities.some((capability) => capabilityRoutes[capability]?.execution === 'async_job')
    const blockedAvatar = modelId.includes('avatar')
    return governedModel('genx', modelId, capabilities, {
      status: blockedAvatar ? 'blocked' : 'not_verified',
      route: route ?? undefined,
      execution: asyncCap ? 'async_job' : capabilities.includes('chat') ? 'stream' : 'sync',
      polling: asyncCap,
      artifacts: capabilities.some((capability) => capabilityRoutes[capability]?.artifacts),
      notes: blockedAvatar
        ? 'Avatar/talking video remains blocked until a production backend route and safeguards exist.'
        : `GenX live catalog model. Expected catalog count: ${LIVE_GENX_MODEL_COUNT}.`,
    })
  }),
  governedModel('openai', 'gpt-5.1', ['chat', 'reasoning', 'coding'], { route: '/api/admin/studio/stream', execution: 'stream', artifacts: true, status: 'not_verified' }),
  governedModel('openai', 'gpt-image-1', ['image_generation', 'image_editing'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'not_verified' }),
  governedModel('openai', 'tts-1', ['tts', 'voice_selection'], { route: '/api/admin/studio/execute', artifacts: true, status: 'not_verified' }),
  governedModel('openai', 'gpt-4o-transcribe', ['stt'], { route: '/api/admin/studio/execute', artifacts: true, status: 'not_verified' }),
  governedModel('openai', 'text-embedding-3-large', ['embeddings', 'rag'], { route: '/api/admin/memory/*', artifacts: false, status: 'not_verified' }),
  governedModel('openai', 'omni-moderation-latest', ['moderation'], { route: '/api/admin/policy/*', artifacts: false, status: 'not_verified' }),
  governedModel('groq', 'llama-3.3-70b-versatile', ['chat', 'reasoning', 'coding'], { route: '/api/admin/studio/stream', execution: 'stream', artifacts: true, status: 'not_verified' }),
  governedModel('groq', 'whisper-large-v3-turbo', ['stt'], { route: '/api/admin/studio/execute', artifacts: true, status: 'not_verified' }),
  governedModel('groq', 'aura-2', ['tts', 'voice_selection'], { route: '/api/admin/studio/execute', artifacts: true, status: 'not_verified' }),
  governedModel('qwen', 'qwen-image', ['image_generation'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'not_verified' }),
  governedModel('qwen', 'qwen-image-edit', ['image_generation', 'image_editing'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'not_verified' }),
  governedModel('qwen', 'qwen-video', ['video_generation', 'image_to_video'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'not_verified' }),
  governedModel('qwen', 'qwen-tts-latest', ['tts', 'voice_selection'], { route: undefined, artifacts: true, status: 'available_not_wired', notes: 'Qwen TTS is surfaced as underused until a production Studio route is wired.' }),
  governedModel('qwen', 'qwen-voice-clone', ['voice_cloning'], { route: undefined, execution: 'async_job', polling: true, artifacts: true, status: 'available_not_wired', notes: 'Voice cloning/design requires a production-safe route and policy gates.' }),
  governedModel('minimax', 'minimax-tts', ['tts', 'voice_selection'], { route: '/api/admin/specialist/minimax-tts', artifacts: true, status: 'not_verified' }),
  governedModel('minimax', 'minimax-video-01', ['video_generation', 'image_to_video'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'not_verified' }),
  governedModel('minimax', 'minimax-music', ['music_generation', 'song_generation', 'instrumental_music'], { route: undefined, execution: 'async_job', polling: true, artifacts: true, status: 'available_not_wired', notes: 'Available provider capability from audit, but main Studio path is not wired.' }),
  governedModel('minimax', 'minimax-voice-clone', ['voice_cloning'], { route: undefined, execution: 'async_job', polling: true, artifacts: true, status: 'available_not_wired', notes: 'Voice cloning/design remains unavailable until route, policy, and live test exist.' }),
  governedModel('huggingface', 'specialist-private-endpoint', ['embeddings', 'rag', 'stt', 'adult_text', 'adult_image'], { route: '/api/admin/studio/execute', execution: 'async_job', polling: true, artifacts: true, status: 'partial', notes: 'Private endpoint capability depends on deployed model and live test.' }),
  governedModel('together', 'open-model-text', ['chat', 'reasoning', 'coding', 'adult_text'], { route: '/api/admin/studio/execute', execution: 'stream', artifacts: true, status: 'partial' }),
  governedModel('together', 'policy-gated-image', ['image_generation', 'adult_image'], { route: '/api/admin/adult/image', execution: 'async_job', polling: true, artifacts: true, status: 'partial' }),
]

export function normalizeGovernedCapability(capability: string): GovernedCapability | null {
  const normalized = capability.trim().toLowerCase().replace(/\s+/g, '_').replace(/[/-]/g, '_')
  const aliases: Record<string, GovernedCapability> = {
    image: 'image_generation',
    video: 'video_generation',
    voice_tts: 'tts',
    voice_stt: 'stt',
    tts_voice: 'tts',
    stt_transcription: 'stt',
    music: 'music_generation',
    music_audio: 'music_generation',
    audio_generation: 'music_generation',
    song: 'song_generation',
    browser: 'browser_qa',
    artifacts_preview: 'artifacts',
  }
  const value = aliases[normalized] ?? normalized
  return Object.keys(capabilityRoutes).includes(value) ? (value as GovernedCapability) : null
}

export function isRootWorkspaceAppSlug(appSlug?: string | null): boolean {
  return !appSlug || appSlug === ROOT_WORKSPACE.appSlug || appSlug === 'amarktai'
}

export function isExternalManagedAppSlug(appSlug?: string | null): boolean {
  return Boolean(appSlug && !isRootWorkspaceAppSlug(appSlug))
}

export function getCapabilityGovernance(capability: GovernedCapability): CapabilityGovernance {
  const route = capabilityRoutes[capability]
  const owner = ownership[capability]
  const blocker =
    capability === 'adult_video'
      ? 'Adult video is blocked until a real provider route, provider policy approval, safeguards, artifact handling, and live test exist.'
      : capability === 'adult_voice'
        ? 'Adult voice is blocked until a real provider route, provider policy approval, safeguards, artifact handling, and live test exist.'
        : route.status === 'available_not_wired'
          ? 'Provider capability exists in the audit, but no production Studio route is wired.'
          : undefined
  return {
    capability,
    label: capability.replace(/_/g, ' '),
    primaryProvider: owner.primaryProvider,
    fallbackProviders: owner.fallbackProviders,
    route: route.route,
    routeExists: route.routeExists,
    requiredEnv: route.requiredEnv,
    execution: route.execution,
    polling: route.polling,
    artifacts: route.artifacts,
    dashboardVisible: route.dashboardVisible,
    status: route.status,
    blocker,
    notes: owner.notes,
  }
}

export function getCapabilityGovernanceMatrix(): {
  rootWorkspace: RootWorkspaceIdentity
  providers: ProviderGovernance[]
  capabilities: CapabilityGovernance[]
  models: GovernedModel[]
  routePresentNotApprovedProviders: ProviderGovernance[]
  blockedCapabilities: CapabilityGovernance[]
  workbenchModels: GovernedModel[]
  studioModelsByCapability: Record<GovernedCapability, GovernedModel[]>
  underusedCapabilities: GovernedModel[]
} {
  const capabilities = (Object.keys(capabilityRoutes) as GovernedCapability[]).map(getCapabilityGovernance)
  const studioModelsByCapability = capabilities.reduce((acc, entry) => {
    acc[entry.capability] = getModelsForCapability(entry.capability)
    return acc
  }, {} as Record<GovernedCapability, GovernedModel[]>)
  return {
    rootWorkspace: ROOT_WORKSPACE,
    providers: PROVIDER_GOVERNANCE,
    capabilities,
    models: GOVERNED_MODELS,
    routePresentNotApprovedProviders: ROUTE_PRESENT_NOT_APPROVED_PROVIDERS,
    blockedCapabilities: capabilities.filter((capability) => capability.status === 'blocked'),
    workbenchModels: getWorkbenchGovernanceModels(),
    studioModelsByCapability,
    underusedCapabilities: GOVERNED_MODELS.filter((model) => model.status === 'available_not_wired'),
  }
}

export function getModelsForCapability(
  capability: GovernedCapability | string,
  options: { includeNotWired?: boolean; includeBlocked?: boolean; provider?: string | null } = {},
): GovernedModel[] {
  const normalized = typeof capability === 'string' ? normalizeGovernedCapability(capability) : capability
  if (!normalized) return []
  return GOVERNED_MODELS.filter((model) => {
    if (options.provider && options.provider !== 'auto' && model.provider !== options.provider) return false
    if (!model.capabilities.includes(normalized)) return false
    if (!options.includeNotWired && model.status === 'available_not_wired') return false
    if (!options.includeBlocked && (model.status === 'blocked' || normalized === 'adult_video' || normalized === 'adult_voice')) return false
    return model.approved && model.routePresent
  })
}

export function getWorkbenchGovernanceModels(): GovernedModel[] {
  const seen = new Set<string>()
  return GOVERNED_MODELS.filter((model) => {
    const workbenchCapable = model.capabilities.includes('coding') || model.capabilities.includes('reasoning')
    const mediaOnly = model.capabilities.some((capability) =>
      ['image_generation', 'image_editing', 'image_to_video', 'video_generation', 'music_generation', 'tts', 'stt', 'voice_selection'].includes(capability),
    )
    const key = `${model.provider}:${model.modelId}`
    if (!workbenchCapable || mediaOnly || seen.has(key) || model.status === 'available_not_wired') return false
    seen.add(key)
    return model.approved
  })
}

export function validateCapabilitySelection(input: CapabilityValidationInput): CapabilityValidationResult {
  const capability = normalizeGovernedCapability(input.capability)
  if (!capability) {
    return { allowed: false, capability: null, reason: `Unknown capability: ${input.capability}`, blockers: ['unknown_capability'] }
  }
  if (capability === 'adult_video' || capability === 'adult_voice') {
    return {
      allowed: false,
      capability,
      reason: getCapabilityGovernance(capability).blocker ?? `${capability} is blocked.`,
      blockers: [capability],
    }
  }
  if ((capability === 'adult_text' || capability === 'adult_image') && input.adultPolicyAllows === false) {
    return {
      allowed: false,
      capability,
      reason: 'Adult capability is disabled by root workspace policy.',
      blockers: ['adult_policy_disabled'],
    }
  }
  if (input.budgetAllows === false) {
    return { allowed: false, capability, reason: 'Budget policy blocks this capability.', blockers: ['budget_blocked'] }
  }
  const governance = getCapabilityGovernance(capability)
  if (!governance.routeExists || !governance.route) {
    return {
      allowed: false,
      capability,
      reason: governance.blocker ?? `${governance.label} has no production route wired.`,
      blockers: ['missing_route'],
    }
  }
  const provider = input.provider && input.provider !== 'auto' ? (input.provider as GovernedProviderKey) : null
  if (provider && !PROVIDER_GOVERNANCE.some((entry) => entry.provider === provider && entry.approved)) {
    return {
      allowed: false,
      capability,
      provider,
      reason: `${provider} is route-present or unknown, but not approved for direct execution.`,
      blockers: ['provider_not_approved'],
    }
  }
  const models = getModelsForCapability(capability, { provider, includeNotWired: false })
  if (provider && models.length === 0) {
    return {
      allowed: false,
      capability,
      provider,
      reason: `${providerLabels[provider] ?? provider} has no executable ${governance.label} model in governance.`,
      blockers: ['provider_capability_mismatch'],
    }
  }
  const model = input.modelId && input.modelId !== 'auto'
    ? GOVERNED_MODELS.find((entry) => entry.modelId === input.modelId && (!provider || entry.provider === provider))
    : models[0]
  if (input.modelId && input.modelId !== 'auto') {
    if (!model) {
      return { allowed: false, capability, provider: provider ?? undefined, reason: `Model ${input.modelId} is not in governance.`, blockers: ['model_unknown'] }
    }
    if (!model.capabilities.includes(capability)) {
      return {
        allowed: false,
        capability,
        provider: model.provider,
        model,
        reason: `${model.modelId} does not support ${governance.label}.`,
        blockers: ['model_capability_mismatch'],
      }
    }
    if (model.status === 'available_not_wired') {
      return {
        allowed: false,
        capability,
        provider: model.provider,
        model,
        reason: `${model.modelId} is available in provider capability research but no production route is wired.`,
        blockers: ['route_not_wired'],
      }
    }
  }
  if (input.productionMode) {
    return {
      allowed: false,
      capability,
      provider: model?.provider ?? provider ?? undefined,
      model,
      reason: 'Production mode requires live provider tests before marking capability connected.',
      blockers: ['live_test_required'],
    }
  }
  return {
    allowed: true,
    capability,
    provider: model?.provider ?? provider ?? undefined,
    model,
    reason: model
      ? `${providerLabels[model.provider]} ${model.modelId} is valid for ${governance.label}.`
      : `${governance.label} can be routed automatically.`,
    blockers: [],
  }
}
