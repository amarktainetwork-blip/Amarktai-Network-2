import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'

export type SettingsTruthStatus = 'Connected' | 'Configured' | 'Needs key' | 'Needs live test' | 'Needs test route' | 'Failed'

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

async function buildEntry(id: ProviderMeshId): Promise<SettingsTruthEntry> {
  const node = PROVIDER_MESH.find((item) => item.id === id)!
  const notes = await getMeshTestNotes(id)
  const localRuntime = id === 'local-crawler' || id === 'ffmpeg' || id === 'storage'
  const storageWritable = id === 'storage' ? checkWritable(LOCAL_STORE_FILES.artifacts).writable : false
  const credential = localRuntime ? 'local-runtime' : await getMeshCredential(id)
  const configured = Boolean(credential) || storageWritable
  const connected = Boolean(configured && notes.lastTestPassed)
  const failed = configured && notes.lastTestStatus === 'failed'
  const status: SettingsTruthStatus = connected
    ? 'Connected'
    : failed
      ? 'Failed'
      : configured
        ? 'Needs live test'
        : node.optional
          ? 'Configured'
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
    lastTestedAt: typeof notes.lastTestedAt === 'string' ? notes.lastTestedAt : null,
    blocker: connected ? '' : failed ? notes.lastError || 'Live test failed' : configured ? 'Run the live test' : `Add ${node.envAliases.join(' or ') || 'the local runtime'}`,
    error: typeof notes.lastError === 'string' ? notes.lastError : '',
    unlocks: node.capabilities.join(', '),
  }
}

export async function getPlatformSettingsTruth() {
  const entries = await Promise.all(PROVIDER_MESH.map((node) => buildEntry(node.id)))
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
