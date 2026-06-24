import {
  APPROVED_DIRECT_PROVIDER_IDS,
  PROVIDER_MESH,
  type ProviderMeshId,
} from '@/lib/provider-mesh'
import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
import { getProviderReadiness } from '@/lib/provider-registry'
import { discoverProvider } from '@/lib/providers/provider-discovery'
import { verifyStorage, type StorageHealth } from '@/lib/storage-driver'
import { getLatestCreativeSmokeReport } from '@/lib/creative-smoke-report'

export type ProviderRuntimeReadinessStatus =
  | 'CREDENTIAL_MISSING'
  | 'CREDENTIAL_PRESENT'
  | 'CATALOG_READY'
  | 'CATALOG_FAILED'
  | 'CHAT_SMOKE_PASSED'
  | 'CAPABILITY_SMOKE_PARTIAL'
  | 'CAPABILITY_SMOKE_FAILED'
  | 'LIVE_READY'

export type SettingsTruthStatus =
  | ProviderRuntimeReadinessStatus
  | 'Connected'
  | 'Optional'
  | 'Needs key'

export interface SettingsTruthEntry {
  key: ProviderMeshId
  label: string
  kind: 'provider' | 'tool' | 'storage'
  status: SettingsTruthStatus
  providerRuntimeStatus: ProviderRuntimeReadinessStatus | null
  configured: boolean
  connected: boolean
  keyPresent: boolean
  providerCatalogWorks: boolean
  providerCatalogSource: string
  providerCatalogModelCount: number
  providerLiveTestPassed: boolean
  capabilityLiveProven: boolean
  routeAdapterExists: boolean
  optional: boolean
  requiresSecret: boolean
  testRoute: string
  envVars: string[]
  capabilities: string[]
  lastTestResult: string
  lastTestedAt: string | null
  blocker: string
  error: string
  unlocks: string
}

async function buildEntry(id: ProviderMeshId, verifiedStorage: StorageHealth): Promise<SettingsTruthEntry> {
  const node = PROVIDER_MESH.find((item) => item.id === id)!
  const notes = await getMeshTestNotes(id)
  const localRuntime = id === 'local-crawler' || id === 'playwright' || id === 'scrapy' || id === 'trafilatura' || id === 'ffmpeg' || id === 'storage'
  const storageHealth = id === 'storage' ? verifiedStorage : null
  const storageWritable = storageHealth?.ready === true
  const providerReadiness = node.kind === 'provider'
    ? await getProviderReadiness(node.id as never)
    : null
  const providerDiscovery = node.kind === 'provider'
    ? await discoverProvider(node.id as never, { force: true }).catch((error) => ({
        status: 'failed' as const,
        models: [],
        discoverySource: 'none' as const,
        error: error instanceof Error ? error.message : String(error),
      }))
    : null
  const credential = localRuntime ? 'local-runtime' : await getMeshCredential(id)
  const configured = Boolean(credential) || storageWritable
  const providerLiveTestPassed = providerReadiness?.state === 'ready'
  const capabilityLiveProven = notes.capabilityExecutionProven === true || notes.proofKind === 'live_capability_execution_proof'
  const providerCatalogWorks = providerDiscovery?.status === 'ready' && providerDiscovery.models.length > 0
  const providerRuntimeStatus: ProviderRuntimeReadinessStatus | null = node.kind === 'provider'
    ? !configured
      ? 'CREDENTIAL_MISSING'
      : capabilityLiveProven
        ? 'LIVE_READY'
        : notes.capabilitySmokeFailed === true
          || (providerCatalogWorks && notes.lastTestStatus === 'failed')
          ? 'CAPABILITY_SMOKE_FAILED'
          : notes.capabilitySmokePartial === true
            ? 'CAPABILITY_SMOKE_PARTIAL'
            : providerLiveTestPassed
              ? 'CHAT_SMOKE_PASSED'
              : providerCatalogWorks
                ? 'CATALOG_READY'
                : providerDiscovery?.status === 'failed'
                  ? 'CATALOG_FAILED'
                  : 'CREDENTIAL_PRESENT'
    : null
  const connected = providerRuntimeStatus
    ? providerRuntimeStatus === 'CHAT_SMOKE_PASSED' || providerRuntimeStatus === 'LIVE_READY'
    : Boolean(configured && (notes.lastTestPassed || storageWritable))
  const status: SettingsTruthStatus = providerRuntimeStatus
    ?? (connected
      ? 'Connected'
      : configured
        ? 'Connected'
        : node.optional
          ? 'Optional'
          : 'Needs key')

  return {
    key: id,
    label: node.displayName,
    kind: node.kind,
    status,
    providerRuntimeStatus,
    configured,
    connected,
    keyPresent: configured,
    providerCatalogWorks,
    providerCatalogSource: providerDiscovery?.discoverySource ?? 'none',
    providerCatalogModelCount: providerDiscovery?.models.length ?? 0,
    providerLiveTestPassed,
    capabilityLiveProven,
    routeAdapterExists: node.kind === 'provider' ? node.capabilities.length > 0 : connected,
    optional: Boolean(node.optional),
    requiresSecret: !localRuntime && node.envAliases.length > 0,
    testRoute: node.testRoute,
    envVars: [...node.envAliases],
    capabilities: [...node.capabilities],
    lastTestResult: providerRuntimeStatus ?? (connected ? 'Connected' : 'Not tested'),
    lastTestedAt: providerReadiness?.checkedAt
      ?? (typeof notes.lastTestedAt === 'string' ? notes.lastTestedAt : null),
    blocker: providerRuntimeStatus === 'LIVE_READY'
      ? ''
      : providerRuntimeStatus === 'CHAT_SMOKE_PASSED'
        ? 'Provider chat smoke passed; product capability routes still need live proof.'
        : providerRuntimeStatus === 'CATALOG_READY'
          ? 'Credential and catalog are ready; capability route proof is pending.'
          : providerRuntimeStatus === 'CATALOG_FAILED'
            ? providerDiscovery?.error || 'Provider catalog discovery failed.'
            : providerRuntimeStatus === 'CREDENTIAL_PRESENT'
              ? 'Credential is present; run catalog and provider smoke checks.'
              : providerRuntimeStatus === 'CAPABILITY_SMOKE_PARTIAL'
                ? 'Some capability smoke checks passed; at least one route remains unproven.'
                : providerRuntimeStatus === 'CAPABILITY_SMOKE_FAILED'
                  ? notes.lastError || 'Capability smoke check failed.'
                  : providerRuntimeStatus === 'CREDENTIAL_MISSING'
                    ? `Add ${node.envAliases.join(' or ') || 'the local runtime'}`
                    : connected
      ? capabilityLiveProven
        ? ''
        : 'Provider live test passed; product capability routes still need live proof.'
      : configured
        ? `Run the ${node.displayName} live test`
        : node.optional
          ? 'Optional connection is not configured'
          : `Add ${node.envAliases.join(' or ') || 'the local runtime'}`,
    error: typeof notes.lastError === 'string' ? notes.lastError : '',
    unlocks: node.capabilities.join(', '),
  }
}

export async function getPlatformSettingsTruth() {
  const [verifiedStorage, creativeSmoke] = await Promise.all([
    verifyStorage(),
    getLatestCreativeSmokeReport().catch(() => null),
  ])
  const entries = await Promise.all(PROVIDER_MESH.map((node) => buildEntry(node.id, verifiedStorage)))
  const providers = entries.filter((entry) => entry.kind === 'provider')
  const tools = entries.filter((entry) => entry.kind === 'tool')
  const storageEntry = entries.find((entry) => entry.kind === 'storage')!
  const providersReady = APPROVED_DIRECT_PROVIDER_IDS.every((id) =>
    providers.some((provider) => provider.key === id && provider.connected),
  )
  const artifactPersistenceReady = creativeSmoke?.artifactPersistencePassed === true
  const creativeSmokePassed = creativeSmoke?.creativeWorkflowPassed === true
  const systemReady = verifiedStorage.ready
    && providersReady
    && artifactPersistenceReady
    && creativeSmokePassed
  return {
    entries,
    providers,
    tools,
    storage: verifiedStorage,
    storageEntry,
    systemReadiness: {
      ready: systemReady,
      storageReady: verifiedStorage.ready,
      providersReady,
      artifactPersistenceReady,
      creativeSmokePassed,
      lastCreativeSmokeTestAt: creativeSmoke?.testedAt ?? null,
      blocker: systemReady
        ? ''
        : !verifiedStorage.ready
          ? verifiedStorage.error || 'Storage is not ready.'
          : !providersReady
            ? 'All approved providers must be configured and live-tested.'
            : !artifactPersistenceReady
              ? 'Run the Live Creative Smoke Test to verify artifact persistence.'
              : 'At least one real creative workflow must pass.',
    },
    connectedCount: entries.filter((entry) => entry.connected).length,
    connectedProviderIds: providers.filter((entry) => entry.connected).map((entry) => entry.key),
    vaultEncryptionConfigured: /^[a-f0-9]{64}$/i.test(
      process.env.VAULT_ENCRYPTION_KEY?.trim() ?? '',
    ),
    vaultWarning: /^[a-f0-9]{64}$/i.test(
      process.env.VAULT_ENCRYPTION_KEY?.trim() ?? '',
    )
      ? ''
      : 'VAULT_ENCRYPTION_KEY is missing or invalid. Stored provider credentials are not encrypted at rest.',
  }
}
