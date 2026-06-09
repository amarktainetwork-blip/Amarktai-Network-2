import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { getProviderKeyWithSource } from '@/lib/provider-config'
import { getServiceConfigField } from '@/lib/service-vault'
import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { LIVE_GENX_MODEL_COUNT } from '@/lib/provider-capability-governance'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import {
  getRuntimeProviderGovernance,
  type ProviderGovernanceEntry,
} from '@/lib/ai-provider-governance'

export interface GenXRuntimeStatus {
  configured: boolean
  available: boolean
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
  modelCount: number
  capabilities: string[]
  apiUrl: string | null
}

export type ProviderStatus =
  | 'configured_wired'
  | 'configured_not_wired'
  | 'not_configured_optional'
  | 'covered_by_genx'
  | 'blocked'

export interface ProviderRuntimeEntry {
  key: string
  displayName: string
  reason: string
  configured: boolean
  connected?: boolean
  coveredByGenX: boolean
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
  status: ProviderStatus
  governanceStatus?: string
  showInPrimarySetup?: boolean
  defaultCostRole?: string
  capabilities?: string[]
}

export type CapabilityStatus = 'available' | 'blocked' | 'not_implemented'

export interface CapabilityRuntimeEntry {
  name: string
  status: CapabilityStatus
  blocker: string | null
  models: string[]
  nextAction: string | null
}

export interface LocalCoreStatus {
  memory: { writable: boolean; driver: string; file: string }
  approvals: { writable: boolean; driver: string; file: string }
  artifacts: { writable: boolean; driver: string; file: string }
  research: { writable: boolean; driver: string; file: string }
  apps: { writable: boolean; driver: string; file: string; count: number }
  agents: { writable: boolean; driver: string; file: string; count: number }
  allWorking: boolean
}

export type AdultCapabilityGateStatus =
  | 'ready'
  | 'configured_with_last_error'
  | 'needs_provider_test'
  | 'provider_failed'
  | 'app_permission_disabled'
  | 'global_flag_disabled'
  | 'not_wired'

export interface AdultCapabilityGate {
  status: AdultCapabilityGateStatus
  blocker: string | null
  providerAvailable: boolean
  testPassed: boolean
  globalEnabled: boolean
  enabled: boolean
  selectedProvider: string | null
  selectedModel: string | null
  allowedCategories: string[]
  blockedCategories: string[]
  lastTestStatus: string | null
  lastError: string | null
  configuredProviders: string[]
}

export interface DashboardRuntimeTruth {
  success: true
  genx: GenXRuntimeStatus
  providers: ProviderRuntimeEntry[]
  capabilities: CapabilityRuntimeEntry[]
  adultGate: AdultCapabilityGate
  blockers: string[]
  localCore: LocalCoreStatus
}

const DIRECT_AI_PROVIDER_KEYS = new Set([
  'huggingface',
  'qwen',
  'mimo',
  'groq',
  'together',
  'minimax',
  'deepseek',
  'gemini',
  'replicate',
  'elevenlabs',
  'deepgram',
  'openrouter',
  'xai',
  'moonshot',
  'zhipu',
])

const EXTRA_RUNTIME_PROVIDERS: ProviderGovernanceEntry[] = [
  {
    key: 'firecrawl',
    displayName: 'Firecrawl',
    integrationKey: 'firecrawl',
    envVar: 'FIRECRAWL_API_KEY',
    envVarAliases: ['FIRECRAWL_API_KEY'],
    status: 'active_optional',
    setupGroup: 'primary',
    reason: 'Research and crawler provider for app intelligence.',
    capabilities: ['research', 'crawler'],
    coveredByGenX: false,
    wired: true,
    showInPrimarySetup: true,
    defaultCostRole: 'ops',
    notes: 'Configured through FIRECRAWL_API_KEY.',
  },
]

function getLocalCoreStatus(): LocalCoreStatus {
  const memory = checkWritable(LOCAL_STORE_FILES.memory)
  const approvals = checkWritable(LOCAL_STORE_FILES.approvals)
  const artifacts = checkWritable(LOCAL_STORE_FILES.artifacts)
  const research = checkWritable(LOCAL_STORE_FILES.research)
  const apps = checkWritable(LOCAL_STORE_FILES.apps)
  const agents = checkWritable(LOCAL_STORE_FILES.agents)

  interface WithId { id: string }

  return {
    memory: { writable: memory.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.memory },
    approvals: { writable: approvals.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.approvals },
    artifacts: { writable: artifacts.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.artifacts },
    research: { writable: research.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.research },
    apps: { writable: apps.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.apps, count: listRecords<WithId>(LOCAL_STORE_FILES.apps).length },
    agents: { writable: agents.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.agents, count: listRecords<WithId>(LOCAL_STORE_FILES.agents).length },
    allWorking: memory.writable && approvals.writable && artifacts.writable && research.writable && apps.writable && agents.writable,
  }
}

function capabilityModelsFor(provider: ProviderRuntimeEntry, capabilityName: string): string[] {
  if (capabilityName === 'Music Generation' && provider.key === 'genx') {
    return ['lyria-3-clip-preview', 'lyria-3-pro-preview']
  }

  return [provider.displayName]
}

function providerCanSatisfy(
  provider: ProviderRuntimeEntry,
  capabilityAliases: readonly string[],
): boolean {
  if (!provider.configured) return false
  if (provider.status === 'blocked' || provider.status === 'not_configured_optional') return false

  const providerCapabilities = new Set(provider.capabilities ?? [])
  return capabilityAliases.some((capability) => providerCapabilities.has(capability))
}

function governanceRuntimeEntry(
  governance: ProviderGovernanceEntry,
  configured: boolean,
  keySource: ProviderRuntimeEntry['keySource'],
): ProviderRuntimeEntry {
  return {
    key: governance.key,
    displayName: governance.displayName,
    reason: configured ? 'Provider key configured. Live route may still need a provider test.' : governance.reason,
    configured,
    connected: configured,
    coveredByGenX: governance.coveredByGenX,
    keySource,
    status: configured ? 'configured_wired' : 'not_configured_optional',
    governanceStatus: governance.status,
    showInPrimarySetup: governance.showInPrimarySetup,
    defaultCostRole: governance.defaultCostRole,
    capabilities: governance.capabilities,
  }
}

export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  const truth = await getPlatformSettingsTruth()
  const governanceEntries = [...getRuntimeProviderGovernance(), ...EXTRA_RUNTIME_PROVIDERS]
  const governanceByKey = new Map(governanceEntries.map((entry) => [entry.key, entry]))
  const providerMap = new Map<string, ProviderRuntimeEntry>()

  for (const entry of truth.entries) {
    const governance = governanceByKey.get(entry.key)
    const source = entry.kind === 'provider'
      ? (await getProviderKeyWithSource(entry.key)).source
      : entry.configured ? 'env' as const : 'missing' as const

    const configured = Boolean(entry.configured)
    const connected = Boolean(entry.connected)

    providerMap.set(entry.key, {
      key: entry.key,
      displayName: entry.label,
      reason: connected ? 'Live test passed.' : entry.blocker,
      configured,
      connected,
      coveredByGenX: governance?.coveredByGenX ?? false,
      keySource: source,
      status: connected
        ? 'configured_wired'
        : configured
          ? 'configured_not_wired'
          : entry.optional
            ? 'not_configured_optional'
            : 'blocked',
      governanceStatus: governance?.status ?? 'approved',
      showInPrimarySetup: governance?.showInPrimarySetup ?? entry.kind === 'provider',
      defaultCostRole: governance?.defaultCostRole ?? (entry.key === 'genx' ? 'gateway' : entry.kind === 'provider' ? 'specialist' : 'ops'),
      capabilities: governance?.capabilities?.length ? governance.capabilities : entry.capabilities,
    })
  }

  for (const governance of governanceEntries) {
    if (providerMap.has(governance.key)) continue

    const keyResult = await getProviderKeyWithSource(governance.integrationKey || governance.key)
    const configured = Boolean(keyResult.key)

    providerMap.set(governance.key, governanceRuntimeEntry(governance, configured, keyResult.source))
  }

  return [...providerMap.values()].filter((provider) =>
    provider.governanceStatus !== 'proposed' &&
    provider.defaultCostRole !== 'deprecated',
  )
}

export async function getFallbackProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  return getRuntimeProviderStatus()
}

export async function getGenXRuntimeStatus(): Promise<GenXRuntimeStatus> {
  const providers = await getRuntimeProviderStatus()
  const genx = providers.find((provider) => provider.key === 'genx')

  return {
    configured: Boolean(genx?.configured),
    available: Boolean(genx?.configured),
    keySource: genx?.keySource ?? 'missing',
    modelCount: genx?.configured ? LIVE_GENX_MODEL_COUNT : 0,
    capabilities: genx?.configured ? genx.capabilities ?? [] : [],
    apiUrl: genx?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,
  }
}

export async function getAdultCapabilityGate(providers: ProviderRuntimeEntry[]): Promise<AdultCapabilityGate> {
  const adultRoutes = [
    MEDIA_CAPABILITY_ROUTES.adult_text,
    MEDIA_CAPABILITY_ROUTES.adult_image,
    MEDIA_CAPABILITY_ROUTES.adult_video,
    MEDIA_CAPABILITY_ROUTES.adult_voice,
  ]
  const compatibleProviderIds = new Set(adultRoutes.flatMap((route) => route.providers.map((entry) => entry.provider)))
  const approved = providers.filter((provider) => provider.connected && compatibleProviderIds.has(provider.key as never))
  const lastTestStatus = await getServiceConfigField('adult_mode', 'lastTestStatus', '').catch(() => null) ?? ''
  const lastError = await getServiceConfigField('adult_mode', 'lastError', '').catch(() => null) ?? ''
  const selectedProvider = approved[0]?.key ?? null
  const providerAvailable = approved.length > 0
  const selectedModel = selectedProvider
    ? adultRoutes.flatMap((route) => route.providers).find((entry) => entry.provider === selectedProvider)?.model ?? null
    : null

  return {
    status: providerAvailable ? 'ready' : 'not_wired',
    blocker: providerAvailable ? null : 'No connected provider/model route can create and persist adult text, image, video, or voice output.',
    providerAvailable,
    testPassed: providerAvailable,
    globalEnabled: true,
    enabled: true,
    selectedProvider,
    selectedModel,
    allowedCategories: ['legal_adult_text', 'legal_adult_image', 'legal_adult_video', 'legal_adult_voice'],
    blockedCategories: ['minors', 'age_ambiguous', 'non_consensual', 'real_person_sexual_deepfakes', 'illegal_content'],
    lastTestStatus: lastTestStatus || null,
    lastError: lastError || null,
    configuredProviders: approved.map((provider) => provider.key),
  }
}

const CAPABILITY_ROWS: Array<{ name: string; capabilities: string[] }> = [
  { name: 'Text / Chat', capabilities: ['text', 'streaming_text', 'chat'] },
  { name: 'Coding Agent', capabilities: ['code', 'coding'] },
  { name: 'Image Generation', capabilities: ['image', 'image_generation'] },
  { name: 'Video Generation', capabilities: ['video', 'image_to_video', 'video_generation'] },
  { name: 'Voice TTS', capabilities: ['tts', 'voice_tts'] },
  { name: 'STT / Transcription', capabilities: ['stt', 'voice_stt'] },
  { name: 'Music Generation', capabilities: ['music', 'music_generation'] },
  { name: 'Embeddings', capabilities: ['embeddings'] },
  { name: 'Web Crawler / Research', capabilities: ['crawl', 'render', 'crawler', 'research', 'web_search'] },
  { name: 'Repo / GitHub', capabilities: ['repo', 'pull_request'] },
]

export async function getCapabilityStatus(
  _genxConfigured: boolean,
  providers: ProviderRuntimeEntry[],
): Promise<CapabilityRuntimeEntry[]> {
  return CAPABILITY_ROWS.map((row) => {
    if (row.name === 'Music Generation') {
      const genx = providers.find((provider) => provider.key === 'genx' && provider.configured)
      return {
        name: row.name,
        status: genx ? 'available' : 'blocked',
        blocker: genx ? null : 'Configure GenX for Lyria music generation before live testing.',
        models: genx ? ['lyria-3-clip-preview', 'lyria-3-pro-preview'] : [],
        nextAction: genx ? null : 'Configure GenX, then run the Lyria music live test.',
      }
    }

    const configured = providers.filter((provider) => providerCanSatisfy(provider, row.capabilities))
    const models = configured.flatMap((provider) => capabilityModelsFor(provider, row.name))

    return {
      name: row.name,
      status: configured.length ? 'available' : 'blocked',
      blocker: configured.length ? null : `No configured approved connection provides ${row.capabilities.join(' or ')}.`,
      models,
      nextAction: configured.length ? null : 'Add the required key or local tool in Settings, then run its live test.',
    }
  })
}

export async function getModelCatalogueStatus(): Promise<{ modelCount: number; source: 'live' | 'static' }> {
  const genx = await getGenXRuntimeStatus()
  return { modelCount: genx.modelCount, source: genx.available ? 'live' : 'static' }
}

export async function getDashboardRuntimeTruth(): Promise<DashboardRuntimeTruth> {
  const providers = await getRuntimeProviderStatus()
  const genxProvider = providers.find((provider) => provider.key === 'genx')
  const genx: GenXRuntimeStatus = {
    configured: Boolean(genxProvider?.configured),
    available: Boolean(genxProvider?.configured),
    keySource: genxProvider?.keySource ?? 'missing',
    modelCount: genxProvider?.configured ? LIVE_GENX_MODEL_COUNT : 0,
    capabilities: genxProvider?.configured ? genxProvider.capabilities ?? [] : [],
    apiUrl: genxProvider?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,
  }

  const [capabilities, adultGate] = await Promise.all([
    getCapabilityStatus(genx.configured, providers),
    getAdultCapabilityGate(providers),
  ])

  const hasDirectAiProvider = providers.some((provider) =>
    provider.key !== 'genx' &&
    provider.configured &&
    DIRECT_AI_PROVIDER_KEYS.has(provider.key),
  )

  const blockers = [
    ...(!genx.configured && !hasDirectAiProvider ? ['GenX API key not configured and no direct AI provider key is configured.'] : []),
    ...providers
      .filter((provider) =>
        provider.status === 'blocked' &&
        provider.key !== 'genx' &&
        provider.governanceStatus !== 'deprecated' &&
        provider.governanceStatus !== 'proposed',
      )
      .map((provider) => `${provider.displayName}: ${provider.reason}`),
    ...capabilities
      .filter((capability) => capability.status === 'blocked' && capability.blocker)
      .map((capability) => `${capability.name}: ${capability.blocker}`),
  ]

  return {
    success: true,
    genx,
    providers,
    capabilities,
    adultGate,
    blockers,
    localCore: getLocalCoreStatus(),
  }
}
