import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { getProviderKeyWithSource } from '@/lib/provider-config'
import { collectProviderRuntimeConfigTruth, type ProviderRuntimeConfigTruth } from '@/lib/provider-runtime-truth'
import { getServiceConfigField } from '@/lib/service-vault'
import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { LIVE_GENX_MODEL_COUNT } from '@/lib/provider-capability-governance'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { normalizeAdultPolicy } from '@/lib/universal-model-catalog'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

export interface GenXRuntimeStatus {
  configured: boolean
  available: boolean
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
  modelCount: number
  capabilities: string[]
  apiUrl: string | null
}

export type RuntimeReadinessState =
  | 'READY'
  | 'DEGRADED'
  | 'NEEDS_CONFIGURATION'
  | 'BLOCKED'
  | 'UNAVAILABLE'

export interface ProviderRuntimeEntry {
  key: string
  displayName: string
  reason: string
  configured: boolean
  connected?: boolean
  coveredByGenX: boolean
  keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'
  status: RuntimeReadinessState
  governanceStatus?: string
  showInPrimarySetup?: boolean
  defaultCostRole?: string
  capabilities?: string[]
  configTruth?: Pick<ProviderRuntimeConfigTruth,
    'runtimeExecutableStatus' | 'dashboardDisplayStatus' | 'blockers' | 'nextActions'
  >
}

export interface CapabilityRuntimeEntry {
  name: string
  status: RuntimeReadinessState
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
  RuntimeReadinessState

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

export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {
  const [truth, configTruth] = await Promise.all([
    getPlatformSettingsTruth(),
    collectProviderRuntimeConfigTruth().catch(() => []),
  ])
  const configByProvider = new Map(configTruth.map((entry) => [entry.provider, entry]))
  return Promise.all(truth.entries.map(async (entry) => {
    const source = entry.kind === 'provider'
      ? (await getProviderKeyWithSource(entry.key)).source
      : entry.configured ? 'env' as const : 'missing' as const
    const providerConfig = configByProvider.get(entry.key as never)
    const configBlocked = Boolean(providerConfig?.blockers.length)
    return {
      key: entry.key,
      displayName: entry.label,
      reason: providerConfig?.blockers[0] ?? (entry.connected ? 'Live test passed.' : entry.blocker),
      configured: providerConfig?.credential.present ?? entry.configured,
      connected: entry.connected,
      coveredByGenX: false,
      keySource: source,
      status: configBlocked
        ? 'BLOCKED' as const
        : entry.connected
        ? 'READY' as const
        : entry.configured
          ? 'DEGRADED' as const
          : entry.optional
            ? 'UNAVAILABLE' as const
            : 'NEEDS_CONFIGURATION' as const,
      governanceStatus: 'approved',
      showInPrimarySetup: entry.kind === 'provider',
      defaultCostRole: entry.key === 'genx' ? 'primary' : 'specialist',
      capabilities: entry.capabilities,
      configTruth: providerConfig ? {
        runtimeExecutableStatus: providerConfig.runtimeExecutableStatus,
        dashboardDisplayStatus: providerConfig.dashboardDisplayStatus,
        blockers: providerConfig.blockers,
        nextActions: providerConfig.nextActions,
      } : undefined,
    }
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
  const policy = normalizeAdultPolicy(
    await getServiceConfigField('adult_mode', 'mode', 'off').catch(() => 'off') ?? 'off',
  )
  const globalEnabled = policy !== 'off'
  const selectedProvider = approved[0]?.key ?? null
  const providerAvailable = approved.length > 0
  const selectedModel = selectedProvider
    ? adultRoutes.flatMap((route) => route.providers).find((entry) => entry.provider === selectedProvider)?.model ?? null
    : null
  return {
    status: !globalEnabled ? 'BLOCKED' : providerAvailable ? 'READY' : 'NEEDS_CONFIGURATION',
    blocker: !globalEnabled
      ? 'Adult mode is off. Explicit operator opt-in is required.'
      : providerAvailable
        ? null
        : 'No connected provider/model route can create and persist adult text, image, video, or voice output.',
    providerAvailable,
    testPassed: lastTestStatus === 'READY',
    globalEnabled,
    enabled: globalEnabled && providerAvailable,
    selectedProvider,
    selectedModel,
    allowedCategories: globalEnabled
      ? ['legal_adult_text', 'legal_adult_image', 'legal_adult_video', 'legal_adult_voice']
      : [],
    blockedCategories: ['minors', 'age_ambiguous', 'non_consensual', 'real_person_sexual_deepfakes', 'illegal_content'],
    lastTestStatus: lastTestStatus || null,
    lastError: lastError || null,
    configuredProviders: approved.map((provider) => provider.key),
  }
}

export async function getCapabilityStatus(
  _genxConfigured: boolean,
  _providers: ProviderRuntimeEntry[],
): Promise<CapabilityRuntimeEntry[]> {
  const matrix = await getV1BrainRouteMatrix()
  return matrix.capabilities.map((capability) => {
    const status: RuntimeReadinessState =
      capability.readiness === 'ready' || capability.readiness === 'ready_with_fallback'
        ? 'READY'
        : capability.readiness === 'provider_config_missing'
          ? 'NEEDS_CONFIGURATION'
          : capability.readiness === 'blocked'
            ? 'BLOCKED'
            : capability.readiness === 'adapter_missing' || capability.readiness === 'post_launch'
              ? 'UNAVAILABLE'
              : 'DEGRADED'
    return {
      name: capability.label,
      status,
      blocker: capability.blocker,
      models: [capability.selectedRoute, ...capability.fallbackRoutes]
        .filter((route): route is NonNullable<typeof route> => Boolean(route))
        .map((route) => `${route.provider}/${route.model ?? 'provider-default'}`),
      nextAction: status === 'READY'
        ? null
        : capability.readiness === 'needs_input'
          ? `Provide the required ${capability.requiredSourceInput} input.`
          : capability.blocker,
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
    ...providers.filter((provider) => provider.status === 'BLOCKED' || provider.status === 'NEEDS_CONFIGURATION').map((provider) => `${provider.displayName}: ${provider.reason}`),
    ...capabilities.filter((capability) => capability.status !== 'READY' && capability.blocker).map((capability) => `${capability.name}: ${capability.blocker}`),
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
