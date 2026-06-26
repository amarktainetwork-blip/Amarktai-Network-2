import { PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
import { getProviderRuntimeTruth, type ProviderRuntimeTruthEntry } from '@/lib/provider-runtime-truth'

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

function toSettingsEntry(truth: ProviderRuntimeTruthEntry): SettingsTruthEntry {
  const node = PROVIDER_MESH.find((n) => n.id === truth.providerId)!
  const isLocalRuntime = ['local-crawler', 'playwright', 'scrapy', 'trafilatura', 'ffmpeg', 'storage'].includes(truth.providerId)

  const status: SettingsTruthStatus = truth.connected
    ? 'Connected'
    : truth.lastTestStatus === 'failed'
      ? 'Failed'
      : truth.configured
        ? 'Needs live test'
        : truth.optional
          ? 'Optional'
          : 'Needs key'

  const lastTestResult = truth.connected
    ? 'Live test passed'
    : truth.lastTestStatus === 'failed'
      ? 'Live test failed'
      : 'Not tested'

  // Translate internal blocker to user-visible text
  let blocker = ''
  if (!truth.connected) {
    if (!truth.hasKey) {
      blocker = truth.optional
        ? 'Optional connection is not configured'
        : node.envAliases.length > 0
          ? `Add ${node.envAliases.join(' or ')}`
          : `Add the local runtime`
    } else if (truth.endpointStatus === 'missing') {
      blocker = `Set the ${truth.displayName} endpoint URL`
    } else if (truth.lastTestStatus === 'failed') {
      blocker = truth.blocker || 'Live test failed'
    } else {
      blocker = `Run the ${truth.displayName} live test`
    }
  }

  return {
    key: truth.providerId,
    label: truth.displayName,
    kind: truth.kind,
    status,
    configured: truth.configured,
    connected: truth.connected,
    optional: truth.optional,
    requiresSecret: !isLocalRuntime && node.envAliases.length > 0,
    testRoute: node.testRoute,
    envVars: [...node.envAliases],
    capabilities: [...truth.capabilities],
    lastTestResult,
    lastTestedAt: truth.lastTestedAt,
    blocker,
    error: truth.lastTestStatus === 'failed' ? (truth.blocker || '') : '',
    unlocks: [...truth.capabilities].join(', '),
  }
}

export async function getPlatformSettingsTruth() {
  const truthEntries = await getProviderRuntimeTruth()
  const entries = truthEntries.map(toSettingsEntry)
  const providers = entries.filter((entry) => entry.kind === 'provider')
  const tools = entries.filter((entry) => entry.kind === 'tool')
  const storage = entries.find((entry) => entry.kind === 'storage')!
  return {
    entries,
    providers,
    tools,
    storage,
    connectedCount: entries.filter((entry) => entry.connected).length,
    connectedProviderIds: providers.filter((entry) => entry.connected).map((entry) => entry.key),
  }
}
