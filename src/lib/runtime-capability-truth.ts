import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { getServiceConfigField } from '@/lib/service-vault'
import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { LIVE_GENX_MODEL_COUNT } from '@/lib/provider-capability-governance'
import type { ProviderCapability } from '@/lib/provider-mesh'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'

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

const CAPABILITY_ROWS: Array<{ name: string; capabilities: ProviderCapability[] }> = [
  { name: 'Text / Chat', capabilities: ['text'] },
  { name: 'Coding Agent', capabilities: ['code'] },
  { name: 'Image Generation', capabilities: ['image'] },
  { name: 'Video Generation', capabilities: ['video'] },
  { name: 'Voice TTS', capabilities: ['tts'] },
  { name: 'STT / Transcription', capabilities: ['stt'] },
  { name: 'Music Generation', capabilities: ['music'] },
  { name: 'Embeddings', capabilities: ['embeddings'] },
  { name: 'Web Crawler / Research', capabilities: ['crawl'] },
  { name: 'Repo / GitHub', capabilities: ['repo'] },
]

export async function getCapabilityStatus(
  _genxConfigured: boolean,
  providers: ProviderRuntimeEntry[],
): Promise<CapabilityRuntimeEntry[]> {
  return CAPABILITY_ROWS.map((row) => {
    const connected = providers.filter((provider) =>
      provider.connected && row.capabilities.some((capability) => provider.capabilities?.includes(capability)),
    )
    return {
      name: row.name,
      status: connected.length ? 'available' as const : 'blocked' as const,
      blocker: connected.length ? null : `No tested approved connection provides ${row.capabilities.join(' or ')}.`,
      models: connected.map((provider) => provider.displayName),
      nextAction: connected.length ? null : 'Add the required key or local tool in Settings, then run its live test.',
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
