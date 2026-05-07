import { APPROVED_AI_PROVIDERS, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
import { getProviderKeyWithSource, type CoreProvider, type ProviderKeySource } from '@/lib/provider-config'
import { getStorageRoot } from '@/lib/storage-driver'

export type SettingsTruthStatus =
  | 'Configured'
  | 'Needs key'
  | 'Needs live test'
  | 'Needs test route'
  | 'Available backend route'
  | 'Not implemented'

export interface SettingsTruthEntry {
  key: string
  label: string
  kind: 'provider' | 'tool' | 'storage'
  status: SettingsTruthStatus
  configured: boolean
  connected: boolean
  source: ProviderKeySource | 'local' | 'runtime' | 'missing'
  testRoute: string | null
  note: string
}

const TEST_ROUTES: Record<string, string> = {
  genx: '/api/admin/settings/test-genx',
  github: '/api/admin/settings/test-github',
  webdock: '/api/admin/settings/test-webdock',
  storage: '/api/admin/settings/test-storage',
}

const TOOL_ENTRIES = [
  { key: 'github', label: 'GitHub', note: 'Repository list, branch list, push, PR, merge, and deploy handoff.' },
  { key: 'firecrawl', label: 'Firecrawl', note: 'Research and scraping service. Status route lives in the research stack.' },
  { key: 'crawl4ai', label: 'Crawl4AI', note: 'Local research fallback. Availability is checked by research status, not by provider keys.' },
  { key: 'playwright', label: 'Playwright', note: 'Browser preview and verification tool. Availability is checked at runtime.' },
  { key: 'webdock', label: 'Webdock', note: 'VPS and system monitoring service.' },
] as const

async function entryForKey(input: {
  key: string
  label: string
  kind: SettingsTruthEntry['kind']
  note: string
  envKey?: CoreProvider
  testRoute?: string | null
}): Promise<SettingsTruthEntry> {
  const testRoute = input.testRoute ?? TEST_ROUTES[input.key] ?? null
  const resolved = input.envKey
    ? await getProviderKeyWithSource(input.envKey).catch(() => ({ key: null, source: 'missing' as const }))
    : { key: null, source: 'missing' as const }

  const configured = Boolean(resolved.key)
  const connected = configured && Boolean(testRoute)
  const status: SettingsTruthStatus = configured
    ? testRoute
      ? 'Configured'
      : 'Needs test route'
    : input.kind === 'tool' && testRoute
      ? 'Needs key'
      : 'Needs key'

  return {
    key: input.key,
    label: input.label,
    kind: input.kind,
    status,
    configured,
    connected,
    source: resolved.source,
    testRoute,
    note: input.note,
  }
}

export async function getPlatformSettingsTruth(): Promise<{
  providers: SettingsTruthEntry[]
  tools: SettingsTruthEntry[]
  storage: SettingsTruthEntry
  connectedCount: number
  approvedProviderKeys: ApprovedProviderKey[]
}> {
  const providers = await Promise.all(
    APPROVED_AI_PROVIDERS.map((provider) => entryForKey({
      key: provider.key,
      label: provider.displayName,
      kind: 'provider',
      note: provider.notes,
      envKey: provider.key as CoreProvider,
    })),
  )

  const tools = await Promise.all(
    TOOL_ENTRIES.map((tool) => entryForKey({
      key: tool.key,
      label: tool.label,
      kind: 'tool',
      note: tool.note,
      envKey: tool.key === 'crawl4ai' || tool.key === 'playwright' ? undefined : tool.key as CoreProvider,
      testRoute: tool.key === 'firecrawl' ? '/api/admin/research/status' : TEST_ROUTES[tool.key] ?? null,
    })),
  )

  const storage: SettingsTruthEntry = {
    key: 'storage',
    label: 'VPS/local storage',
    kind: 'storage',
    status: 'Available backend route',
    configured: true,
    connected: true,
    source: 'local',
    testRoute: TEST_ROUTES.storage,
    note: `Storage root: ${getStorageRoot()}`,
  }

  const connectedCount = [...providers, ...tools].filter((item) => item.connected).length

  return {
    providers,
    tools,
    storage,
    connectedCount,
    approvedProviderKeys: APPROVED_AI_PROVIDERS.map((provider) => provider.key),
  }
}
