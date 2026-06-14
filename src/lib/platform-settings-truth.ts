import { PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
import { getProviderReadiness } from '@/lib/provider-registry'
import { verifyStorage, type StorageHealth } from '@/lib/storage-driver'

export type SettingsTruthStatus = 'Connected' | 'Optional' | 'Needs key' | 'Needs live test' | 'Failed'

export interface SettingsTruthEntry {
  key: ProviderMeshId
  label: string
  kind: 'provider' | 'tool' | 'storage'
  status: SettingsTruthStatus
  configured: boolean
  connected: boolean
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
  const credential = localRuntime ? 'local-runtime' : await getMeshCredential(id)
  const configured = Boolean(credential) || storageWritable
  const connected = providerReadiness
    ? providerReadiness.state === 'ready'
    : Boolean(configured && (notes.lastTestPassed || storageWritable))
  const failed = providerReadiness
    ? providerReadiness.state === 'misconfigured'
    : configured && notes.lastTestStatus === 'failed'
  const status: SettingsTruthStatus = connected
    ? 'Connected'
    : failed
      ? 'Failed'
      : configured
        ? 'Needs live test'
        : node.optional
          ? 'Optional'
          : 'Needs key'

  return {
    key: id,
    label: node.displayName,
    kind: node.kind,
    status,
    configured,
    connected,
    optional: Boolean(node.optional),
    requiresSecret: !localRuntime && node.envAliases.length > 0,
    testRoute: node.testRoute,
    envVars: [...node.envAliases],
    capabilities: [...node.capabilities],
    lastTestResult: connected ? 'Live test passed' : failed ? 'Live test failed' : 'Not tested',
    lastTestedAt: providerReadiness?.checkedAt
      ?? (typeof notes.lastTestedAt === 'string' ? notes.lastTestedAt : null),
    blocker: connected
      ? ''
      : failed
        ? notes.lastError || 'Live test failed'
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
  const verifiedStorage = await verifyStorage()
  const entries = await Promise.all(PROVIDER_MESH.map((node) => buildEntry(node.id, verifiedStorage)))
  const providers = entries.filter((entry) => entry.kind === 'provider')
  const tools = entries.filter((entry) => entry.kind === 'tool')
  const storageEntry = entries.find((entry) => entry.kind === 'storage')!
  return {
    entries,
    providers,
    tools,
    storage: verifiedStorage,
    storageEntry,
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
