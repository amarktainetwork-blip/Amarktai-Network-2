/**
 * @module ai-provider-governance
 * @description Canonical provider governance manifest for Amarktai Network.
 *
 * This file answers: which providers do we actually want, which are core,
 * which are optional, which are advanced-only, and which should not appear in
 * primary setup until Graeme explicitly approves them.
 *
 * Do not scatter provider lists across runtime truth, routing, settings, and UI.
 */

export type ProviderGovernanceStatus =
  | 'core'
  | 'active_optional'
  | 'advanced_optional'
  | 'deprecated'
  | 'proposed'

/**
 * Where this provider appears in the Settings UI.
 *
 * primary    — Main AI provider setup panel (always visible)
 * specialist — Specialist media / voice providers (always visible)
 * advanced   — Collapsed "Advanced providers" section
 * hidden     — Deprecated; never shown in primary product UI
 * backlog    — Post-launch candidate; in audit doc only
 */
export type ProviderSetupGroup =
  | 'primary'
  | 'specialist'
  | 'advanced'
  | 'hidden'
  | 'backlog'

export type ProviderCapability =
  | 'gateway'
  | 'chat'
  | 'creative'
  | 'reasoning'
  | 'coding'
  | 'image_generation'
  | 'video_generation'
  | 'voice_tts'
  | 'voice_stt'
  | 'music_generation'
  | 'embeddings'
  | 'reranking'
  | 'research'
  | 'crawler'
  | 'adult_text'
  | 'adult_image'
  | 'deployment'
  | 'memory'
  | 'repo'

export interface ProviderGovernanceEntry {
  key: string
  displayName: string
  integrationKey: string
  envVar: string
  /** Accepted env var aliases for this provider (first accepted wins). */
  envVarAliases?: string[]
  status: ProviderGovernanceStatus
  /** Where this provider appears in the Settings/Setup UI. */
  setupGroup: ProviderSetupGroup
  reason: string
  capabilities: ProviderCapability[]
  coveredByGenX: boolean
  wired: boolean
  /** @deprecated Use setupGroup instead. Kept for backwards compat. */
  showInPrimarySetup: boolean
  defaultCostRole: 'gateway' | 'free_first' | 'cheap' | 'balanced' | 'premium' | 'specialist' | 'ops' | 'deprecated'
  notes?: string
}

/**
 * Core/active providers for the current app.
 *
 * Rules:
 * - GenX is the gateway, but it must not hide direct model choice.
 * - Every connected app chooses its own provider/model package.
 * - Qwen, MiniMax/Mimo, DeepSeek, Gemini, HuggingFace, Groq and Together are
 *   first-class direct AI routes.
 * - Hugging Face supports any model ID through Inference Providers and any
 *   dedicated endpoint URL through Inference Endpoints.
 * - Experimental providers stay proposed until their API route and safety/cost
 *   behaviour are verified.
 */
export const AI_PROVIDER_GOVERNANCE: readonly ProviderGovernanceEntry[] = [
  {
    key: 'genx',
    displayName: 'GenX Gateway',
    integrationKey: 'genx',
    envVar: 'GENX_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Primary AI gateway and model router. Gateway infrastructure only — not the public product story. Aiva and Amarktai Network are the product story.',
    capabilities: ['gateway', 'chat', 'creative', 'reasoning', 'coding', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt', 'music_generation', 'embeddings', 'research'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'gateway',
    notes: 'GenX is gateway infrastructure only. Do not expose as the primary product story.',
  },
  {
    key: 'github',
    displayName: 'GitHub',
    integrationKey: 'github',
    envVar: 'GITHUB_TOKEN',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Required for simple Repo Workbench prompt-to-PR flow.',
    capabilities: ['repo', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
  },
  {
    key: 'qwen',
    displayName: 'Qwen / DashScope',
    integrationKey: 'qwen',
    envVar: 'DASHSCOPE_API_KEY',
    envVarAliases: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    status: 'core',
    setupGroup: 'primary',
    reason: 'Cheap, strong multilingual/chat/coding backbone with Qwen/Wanx/Qwen-Omni style multimodal routes.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt', 'embeddings'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
    notes: 'Accepts QWEN_API_KEY or DASHSCOPE_API_KEY (alias: dashscope → qwen).',
  },
  {
    key: 'minimax',
    displayName: 'MiniMax / Mimo',
    integrationKey: 'minimax',
    envVar: 'MINIMAX_API_KEY',
    envVarAliases: ['MINIMAX_API_KEY', 'MIMO_API_KEY'],
    status: 'core',
    setupGroup: 'primary',
    reason: 'Full-stack low-cost multimodal provider for text, speech, video, image. Mimo is an alias for MiniMax.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
    notes: 'Accepts MINIMAX_API_KEY or MIMO_API_KEY (alias: mimo → minimax). Music generation is post-launch.',
  },
  {
    key: 'deepseek',
    displayName: 'DeepSeek',
    integrationKey: 'deepseek',
    envVar: 'DEEPSEEK_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Very low-cost reasoning/coding/chat backbone.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
  },
  {
    key: 'gemini',
    displayName: 'Google Gemini',
    integrationKey: 'gemini',
    envVar: 'GEMINI_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Multimodal reasoning, vision, research, long-context and voice/media support where available.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt', 'embeddings', 'research'],
    coveredByGenX: true,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'balanced',
  },
  {
    key: 'huggingface',
    displayName: 'Hugging Face',
    integrationKey: 'huggingface',
    envVar: 'HUGGINGFACE_API_KEY',
    envVarAliases: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    status: 'core',
    setupGroup: 'primary',
    reason: 'Universal model layer: Inference Providers for serverless models and Inference Endpoints for dedicated private endpoints.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt', 'embeddings', 'adult_image'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'free_first',
    notes: 'Accepts HUGGINGFACE_API_KEY, HUGGINGFACEHUB_API_TOKEN, or HF_TOKEN (alias: hf → huggingface). Supports any HF model ID and optional dedicated endpoint URL.',
  },
  {
    key: 'groq',
    displayName: 'Groq',
    integrationKey: 'groq',
    envVar: 'GROQ_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Fast low-cost inference for chat, routing, coding assistance and TTS where available.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'voice_tts'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
  },
  {
    key: 'together',
    displayName: 'Together AI',
    integrationKey: 'together',
    envVar: 'TOGETHER_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Cheap open-model route and specialist image/adult-safe provider option when explicitly enabled.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'adult_text', 'adult_image'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
  },
  {
    key: 'firecrawl',
    displayName: 'Firecrawl',
    integrationKey: 'firecrawl',
    envVar: 'FIRECRAWL_API_KEY',
    status: 'core',
    setupGroup: 'primary',
    reason: 'Website crawling and app onboarding intelligence. Required for scraping an app site and building an agent profile.',
    capabilities: ['crawler', 'research'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
  },
  {
    key: 'mem0',
    displayName: 'Mem0',
    integrationKey: 'mem0',
    envVar: 'MEM0_API_KEY',
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Long-term app/agent memory provider.',
    capabilities: ['memory'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
  },
  {
    key: 'webdock',
    displayName: 'Webdock',
    integrationKey: 'webdock',
    envVar: 'WEBDOCK_API_KEY',
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'VPS/server ops telemetry and future deploy integration.',
    capabilities: ['deployment'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
  },
  // ── Specialist providers (always visible, media/voice focus) ──────────────
  {
    key: 'replicate',
    displayName: 'Replicate',
    integrationKey: 'replicate',
    envVar: 'REPLICATE_API_KEY',
    envVarAliases: ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY'],
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'Image/video/audio fallback and specialist media/adult provider option.',
    capabilities: ['image_generation', 'video_generation', 'adult_image'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'specialist',
    notes: 'Accepts REPLICATE_API_TOKEN or REPLICATE_API_KEY.',
  },
  {
    key: 'elevenlabs',
    displayName: 'ElevenLabs',
    integrationKey: 'elevenlabs',
    envVar: 'ELEVENLABS_API_KEY',
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'Specialist premium voice fallback for Aiva and future apps.',
    capabilities: ['voice_tts'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'specialist',
  },
  {
    key: 'deepgram',
    displayName: 'Deepgram',
    integrationKey: 'deepgram',
    envVar: 'DEEPGRAM_API_KEY',
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'STT/TTS fallback for voice conversations.',
    capabilities: ['voice_stt', 'voice_tts'],
    coveredByGenX: true,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'specialist',
  },
  // ── Advanced providers (collapsed in UI, not primary product story) ─────────
  {
    key: 'openai',
    displayName: 'OpenAI Direct',
    integrationKey: 'openai',
    envVar: 'OPENAI_API_KEY',
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Premium direct fallback when GenX is unavailable or explicit direct route is required.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'image_generation', 'voice_tts', 'embeddings'],
    coveredByGenX: true,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'premium',
    notes: 'Covered by GenX for most use cases. Keep direct key advanced-only.',
  },
  {
    key: 'openrouter',
    displayName: 'OpenRouter',
    integrationKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Aggregator fallback for model access when direct providers are unavailable.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
  },
  {
    key: 'xai',
    displayName: 'xAI / Grok',
    integrationKey: 'xai',
    envVar: 'XAI_API_KEY',
    envVarAliases: ['XAI_API_KEY', 'GROK_API_KEY'],
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Premium Grok fallback and possible specialist adult-safe provider when explicitly approved.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'voice_tts', 'adult_text', 'adult_image'],
    coveredByGenX: true,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'premium',
    notes: 'Accepts XAI_API_KEY or GROK_API_KEY (alias: grok → xai).',
  },
  {
    key: 'moonshot',
    displayName: 'Moonshot / Kimi',
    integrationKey: 'moonshot',
    envVar: 'MOONSHOT_API_KEY',
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Long-context, coding, multimodal Kimi model route for massive datasets, leads and visual-to-code work.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding', 'research'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
  },
  {
    key: 'zhipu',
    displayName: 'Zhipu AI / GLM',
    integrationKey: 'zhipu',
    envVar: 'ZHIPU_API_KEY',
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Agentic GLM route for coding, reasoning and long-running agent tasks.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
  },
  // ── Hidden providers (deprecated — never shown in primary product UI) ────────
  {
    key: 'cohere',
    displayName: 'Cohere',
    integrationKey: 'cohere',
    envVar: 'COHERE_API_KEY',
    status: 'deprecated',
    setupGroup: 'hidden',
    reason: 'Not needed in the primary stack unless we specifically need Cohere rerank later.',
    capabilities: ['embeddings', 'reranking'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'deprecated',
  },
  {
    key: 'mistral',
    displayName: 'Mistral Direct',
    integrationKey: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    status: 'deprecated',
    setupGroup: 'hidden',
    reason: 'Mistral-class models are available through GenX/HuggingFace/OpenRouter-style routes; direct key is not primary.',
    capabilities: ['chat', 'coding'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'deprecated',
  },
  // ── Backlog providers (proposed, post-launch only) ────────────────────────────
  {
    key: 'suno',
    displayName: 'Suno',
    integrationKey: 'suno',
    envVar: 'SUNO_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Music generation candidate. Only add when music becomes a priority and API/legal terms are confirmed.',
    capabilities: ['music_generation'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'udio',
    displayName: 'Udio',
    integrationKey: 'udio',
    envVar: 'UDIO_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Music generation candidate. Keep out of primary setup until approved.',
    capabilities: ['music_generation'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
]

export const PROPOSED_PROVIDER_BACKLOG: readonly ProviderGovernanceEntry[] = [
  {
    key: 'perplexity',
    displayName: 'Perplexity',
    integrationKey: 'perplexity',
    envVar: 'PERPLEXITY_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Research/search-answer provider candidate if Firecrawl + GenX research is insufficient.',
    capabilities: ['research'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'tavily',
    displayName: 'Tavily',
    integrationKey: 'tavily',
    envVar: 'TAVILY_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Search/research API candidate for travel/news/current data apps.',
    capabilities: ['research'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'jina',
    displayName: 'Jina AI',
    integrationKey: 'jina',
    envVar: 'JINA_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Embeddings/reranking/search candidate for RAG-heavy apps.',
    capabilities: ['embeddings', 'reranking', 'research'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'runpod',
    displayName: 'RunPod',
    integrationKey: 'runpod',
    envVar: 'RUNPOD_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Self-host/specialist image/adult/media route candidate when we need full control.',
    capabilities: ['image_generation', 'video_generation', 'adult_image'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'fal',
    displayName: 'fal.ai',
    integrationKey: 'fal',
    envVar: 'FAL_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Fast image/video generation provider candidate for Media Studio.',
    capabilities: ['image_generation', 'video_generation', 'voice_stt'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
  },
  {
    key: 'fireworks',
    displayName: 'Fireworks AI',
    integrationKey: 'fireworks',
    envVar: 'FIREWORKS_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Low-cost open-model inference candidate if Qwen/Groq/Together are insufficient.',
    capabilities: ['chat', 'creative', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'cheap',
  },
  {
    key: 'cerebras',
    displayName: 'Cerebras',
    integrationKey: 'cerebras',
    envVar: 'CEREBRAS_API_KEY',
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Ultra-fast inference candidate for chat and coding if needed.',
    capabilities: ['chat', 'coding', 'reasoning'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'cheap',
  },
]

export function getProviderEnvMap(): Record<string, string> {
  return Object.fromEntries(AI_PROVIDER_GOVERNANCE.map((entry) => [entry.integrationKey, entry.envVar]))
}

export function getRuntimeProviderGovernance(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.status !== 'proposed' && entry.setupGroup !== 'backlog')
}

/** Primary AI providers shown always in the Settings panel. */
export function getPrimarySetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'primary')
}

/** Specialist media/voice providers shown always in the Settings panel. */
export function getSpecialistSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'specialist')
}

/** Advanced providers — collapsed behind the "Advanced providers" toggle. */
export function getAdvancedSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'advanced')
}

/** Hidden/deprecated providers — never shown in primary product UI. */
export function getHiddenProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'hidden')
}

/**
 * Post-launch backlog providers — in audit docs only, never shown in the UI.
 * Includes entries from both the main governance list and the backlog array.
 */
export function getBacklogProviders(): ProviderGovernanceEntry[] {
  const fromMain = AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'backlog')
  return [...fromMain, ...PROPOSED_PROVIDER_BACKLOG]
}

export function getProviderGovernanceByKey(key: string): ProviderGovernanceEntry | undefined {
  return AI_PROVIDER_GOVERNANCE.find((entry) => entry.key === key || entry.integrationKey === key)
    ?? PROPOSED_PROVIDER_BACKLOG.find((entry) => entry.key === key || entry.integrationKey === key)
}

export function getWiredProviderKeys(): Set<string> {
  return new Set(AI_PROVIDER_GOVERNANCE.filter((entry) => entry.wired).map((entry) => entry.key))
}

export function getGenXCoveredProviderKeys(): Set<string> {
  return new Set(AI_PROVIDER_GOVERNANCE.filter((entry) => entry.coveredByGenX).map((entry) => entry.key))
}

export function getAdultSpecialistProviderKeys(): Set<string> {
  return new Set(
    AI_PROVIDER_GOVERNANCE
      .filter((entry) => entry.capabilities.includes('adult_image') || entry.capabilities.includes('adult_text'))
      .map((entry) => entry.key),
  )
}
