import { APPROVED_AI_PROVIDERS, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
import { getProviderKeyWithSource, type CoreProvider, type ProviderKeySource } from '@/lib/provider-config'
import { getStorageRoot } from '@/lib/storage-driver'
import { prisma } from '@/lib/prisma'

export type SettingsTruthStatus =
  | 'Connected'
  | 'Configured'
  | 'Configured - needs live test'
  | 'Needs key'
  | 'Needs live test'
  | 'Needs test route'
  | 'Available backend route'
  | 'Unsupported'
  | 'Failed'
  | 'Not implemented'

export interface SettingsTruthEntry {
  key: string
  label: string
  kind: 'provider' | 'tool' | 'storage'
  status: SettingsTruthStatus
  configured: boolean
  connected: boolean
  source: ProviderKeySource | 'local' | 'runtime' | 'env' | 'missing'
  testRoute: string | null
  note: string
}

const TEST_ROUTES: Record<string, string> = {
  genx: '/api/admin/settings/test-genx',
  github: '/api/admin/settings/test-github',
  webdock: '/api/admin/settings/test-webdock',
  storage: '/api/admin/settings/test-storage',
}

function parseNotes(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function isPassedStatus(value: unknown): boolean {
  if (value === true) return true
  if (typeof value !== 'string') return false
  return ['passed', 'success', 'successful', 'ok', 'healthy', 'connected', 'valid'].includes(value.trim().toLowerCase())
}

async function getLastKnownTestPassed(key: string): Promise<boolean> {
  if (key === 'github') {
    const row = await prisma.gitHubConfig.findFirst({
      orderBy: { id: 'desc' },
      select: { lastValidatedAt: true },
    }).catch(() => null)
    if (row?.lastValidatedAt) return true
  }

  const row = await prisma.integrationConfig.findUnique({
    where: { key },
    select: { notes: true },
  }).catch(() => null)
  const notes = parseNotes(row?.notes)
  return [
    notes.lastTestPassed,
    notes.lastTestStatus,
    notes.testStatus,
    notes.status,
    notes.lastStatus,
    notes.valid,
  ].some(isPassedStatus)
}

const TOOL_ENTRIES = [
  { key: 'genx', label: 'GenX', note: 'Primary broker for model routing and Studio execution.', envKey: 'genx' },
  { key: 'github', label: 'GitHub', note: 'Repository list, branch list, push, PR, merge, and deploy handoff.' },
  { key: 'redis', label: 'Redis', note: 'Queues, job coordination, and live job state.', envName: 'REDIS_URL' },
  { key: 'firecrawl', label: 'Firecrawl', note: 'Research and scraping service. Status route lives in the research stack.' },
  { key: 'crawl4ai', label: 'Crawl4AI', note: 'Local research fallback. Availability is checked by research status, not by provider keys.' },
  { key: 'playwright', label: 'Playwright', note: 'Browser preview and verification tool. Availability is checked at runtime.' },
  { key: 'webdock', label: 'Webdock', note: 'VPS and system monitoring service.' },
  { key: 'smtp', label: 'SMTP / email', note: 'Email delivery, notifications, and operator alerts.', envName: 'SMTP_HOST' },
] as const

function envEntry(input: { key: string; label: string; note: string; envName: string; testRoute?: string | null }): SettingsTruthEntry {
  const configured = Boolean(process.env[input.envName])
  return {
    key: input.key,
    label: input.label,
    kind: 'tool',
    status: configured ? (input.testRoute ? 'Configured' : 'Needs test route') : 'Needs key',
    configured,
    connected: false,
    source: configured ? 'env' : 'missing',
    testRoute: input.testRoute ?? null,
    note: input.note,
  }
}

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
  const lastKnownTestPassed = configured && testRoute ? await getLastKnownTestPassed(input.key) : false
  const connected = configured && Boolean(testRoute) && lastKnownTestPassed
  const status: SettingsTruthStatus = configured
    ? testRoute
      ? lastKnownTestPassed
        ? 'Connected'
        : 'Configured - needs live test'
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
      envKey: 'envName' in tool ? undefined : tool.key === 'crawl4ai' || tool.key === 'playwright' ? undefined : (('envKey' in tool ? tool.envKey : tool.key) as CoreProvider),
      testRoute: tool.key === 'firecrawl' ? '/api/admin/research/status' : TEST_ROUTES[tool.key] ?? null,
    }).then((entry) => 'envName' in tool ? envEntry({ key: tool.key, label: tool.label, note: tool.note, envName: tool.envName }) : entry)),
  )

  const storage: SettingsTruthEntry = {
    key: 'storage',
    label: 'VPS/local storage',
    kind: 'storage',
    status: 'Connected',
    configured: true,
    connected: true,
    source: 'local',
    testRoute: TEST_ROUTES.storage,
    note: `Storage root: ${getStorageRoot()}`,
  }

  const connectedCount = new Set([...providers, ...tools].filter((item) => item.connected).map((item) => item.key)).size

  return {
    providers,
    tools,
    storage,
    connectedCount,
    approvedProviderKeys: APPROVED_AI_PROVIDERS.map((provider) => provider.key),
  }
}
