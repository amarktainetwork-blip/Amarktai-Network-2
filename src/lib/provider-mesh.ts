export type ProviderCapability =
  | 'text'
  | 'streaming_text'
  | 'reasoning'
  | 'code'
  | 'vision'
  | 'embeddings'
  | 'rerank'
  | 'image'
  | 'video'
  | 'image_to_video'
  | 'avatar'
  | 'music'
  | 'audio'
  | 'tts'
  | 'stt'
  | 'files'
  | 'sessions'
  | 'async_jobs'
  | 'tools'
  | 'web_search'
  | 'repo'
  | 'pull_request'
  | 'queue'
  | 'vector_store'
  | 'crawl'
  | 'render'
  | 'storage'
  | 'email'
  | 'lip_sync'

export type ProviderMeshId =
  | 'genx'
  | 'huggingface'
  | 'qwen'
  | 'mimo'
  | 'groq'
  | 'together'
  | 'github'
  | 'redis'
  | 'qdrant'
  | 'local-crawler'
  | 'playwright'
  | 'scrapy'
  | 'trafilatura'
  | 'ffmpeg'
  | 'storage'
  | 'smtp'

export type ProviderMeshNode = {
  id: ProviderMeshId
  displayName: string
  kind: 'provider' | 'tool' | 'storage'
  envAliases: readonly string[]
  baseUrl: string
  authMethod: string
  capabilities: readonly ProviderCapability[]
  testRoute: string
  normalUserVisible: false
  settingsVisible: true
  systemVisible: true
  optional?: boolean
  asyncJobs: boolean
  artifactHandling: 'download' | 'remote_url' | 'local' | 'none'
}
export const PROVIDER_MESH: readonly ProviderMeshNode[] = [
  {
    id: 'genx',
    displayName: 'GenX',
    kind: 'provider',
    envAliases: ['GENX_API_KEY'],
    baseUrl: 'https://query.genx.sh',
    authMethod: 'Bearer token',
    capabilities: ['text', 'streaming_text', 'reasoning', 'code', 'vision', 'image', 'video', 'image_to_video', 'avatar', 'music', 'audio', 'tts', 'stt', 'files', 'sessions', 'async_jobs', 'tools'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: true,
    artifactHandling: 'download',
  },
  {
    id: 'huggingface',
    displayName: 'Hugging Face',
    kind: 'provider',
    envAliases: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
    baseUrl: 'https://router.huggingface.co/v1',
    authMethod: 'Bearer token',
    capabilities: ['text', 'vision', 'embeddings', 'image', 'video', 'stt', 'audio'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'download',
  },
  {
    id: 'qwen',
    displayName: 'Qwen / DashScope',
    kind: 'provider',
    envAliases: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    authMethod: 'Bearer token',
    capabilities: ['text', 'streaming_text', 'reasoning', 'code', 'vision', 'image', 'video', 'audio', 'async_jobs'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: true,
    artifactHandling: 'remote_url',
  },
  {
    id: 'mimo',
    displayName: 'Xiaomi MiMo',
    kind: 'provider',
    envAliases: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
    baseUrl: 'https://api.xiaomimimo.com/v1',
    authMethod: 'Bearer token or api-key',
    capabilities: ['text', 'streaming_text', 'reasoning', 'code', 'vision', 'audio', 'video', 'tts', 'stt', 'tools', 'web_search'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'download',
  },
  {
    id: 'groq',
    displayName: 'Groq',
    kind: 'provider',
    envAliases: ['GROQ_API_KEY'],
    baseUrl: 'https://api.groq.com/openai/v1',
    authMethod: 'Bearer token',
    capabilities: ['text', 'streaming_text', 'reasoning', 'code', 'vision', 'stt', 'tts', 'tools'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'download',
  },
  {
    id: 'together',
    displayName: 'Together AI',
    kind: 'provider',
    envAliases: ['TOGETHER_API_KEY'],
    baseUrl: 'https://api.together.xyz/v1',
    authMethod: 'Bearer token',
    capabilities: ['text', 'streaming_text', 'reasoning', 'code', 'vision', 'embeddings', 'rerank', 'image', 'video', 'tools'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: true,
    artifactHandling: 'remote_url',
  },
  {
    id: 'github',
    displayName: 'GitHub',
    kind: 'tool',
    envAliases: ['GITHUB_PAT', 'GITHUB_TOKEN'],
    baseUrl: 'https://api.github.com',
    authMethod: 'Bearer token',
    capabilities: ['repo', 'pull_request'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'none',
  },
  {
    id: 'redis',
    displayName: 'Redis',
    kind: 'tool',
    envAliases: ['REDIS_URL'],
    baseUrl: 'redis://local-or-managed',
    authMethod: 'Connection URL',
    capabilities: ['queue'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'none',
  },
  {
    id: 'qdrant',
    displayName: 'Qdrant',
    kind: 'tool',
    envAliases: ['QDRANT_URL', 'QDRANT_API_KEY'],
    baseUrl: 'http://127.0.0.1:6333',
    authMethod: 'Optional api-key',
    capabilities: ['vector_store'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'none',
  },
  {
    id: 'local-crawler',
    displayName: 'Local Crawler',
    kind: 'tool',
    envAliases: [],
    baseUrl: 'Local Playwright + Scrapy + Trafilatura',
    authMethod: 'Local runtime',
    capabilities: ['crawl', 'render'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: true,
    artifactHandling: 'local',
  },
  {
    id: 'playwright',
    displayName: 'Playwright',
    kind: 'tool',
    envAliases: [],
    baseUrl: 'Local Node.js package and browser runtime',
    authMethod: 'Local runtime',
    capabilities: ['crawl', 'render'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'local',
  },
  {
    id: 'scrapy',
    displayName: 'Scrapy',
    kind: 'tool',
    envAliases: [],
    baseUrl: 'Local Python package',
    authMethod: 'Local runtime',
    capabilities: ['crawl'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: true,
    artifactHandling: 'local',
  },
  {
    id: 'trafilatura',
    displayName: 'Trafilatura',
    kind: 'tool',
    envAliases: [],
    baseUrl: 'Local Python package',
    authMethod: 'Local runtime',
    capabilities: ['crawl'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'local',
  },
  {
    id: 'ffmpeg',
    displayName: 'ffmpeg',
    kind: 'tool',
    envAliases: ['FFMPEG_PATH'],
    baseUrl: 'Local executable',
    authMethod: 'Local runtime',
    capabilities: ['video', 'audio'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'local',
  },
  {
    id: 'storage',
    displayName: 'Storage',
    kind: 'storage',
    envAliases: ['AMARKTAI_STORAGE_ROOT'],
    baseUrl: 'Configured storage driver',
    authMethod: 'Driver configuration',
    capabilities: ['storage'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: false,
    artifactHandling: 'local',
  },
  {
    id: 'smtp',
    displayName: 'SMTP',
    kind: 'tool',
    envAliases: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
    baseUrl: 'Configured SMTP server',
    authMethod: 'SMTP credentials',
    capabilities: ['email'],
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    optional: true,
    asyncJobs: false,
    artifactHandling: 'none',
  },
] as const

export const AI_PROVIDER_MESH = PROVIDER_MESH.filter((node) => node.kind === 'provider')

export function getProviderMeshNode(id: string) {
  return PROVIDER_MESH.find((node) => node.id === id)
}

export function providersForCapability(
  capability: ProviderCapability,
  connectedProviderIds: readonly string[],
) {
  const connected = new Set(connectedProviderIds)
  return PROVIDER_MESH.filter((node) => connected.has(node.id) && node.capabilities.includes(capability))
}

export function sanitizeProviderError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'Connection failed')
  return raw
    .replace(/(Bearer|Token|Key)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
    .replace(/\b(sk|hf|r8|ghp|tp)-?[A-Za-z0-9_-]{8,}\b/gi, '[redacted]')
    .replace(/redis(s)?:\/\/[^@\s]+@/gi, 'redis$1://[redacted]@')
    .slice(0, 280)
}
