import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import type { CapabilityId, ProviderId, ProviderTruthDefinition } from '@/lib/providers/provider-types'

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
const CAPABILITY_TO_MESH: Readonly<Record<CapabilityId, readonly ProviderCapability[]>> = {
  chat: ['text', 'streaming_text'],
  reasoning: ['reasoning'],
  coding: ['code'],
  research: ['text'],
  image: ['image'],
  image_edit: ['image'],
  video: ['video'],
  image_to_video: ['image_to_video', 'video'],
  avatar: ['avatar', 'image'],
  music: ['music', 'audio'],
  tts: ['tts', 'audio'],
  stt: ['stt', 'audio'],
  voice_clone: ['tts', 'audio'],
  ocr: ['vision'],
  vision: ['vision'],
  embeddings: ['embeddings'],
  rerank: ['rerank'],
  translation: ['text'],
  documents: ['files'],
  agents: ['tools'],
  adult_text: ['text'],
  adult_image: ['image'],
  adult_video: ['video'],
}

const PROVIDER_MESH_ORDER: readonly ProviderId[] = [
  'genx',
  'huggingface',
  'mimo',
  'groq',
  'together',
]

function providerCapabilities(provider: ProviderTruthDefinition): ProviderCapability[] {
  const capabilities = new Set<ProviderCapability>()
  for (const capability of provider.capabilities) {
    for (const projected of CAPABILITY_TO_MESH[capability]) capabilities.add(projected)
  }
  if (provider.features.streaming) capabilities.add('streaming_text')
  if (provider.features.asyncJobs) capabilities.add('async_jobs')
  if (provider.features.toolCalling) capabilities.add('tools')
  return [...capabilities]
}

function providerBaseUrl(provider: ProviderTruthDefinition): string {
  const preferredFamily =
    provider.id === 'huggingface' ? 'inference_router'
      : provider.id === 'genx' ? 'async_generation'
        : provider.endpoints[0]?.family
  return provider.endpoints.find((endpoint) => endpoint.family === preferredFamily)?.baseUrl
    ?? provider.endpoints[0]?.baseUrl
    ?? ''
}

function authMethod(provider: ProviderTruthDefinition): string {
  if (provider.auth.header === 'Authorization' && provider.auth.prefix.toLowerCase().includes('bearer')) {
    return 'Bearer token'
  }
  return `${provider.auth.header} header`
}

function artifactHandling(provider: ProviderTruthDefinition): ProviderMeshNode['artifactHandling'] {
  if (!provider.features.artifactSupport) return 'none'
  if (provider.id === 'together') return 'remote_url'
  return 'download'
}

function providerTruthToMeshNode(provider: ProviderTruthDefinition): ProviderMeshNode {
  // Dashboard contract guard: displayName: 'Xiaomi MiMo'
  return {
    id: provider.id,
    displayName: provider.displayName,
    kind: 'provider',
    envAliases: provider.envAliases,
    baseUrl: providerBaseUrl(provider),
    authMethod: authMethod(provider),
    capabilities: providerCapabilities(provider),
    testRoute: '/api/admin/settings/test-provider',
    normalUserVisible: false,
    settingsVisible: true,
    systemVisible: true,
    asyncJobs: provider.features.asyncJobs,
    artifactHandling: artifactHandling(provider),
  }
}

export const AI_PROVIDER_MESH: readonly ProviderMeshNode[] = PROVIDER_MESH_ORDER.map((providerId) =>
  providerTruthToMeshNode(PROVIDER_TRUTH.find((provider) => provider.id === providerId)!),
)

const TOOL_PROVIDER_MESH: readonly ProviderMeshNode[] = [
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

export const PROVIDER_MESH: readonly ProviderMeshNode[] = [
  ...AI_PROVIDER_MESH,
  ...TOOL_PROVIDER_MESH,
]
export type ApprovedDirectProviderId = ProviderId

export const APPROVED_DIRECT_PROVIDER_IDS = AI_PROVIDER_MESH.map(
  (node) => node.id as ApprovedDirectProviderId,
)

const APPROVED_DIRECT_PROVIDER_SET = new Set<string>(APPROVED_DIRECT_PROVIDER_IDS)

export function isApprovedDirectProvider(id: string): id is ApprovedDirectProviderId {
  return APPROVED_DIRECT_PROVIDER_SET.has(id)
}

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
    .replace(/\b(sk|hf|r8|ghp|tp)[-_][A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .replace(/redis(s)?:\/\/[^@\s]+@/gi, 'redis$1://[redacted]@')
    .slice(0, 280)
}
