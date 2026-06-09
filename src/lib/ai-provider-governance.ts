import { PROVIDER_MESH } from '@/lib/provider-mesh'

export type ProviderGovernanceStatus =
  | 'core'
  | 'active_optional'
  | 'advanced_optional'
  | 'deprecated'
  | 'proposed'

export type ProviderSetupGroup = 'primary' | 'specialist' | 'advanced' | 'hidden' | 'backlog'

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
  envVarAliases?: string[]
  status: ProviderGovernanceStatus
  setupGroup: ProviderSetupGroup
  reason: string
  capabilities: ProviderCapability[]
  coveredByGenX: boolean
  wired: boolean
  showInPrimarySetup: boolean
  defaultCostRole: 'gateway' | 'free_first' | 'cheap' | 'balanced' | 'premium' | 'specialist' | 'ops' | 'deprecated'
  notes?: string
}

function governanceCapabilities(capabilities: readonly string[]): ProviderCapability[] {
  const mapped = new Set<ProviderCapability>()

  for (const capability of capabilities) {
    if (capability === 'text' || capability === 'streaming_text') mapped.add('chat')
    if (capability === 'reasoning') mapped.add('reasoning')
    if (capability === 'code') mapped.add('coding')
    if (capability === 'vision') mapped.add('reasoning')
    if (capability === 'image') mapped.add('image_generation')
    if (capability === 'video' || capability === 'image_to_video' || capability === 'avatar' || capability === 'lip_sync') mapped.add('video_generation')
    if (capability === 'tts') mapped.add('voice_tts')
    if (capability === 'stt') mapped.add('voice_stt')
    if (capability === 'music' || capability === 'audio') mapped.add('music_generation')
    if (capability === 'embeddings') mapped.add('embeddings')
    if (capability === 'rerank') mapped.add('reranking')
    if (capability === 'web_search') mapped.add('research')
    if (capability === 'crawl' || capability === 'render') mapped.add('crawler')
    if (capability === 'repo' || capability === 'pull_request') mapped.add('repo')
    if (capability === 'storage' || capability === 'queue' || capability === 'vector_store') mapped.add('memory')
  }

  return [...mapped]
}

function entry(input: ProviderGovernanceEntry): ProviderGovernanceEntry {
  return input
}

const MESH_OVERRIDES: Record<string, Partial<ProviderGovernanceEntry>> = {
  genx: {
    status: 'core',
    setupGroup: 'primary',
    reason: 'Core premium execution backbone already wired through GenX routes.',
    showInPrimarySetup: true,
    defaultCostRole: 'gateway',
    notes: 'Primary managed execution layer. NVIDIA is deferred as a post-launch upgrade.',
  },
  github: {
    setupGroup: 'primary',
    reason: 'Required for repo workbench, branches, commits, pull requests, and deploy workflows.',
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
    notes: 'Configured through GITHUB_PAT or GITHUB_TOKEN. CLI gh auth is also supported on the VPS.',
  },
  qwen: {
    setupGroup: 'primary',
    reason: 'Primary open-source-friendly reasoning, coding, image/video/voice, and DashScope media route.',
    showInPrimarySetup: true,
    defaultCostRole: 'balanced',
    envVarAliases: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    notes: 'Qwen supports the DASHSCOPE_API_KEY alias. DashScope resolves to qwen in provider-config.',
  },
  mimo: {
    setupGroup: 'primary',
    reason: 'Xiaomi MiMo is the long-context planner/validator/voice provider route.',
    showInPrimarySetup: true,
    defaultCostRole: 'balanced',
    envVarAliases: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
    notes: 'Xiaomi MiMo is configured separately from MiniMax. MiniMax compatibility uses MINIMAX_API_KEY.',
  },
  huggingface: {
    setupGroup: 'primary',
    reason: 'Open-source model universe and fallback layer for text, image, video, speech, embeddings, and rerank.',
    showInPrimarySetup: true,
    defaultCostRole: 'free_first',
    envVarAliases: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    notes: 'HuggingFace accepts HUGGINGFACE_API_KEY, HUGGINGFACEHUB_API_TOKEN, and HF_TOKEN aliases.',
  },
  groq: {
    setupGroup: 'primary',
    reason: 'Fast low-latency text, coding triage, and STT/TTS route.',
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
  },
  together: {
    setupGroup: 'primary',
    reason: 'Low-cost open model fallback for text, image, embeddings, rerank, and adult-safe specialist routes.',
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
  },
  'local-crawler': {
    setupGroup: 'primary',
    reason: 'Local crawler/research runtime needed for app intelligence and research jobs.',
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
  },
}

const meshGovernance = PROVIDER_MESH.map((node) => {
  const base: ProviderGovernanceEntry = {
    key: node.id,
    displayName: node.displayName,
    integrationKey: node.id,
    envVar: node.envAliases[0] ?? '',
    envVarAliases: [...node.envAliases],
    status: node.id === 'genx' ? 'core' : node.optional ? 'active_optional' : 'advanced_optional',
    setupGroup: node.kind === 'provider' ? 'primary' : 'advanced',
    reason: 'Approved by the canonical provider mesh.',
    capabilities: governanceCapabilities(node.capabilities),
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: node.kind === 'provider',
    defaultCostRole: node.id === 'genx' ? 'gateway' : node.kind === 'provider' ? 'specialist' : 'ops',
    notes: 'Compatibility metadata generated from provider-mesh.ts.',
  }

  const override = MESH_OVERRIDES[node.id] ?? {}

  return {
    ...base,
    ...override,
    envVarAliases: override.envVarAliases ?? base.envVarAliases,
    capabilities: override.capabilities ?? base.capabilities,
  }
})

const extraGovernance: ProviderGovernanceEntry[] = [
  entry({
    key: 'minimax',
    displayName: 'MiniMax',
    integrationKey: 'minimax',
    envVar: 'MINIMAX_API_KEY',
    envVarAliases: ['MINIMAX_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Primary compatible route for MiniMax media, voice, and app AI where available.',
    capabilities: ['chat', 'reasoning', 'creative', 'image_generation', 'video_generation', 'voice_tts', 'voice_stt'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'balanced',
    notes: 'MiniMax is configured with MINIMAX_API_KEY. Xiaomi MiMo is configured separately with MIMO_API_KEY.',
  }),
  entry({
    key: 'deepseek',
    displayName: 'DeepSeek',
    integrationKey: 'deepseek',
    envVar: 'DEEPSEEK_API_KEY',
    envVarAliases: ['DEEPSEEK_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Open reasoning and coding provider kept available for source-of-truth routing.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'cheap',
    notes: 'Configured through DEEPSEEK_API_KEY.',
  }),
  entry({
    key: 'gemini',
    displayName: 'Google Gemini',
    integrationKey: 'gemini',
    envVar: 'GEMINI_API_KEY',
    envVarAliases: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Multimodal research, video planning, and text provider route.',
    capabilities: ['chat', 'reasoning', 'creative', 'video_generation', 'voice_stt', 'research'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'balanced',
    notes: 'Configured through GEMINI_API_KEY or GOOGLE_API_KEY.',
  }),
  entry({
    key: 'mem0',
    displayName: 'Mem0',
    integrationKey: 'mem0',
    envVar: 'MEM0_API_KEY',
    envVarAliases: ['MEM0_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Memory provider for persistent app/user learning.',
    capabilities: ['memory'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
    notes: 'Optional managed memory provider. Local memory remains available.',
  }),
  entry({
    key: 'webdock',
    displayName: 'Webdock',
    integrationKey: 'webdock',
    envVar: 'WEBDOCK_API_TOKEN',
    envVarAliases: ['WEBDOCK_API_TOKEN', 'WEBDOCK_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Deployment and VPS operations provider.',
    capabilities: ['deployment'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
    notes: 'Configured through WEBDOCK_API_TOKEN or WEBDOCK_API_KEY.',
  }),
  entry({
    key: 'replicate',
    displayName: 'Replicate',
    integrationKey: 'replicate',
    envVar: 'REPLICATE_API_TOKEN',
    envVarAliases: ['REPLICATE_API_TOKEN', 'REPLICATE_API_KEY'],
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'Specialist media/adult-safe model provider.',
    capabilities: ['image_generation', 'video_generation', 'voice_tts', 'adult_image'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Configured through REPLICATE_API_TOKEN, with REPLICATE_API_KEY as fallback alias.',
  }),
  entry({
    key: 'elevenlabs',
    displayName: 'ElevenLabs',
    integrationKey: 'elevenlabs',
    envVar: 'ELEVENLABS_API_KEY',
    envVarAliases: ['ELEVENLABS_API_KEY'],
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'Specialist voice/TTS provider.',
    capabilities: ['voice_tts'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Configured through ELEVENLABS_API_KEY.',
  }),
  entry({
    key: 'deepgram',
    displayName: 'Deepgram',
    integrationKey: 'deepgram',
    envVar: 'DEEPGRAM_API_KEY',
    envVarAliases: ['DEEPGRAM_API_KEY'],
    status: 'active_optional',
    setupGroup: 'specialist',
    reason: 'Specialist STT/transcription provider.',
    capabilities: ['voice_stt'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Configured through DEEPGRAM_API_KEY.',
  }),
  entry({
    key: 'openrouter',
    displayName: 'OpenRouter',
    integrationKey: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    envVarAliases: ['OPENROUTER_API_KEY'],
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Advanced routing provider kept out of primary setup.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Advanced only.',
  }),
  entry({
    key: 'xai',
    displayName: 'xAI / Grok',
    integrationKey: 'xai',
    envVar: 'XAI_API_KEY',
    envVarAliases: ['XAI_API_KEY', 'GROK_API_KEY'],
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Advanced routing/adult-specialist compatible provider.',
    capabilities: ['chat', 'reasoning', 'creative', 'adult_text', 'adult_image'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Grok resolves to xAI. Supports XAI_API_KEY and GROK_API_KEY aliases.',
  }),
  entry({
    key: 'moonshot',
    displayName: 'Moonshot / Kimi',
    integrationKey: 'moonshot',
    envVar: 'MOONSHOT_API_KEY',
    envVarAliases: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Advanced long-context/provider route.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Advanced only.',
  }),
  entry({
    key: 'zhipu',
    displayName: 'Zhipu AI',
    integrationKey: 'zhipu',
    envVar: 'ZHIPU_API_KEY',
    envVarAliases: ['ZHIPU_API_KEY'],
    status: 'advanced_optional',
    setupGroup: 'advanced',
    reason: 'Advanced optional model provider.',
    capabilities: ['chat', 'reasoning'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Advanced only.',
  }),
  entry({
    key: 'cohere',
    displayName: 'Cohere',
    integrationKey: 'cohere',
    envVar: 'COHERE_API_KEY',
    envVarAliases: ['COHERE_API_KEY'],
    status: 'deprecated',
    setupGroup: 'hidden',
    reason: 'Hidden/deprecated provider retained only for compatibility.',
    capabilities: ['chat', 'embeddings', 'reranking'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'deprecated',
    notes: 'Hidden compatibility entry.',
  }),
  entry({
    key: 'mistral',
    displayName: 'Mistral',
    integrationKey: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    envVarAliases: ['MISTRAL_API_KEY'],
    status: 'deprecated',
    setupGroup: 'hidden',
    reason: 'Hidden/deprecated provider retained only for compatibility.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'deprecated',
    notes: 'Hidden compatibility entry.',
  }),
  entry({
    key: 'suno',
    displayName: 'Suno',
    integrationKey: 'suno',
    envVar: 'SUNO_API_KEY',
    envVarAliases: ['SUNO_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog music provider. NVIDIA is also deferred post-launch.',
    capabilities: ['music_generation'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only. Do not expose as active runtime provider.',
  }),
  entry({
    key: 'udio',
    displayName: 'Udio',
    integrationKey: 'udio',
    envVar: 'UDIO_API_KEY',
    envVarAliases: ['UDIO_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog music provider.',
    capabilities: ['music_generation'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only. Do not expose as active runtime provider.',
  }),
]

export const PROPOSED_PROVIDER_BACKLOG: readonly ProviderGovernanceEntry[] = [
  entry({
    key: 'perplexity',
    displayName: 'Perplexity',
    integrationKey: 'perplexity',
    envVar: 'PERPLEXITY_API_KEY',
    envVarAliases: ['PERPLEXITY_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog research provider.',
    capabilities: ['research'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'tavily',
    displayName: 'Tavily',
    integrationKey: 'tavily',
    envVar: 'TAVILY_API_KEY',
    envVarAliases: ['TAVILY_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog search/research provider.',
    capabilities: ['research', 'crawler'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'jina',
    displayName: 'Jina AI',
    integrationKey: 'jina',
    envVar: 'JINA_API_KEY',
    envVarAliases: ['JINA_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog embeddings/rerank/research provider.',
    capabilities: ['embeddings', 'reranking', 'research'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'runpod',
    displayName: 'RunPod',
    integrationKey: 'runpod',
    envVar: 'RUNPOD_API_KEY',
    envVarAliases: ['RUNPOD_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog GPU/runtime provider.',
    capabilities: ['deployment'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'ops',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'fal',
    displayName: 'fal.ai',
    integrationKey: 'fal',
    envVar: 'FAL_KEY',
    envVarAliases: ['FAL_KEY', 'FAL_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog media provider.',
    capabilities: ['image_generation', 'video_generation'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'specialist',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'fireworks',
    displayName: 'Fireworks AI',
    integrationKey: 'fireworks',
    envVar: 'FIREWORKS_API_KEY',
    envVarAliases: ['FIREWORKS_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog open model provider.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Backlog only.',
  }),
  entry({
    key: 'cerebras',
    displayName: 'Cerebras',
    integrationKey: 'cerebras',
    envVar: 'CEREBRAS_API_KEY',
    envVarAliases: ['CEREBRAS_API_KEY'],
    status: 'proposed',
    setupGroup: 'backlog',
    reason: 'Backlog fast inference provider.',
    capabilities: ['chat', 'reasoning', 'coding'],
    coveredByGenX: false,
    wired: false,
    showInPrimarySetup: false,
    defaultCostRole: 'balanced',
    notes: 'Backlog only.',
  }),
]

const explicitKeys = new Set(extraGovernance.map((entry) => entry.key))
const mergedMeshGovernance = meshGovernance.map((entry) => {
  const explicit = extraGovernance.find((item) => item.key === entry.key)
  return explicit ? { ...entry, ...explicit } : entry
})

export const AI_PROVIDER_GOVERNANCE: readonly ProviderGovernanceEntry[] = [
  ...mergedMeshGovernance,
  ...extraGovernance.filter((entry) => !explicitKeys.has(entry.key) || !PROVIDER_MESH.some((node) => node.id === entry.key)),
]

export function getProviderEnvMap(): Record<string, string> {
  return Object.fromEntries(AI_PROVIDER_GOVERNANCE.map((entry) => [entry.key, entry.envVar]))
}

export function getRuntimeProviderGovernance(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) =>
    entry.setupGroup === 'primary' || entry.setupGroup === 'specialist',
  )
}

export function getPrimarySetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'primary')
}

export function getSpecialistSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'specialist')
}

export function getAdvancedSetupProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'advanced')
}

export function getHiddenProviders(): ProviderGovernanceEntry[] {
  return AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'hidden')
}

export function getBacklogProviders(): ProviderGovernanceEntry[] {
  return [
    ...AI_PROVIDER_GOVERNANCE.filter((entry) => entry.setupGroup === 'backlog'),
    ...PROPOSED_PROVIDER_BACKLOG,
  ]
}

export function getProviderGovernanceByKey(key: string): ProviderGovernanceEntry | undefined {
  return AI_PROVIDER_GOVERNANCE.find((entry) =>
    entry.key === key ||
    entry.integrationKey === key ||
    entry.envVarAliases?.includes(key),
  )
}

export function getWiredProviderKeys(): Set<string> {
  return new Set(AI_PROVIDER_GOVERNANCE.filter((entry) => entry.wired).map((entry) => entry.key))
}

export function getGenXCoveredProviderKeys(): Set<string> {
  return new Set()
}

export function getAdultSpecialistProviderKeys(): Set<string> {
  return new Set(['genx', 'huggingface', 'together', 'replicate', 'xai'])
}
