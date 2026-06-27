import { decryptVaultKey } from '@/lib/crypto-vault'
import { prisma } from '@/lib/prisma'
import { getProviderMeshNode, sanitizeProviderError, type ProviderMeshId } from '@/lib/provider-mesh'

export type MeshTestNotes = {
  lastTestStatus?: 'passed' | 'failed' | 'needs_live_test'
  lastTestPassed?: boolean
  lastTestedAt?: string
  capabilities?: string[]
  lastError?: string
  detail?: string
  [key: string]: unknown
}
function parseNotes(raw?: string | null): MeshTestNotes {
  try {
    const parsed = JSON.parse(raw || '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MeshTestNotes : {}
  } catch {
    return {}
  }
}

export async function getMeshCredential(id: ProviderMeshId): Promise<string | null> {
  const node = getProviderMeshNode(id)
  const [row, providerRow] = await Promise.all([
    prisma.integrationConfig.findUnique({
      where: { key: id },
      select: { apiKey: true },
    }).catch(() => null),
    node?.kind === 'provider' && prisma.aiProvider
      ? prisma.aiProvider.findUnique({
        where: { providerKey: id },
        select: { apiKey: true },
      }).catch(() => null)
      : Promise.resolve(null),
  ])

  if (row?.apiKey) {
    const decrypted = decryptVaultKey(row.apiKey)
    if (decrypted?.trim()) return decrypted.trim()
  }
  if (providerRow?.apiKey) {
    const decrypted = decryptVaultKey(providerRow.apiKey)
    if (decrypted?.trim()) return decrypted.trim()
  }

  for (const envName of node?.envAliases ?? []) {
    const value = process.env[envName]?.trim()
    if (value) return value
  }
  return null
}

export async function getMeshTestNotes(id: ProviderMeshId): Promise<MeshTestNotes> {
  const node = getProviderMeshNode(id)
  const [row, providerRow] = await Promise.all([
    prisma.integrationConfig.findUnique({
      where: { key: id },
      select: { notes: true },
    }).catch(() => null),
    node?.kind === 'provider' && prisma.aiProvider
      ? prisma.aiProvider.findUnique({
        where: { providerKey: id },
        select: { healthStatus: true, healthMessage: true, lastCheckedAt: true },
      }).catch(() => null)
      : Promise.resolve(null),
  ])
  const notes = parseNotes(row?.notes)
  if (notes.lastTestStatus) return notes
  if (!providerRow?.lastCheckedAt) return notes
  const passed = providerRow.healthStatus === 'healthy'
  return {
    ...notes,
    lastTestStatus: passed ? 'passed' : providerRow.healthStatus === 'error' || providerRow.healthStatus === 'degraded' ? 'failed' : 'needs_live_test',
    lastTestPassed: passed,
    lastTestedAt: providerRow.lastCheckedAt.toISOString(),
    lastError: passed ? '' : providerRow.healthMessage,
    detail: providerRow.healthMessage,
  }
}

export async function recordMeshTestResult(input: {
  id: ProviderMeshId
  success: boolean
  capabilities: readonly string[]
  detail?: string
  error?: unknown
  metadata?: Record<string, unknown>
}) {
  const node = getProviderMeshNode(input.id)
  if (!node) return
  const current = await prisma.integrationConfig.findUnique({
    where: { key: input.id },
    select: { notes: true },
  }).catch(() => null)
  const previous = parseNotes(current?.notes)
  const lastError = input.success ? '' : sanitizeProviderError(input.error)
  const notes: MeshTestNotes = {
    ...previous,
    ...input.metadata,
    lastTestStatus: input.success ? 'passed' : 'failed',
    lastTestPassed: input.success,
    lastTestedAt: new Date().toISOString(),
    capabilities: input.success ? [...input.capabilities] : [],
    lastError,
    detail: input.detail?.slice(0, 280) ?? '',
  }

  // Only update notes on an existing row — never create a ghost row with apiKey: ''.
  // If no row exists yet the key has not been saved via Settings, so there is
  // nothing to record; the next Settings key-save will create the row with the
  // real encrypted key.
  await prisma.integrationConfig.updateMany({
    where: { key: input.id },
    data: {
      displayName: node.displayName,
      enabled: true,
      notes: JSON.stringify(notes),
    },
  }).catch(() => null)
}
