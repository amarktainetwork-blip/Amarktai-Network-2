import { APPROVED_AI_PROVIDERS, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
import { getProviderKeyWithSource, type CoreProvider, type ProviderKeySource } from '@/lib/provider-config'
import { getStorageRoot } from '@/lib/storage-driver'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { prisma } from '@/lib/prisma'
import { getCapabilityGovernanceMatrix } from '@/lib/provider-capability-governance'

export type SettingsTruthStatus =
  | 'Connected'
  | 'Configured'
  | 'Needs key'
  | 'Needs live test'
  | 'Needs test route'
  | 'Unsupported'
  | 'Failed'

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
  envVars: string[]
  lastTestResult: string
  blocker: string
  unlocks: string
}

const TEST_ROUTES: Record<string, string> = {
  genx: '/api/admin/settings/test-genx',
  github: '/api/admin/settings/test-github',
  webdock: '/api/admin/settings/test-webdock',
  storage: '/api/admin/settings/test-storage',
  groq: '/api/admin/settings/test-groq',
  qwen: '/api/admin/settings/test-qwen',
  minimax: '/api/admin/settings/test-minimax',
  together: '/api/admin/settings/test-together',
  huggingface: '/api/admin/settings/test-huggingface',
  openai: '/api/admin/settings/test-openai',
  redis: '/api/admin/settings/test-redis',
  smtp: '/api/admin/settings/test-smtp',
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
  { key: 'redis', label: 'Redis', note: 'Queues, job coordination, and live job state.', envName: 'REDIS_URL', testRoute: TEST_ROUTES.redis },
  { key: 'firecrawl', label: 'Firecrawl', note: 'Research and scraping service. Status route lives in the research stack.' },
  { key: 'crawl4ai', label: 'Crawl4AI', note: 'Local research fallback. Availability is checked by research status, not by provider keys.' },
  { key: 'playwright', label: 'Playwright', note: 'Browser preview and verification tool. Availability is checked at runtime.' },
  { key: 'webdock', label: 'Webdock', note: 'VPS and system monitoring service.' },
  { key: 'smtp', label: 'SMTP / email', note: 'Email delivery, notifications, and operator alerts.', envName: 'SMTP_HOST', testRoute: TEST_ROUTES.smtp },
] as const

function envEntry(input: { key: string; label: string; note: string; envName: string; testRoute?: string | null }): SettingsTruthEntry {
  const configured = Boolean(process.env[input.envName])
  const testRoute = input.testRoute ?? null
  return {
    key: input.key,
    label: input.label,
    kind: 'tool',
    status: configured ? (testRoute ? 'Needs live test' : 'Needs test route') : 'Needs key',
    configured,
    connected: false,
    source: configured ? 'env' : 'missing',
    testRoute,
    note: input.note,
    envVars: [input.envName],
    lastTestResult: configured ? 'Configured from environment; no passed live test recorded' : 'Not tested',
    blocker: configured ? (testRoute ? `Run ${testRoute}` : 'Add a test route to validate this service') : `Set ${input.envName}`,
    unlocks: input.note,
  }
}

async function entryForKey(input: {
  key: string
  label: string
  kind: SettingsTruthEntry['kind']
  note: string
  envKey?: CoreProvider
  envVars?: string[]
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
        : 'Needs live test'
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
    envVars: input.envVars ?? (input.envKey ? [String(input.envKey).toUpperCase()] : []),
    lastTestResult: connected ? 'Passed' : configured ? 'No passed live test recorded' : 'Not tested',
    blocker: connected ? '' : configured ? (testRoute ? `Run ${testRoute}` : 'Needs test route') : `Set ${input.envVars?.join(' or ') ?? input.envKey ?? input.key}`,
    unlocks: input.note,
  }
}

export async function getPlatformSettingsTruth(): Promise<{
  providers: SettingsTruthEntry[]
  tools: SettingsTruthEntry[]
  storage: SettingsTruthEntry
  connectedCount: number
  approvedProviderKeys: ApprovedProviderKey[]
  governance: ReturnType<typeof getCapabilityGovernanceMatrix>
}> {
  const providers = await Promise.all(
    APPROVED_AI_PROVIDERS.map((provider) => entryForKey({
      key: provider.key,
      label: provider.displayName,
      kind: 'provider',
      note: provider.notes,
      envKey: provider.key as CoreProvider,
      envVars: [...provider.envVars],
    })),
  )

  const tools = await Promise.all(
    TOOL_ENTRIES.map((tool) => {
      const toolEntry = tool as { key: string; label: string; note: string; envName?: string; envKey?: string; testRoute?: string | null }
      if (toolEntry.envName) {
        return Promise.resolve(envEntry({
          key: toolEntry.key,
          label: toolEntry.label,
          note: toolEntry.note,
          envName: toolEntry.envName,
          testRoute: toolEntry.testRoute ?? TEST_ROUTES[toolEntry.key] ?? null,
        }))
      }
      return entryForKey({
        key: tool.key,
        label: tool.label,
        kind: 'tool',
        note: tool.note,
        envKey: tool.key === 'crawl4ai' || tool.key === 'playwright' ? undefined : (toolEntry.envKey ?? tool.key) as CoreProvider,
        testRoute: tool.key === 'firecrawl' ? '/api/admin/research/status' : TEST_ROUTES[tool.key] ?? null,
      })
    }),
  )

  const storageWritable = checkWritable(LOCAL_STORE_FILES.artifacts)
  const storage: SettingsTruthEntry = {
    key: 'storage',
    label: 'VPS/local storage',
    kind: 'storage',
    status: storageWritable.writable ? 'Connected' : 'Failed',
    configured: true,
    connected: storageWritable.writable,
    source: 'local',
    testRoute: TEST_ROUTES.storage,
    note: `Storage root: ${getStorageRoot()}`,
    envVars: ['AMARKTAI_STORAGE_ROOT'],
    lastTestResult: storageWritable.writable ? 'Writable check passed' : 'Writable check failed',
    blocker: storageWritable.writable ? '' : 'Storage root is not writable',
    unlocks: 'Artifacts, generated media, logs, and local runtime reports.',
  }

  const connectedCount = new Set([...providers, ...tools].filter((item) => item.connected).map((item) => item.key)).size

  return {
    providers,
    tools,
    storage,
    connectedCount,
    approvedProviderKeys: APPROVED_AI_PROVIDERS.map((provider) => provider.key),
    governance: getCapabilityGovernanceMatrix(),
  }
}
