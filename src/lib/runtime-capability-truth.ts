import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { getCapabilityRuntimeTruth, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'
import { getServiceConfigField } from '@/lib/service-vault'
import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { LIVE_GENX_MODEL_COUNT } from '@/lib/provider-capability-governance'

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

function mapKeySource(src: 'db' | 'env' | 'none'): 'vault' | 'env' | 'missing' {
  if (src === 'db') return 'vault'
  if (src === 'env') return 'env'
  return 'missing'
}

export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  const truth = await getProviderRuntimeTruth()
  return truth.map((entry) => ({
    key: entry.providerId,
    displayName: entry.displayName,
    reason: entry.connected ? 'Live test passed.' : entry.blocker,
    configured: entry.configured,
    connected: entry.connected,
    coveredByGenX: false,
    keySource: mapKeySource(entry.keySource),
    status: entry.connected
      ? 'configured_wired' as const
      : entry.configured
        ? 'configured_not_wired' as const
        : entry.optional
          ? 'not_configured_optional' as const
          : 'blocked' as const,
    governanceStatus: 'approved',
    showInPrimarySetup: entry.kind === 'provider',
    defaultCostRole: entry.providerId === 'genx' ? 'primary' : 'specialist',
    capabilities: [...entry.capabilities],
  }))
}

export async function getFallbackProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  return getRuntimeProviderStatus()
}

export async function getGenXRuntimeStatus(): Promise<GenXRuntimeStatus> {
  const providers = await getRuntimeProviderStatus()
  const genx = providers.find((provider) => provider.key === 'genx')
  return {
    configured: Boolean(genx?.configured),
    available: Boolean(genx?.connected),
    keySource: genx?.keySource ?? 'missing',
    modelCount: genx?.connected ? LIVE_GENX_MODEL_COUNT : 0,
    capabilities: genx?.connected ? genx.capabilities ?? [] : [],
    apiUrl: genx?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,
  }
}

export async function getAdultCapabilityGate(providers: ProviderRuntimeEntry[]): Promise<AdultCapabilityGate> {
  const canonical = await getCapabilityRuntimeTruth()
  const adultCapabilities = canonical.filter((entry) => entry.capabilityId.startsWith('adult_') || entry.capabilityId === 'voice_clone')
  const approved = providers.filter((provider) =>
    provider.connected && adultCapabilities.some((entry) => entry.connectedProviderCandidates.includes(provider.key)),
  )
  const configured = providers.filter((provider) =>
    provider.configured && adultCapabilities.some((entry) => entry.providerCandidates.includes(provider.key)),
  )
  const firstWorking = adultCapabilities.find((entry) => entry.status === 'working')
  const firstFailed = adultCapabilities.find((entry) => entry.proofStatus === 'failed')
  const firstBlocked = adultCapabilities.find((entry) => entry.status === 'blocked')
  const firstWired = adultCapabilities.find((entry) => entry.status === 'wired_unproven')
  const lastTestStatus = await getServiceConfigField('adult_mode', 'lastTestStatus', '').catch(() => null) ?? ''
  const lastError = await getServiceConfigField('adult_mode', 'lastError', '').catch(() => null) ?? ''
  const selectedProvider = approved[0]?.key ?? null
  const providerAvailable = Boolean(firstWorking)
  const blocker =
    firstWorking ? null :
    firstFailed?.blocker || firstBlocked?.blocker || firstWired?.blocker ||
    'No adult capability has passed key, endpoint, permission, route, and storage checks.'
  return {
    status: providerAvailable
      ? 'ready'
      : firstFailed
        ? 'provider_failed'
        : configured.length > 0
          ? 'needs_provider_test'
          : 'not_wired',
    blocker,
    providerAvailable,
    testPassed: providerAvailable,
    globalEnabled: true,
    enabled: true,
    selectedProvider,
    selectedModel: null,
    allowedCategories: ['legal_adult_text', 'legal_adult_image', 'legal_adult_video', 'legal_adult_voice'],
    blockedCategories: ['minors', 'age_ambiguous', 'non_consensual', 'real_person_sexual_deepfakes', 'illegal_content'],
    lastTestStatus: lastTestStatus || null,
    lastError: lastError || null,
    configuredProviders: configured.map((provider) => provider.key),
  }
}

const LEGACY_CAPABILITY_NAMES: Record<string, string> = {
  chat: 'Text / Chat',
  reasoning_code: 'Coding Agent',
  image_generation: 'Image Generation',
  video_generation: 'Video Generation',
  tts: 'Voice TTS',
  stt: 'STT / Transcription',
  music_generation: 'Music Generation',
  embeddings: 'Embeddings',
  website_scraping: 'Web Crawler / Research',
}

function mapCanonicalCapabilityStatus(status: CapabilityRuntimeTruthEntry['status']): CapabilityStatus {
  if (status === 'working') return 'available'
  if (status === 'missing') return 'not_implemented'
  return 'blocked'
}

export async function getCapabilityStatus(
  _genxConfigured: boolean,
  _providers: ProviderRuntimeEntry[],
): Promise<CapabilityRuntimeEntry[]> {
  const canonical = await getCapabilityRuntimeTruth()
  return canonical.map((entry) => ({
    name: LEGACY_CAPABILITY_NAMES[entry.capabilityId] ?? entry.label,
    status: mapCanonicalCapabilityStatus(entry.status),
    blocker: entry.blocker || null,
    models: entry.connectedProviderCandidates,
    nextAction: entry.nextAction || null,
  }))
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
    available: Boolean(genxProvider?.connected),
    keySource: genxProvider?.keySource ?? 'missing',
    modelCount: genxProvider?.connected ? LIVE_GENX_MODEL_COUNT : 0,
    capabilities: genxProvider?.connected ? genxProvider.capabilities ?? [] : [],
    apiUrl: genxProvider?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,
  }
  const [capabilities, adultGate] = await Promise.all([
    getCapabilityStatus(genx.configured, providers),
    getAdultCapabilityGate(providers),
  ])
  const blockers = [
    ...providers.filter((provider) => provider.status === 'blocked').map((provider) => `${provider.displayName}: ${provider.reason}`),
    ...capabilities.filter((capability) => capability.status === 'blocked' && capability.blocker).map((capability) => `${capability.name}: ${capability.blocker}`),
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
