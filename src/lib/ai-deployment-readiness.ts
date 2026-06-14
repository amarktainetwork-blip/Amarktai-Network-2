import crypto from 'crypto'
import {
  AI_CAPABILITY_TAXONOMY,
  CONNECTED_APP_AI_SCOPES,
} from '@/lib/ai-capability-taxonomy'
import {
  deriveSigningSecretRef,
  listConnectedApps,
  hashSigningSecret,
  type ConnectedApp,
} from '@/lib/connected-apps'
import { resolveSigningSecret } from '@/lib/webhook-verifier'
import {
  APPROVED_DIRECT_PROVIDER_IDS,
  getProviderMeshNode,
  type ApprovedDirectProviderId,
} from '@/lib/provider-mesh'
import { getMeshCredential } from '@/lib/provider-mesh-status'
import { isUsableServiceKey } from '@/lib/service-vault'
import { resolveHfSpecialistConfig } from '@/lib/hf-specialist-config'
import { getStorageDriver, verifyStorage } from '@/lib/storage-driver'
import { prisma } from '@/lib/prisma'

export type DeploymentReadinessState = 'ready' | 'missing' | 'invalid'

export interface ProviderCredentialReadiness {
  id: ApprovedDirectProviderId
  displayName: string
  state: DeploymentReadinessState
  configured: boolean
  source: 'environment' | 'vault' | 'missing'
  acceptedEnvVars: readonly string[]
  baseUrlConfigured: boolean
  blocker: string | null
}

export interface ConnectedAppReadiness {
  id: string
  slug: string
  status: string
  state: DeploymentReadinessState
  secretRef: string
  secretConfigured: boolean
  hashValid: boolean
  secretMatchesHash: boolean
  scopesValid: boolean
  aiScopes: string[]
  blockers: string[]
}

export async function getProviderCredentialReadiness(): Promise<ProviderCredentialReadiness[]> {
  return Promise.all(APPROVED_DIRECT_PROVIDER_IDS.map(async (id) => {
    const node = getProviderMeshNode(id)!
    const envConfigured = node.envAliases.some((name) => isUsableServiceKey(process.env[name]))
    const credential = await getMeshCredential(id)
    const configured = isUsableServiceKey(credential)
    const source = envConfigured ? 'environment' : configured ? 'vault' : 'missing'
    const baseUrlConfigured = id !== 'genx'
      || Boolean(process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || node.baseUrl)
    return {
      id,
      displayName: node.displayName,
      state: configured && baseUrlConfigured ? 'ready' : 'missing',
      configured,
      source,
      acceptedEnvVars: node.envAliases,
      baseUrlConfigured,
      blocker: !configured
        ? `Configure one of: ${node.envAliases.join(', ')} or save the credential in the provider vault.`
        : !baseUrlConfigured
          ? 'Configure GENX_BASE_URL or GENX_API_URL.'
          : null,
    }
  }))
}

export function inspectConnectedAppReadiness(app: ConnectedApp): ConnectedAppReadiness {
  const blockers: string[] = []
  const secret = resolveSigningSecret(app.signingSecretRef)
  const hashValid = /^[a-f0-9]{64}$/i.test(app.signingSecretHash)
  const secretMatchesHash = Boolean(secret && hashValid && safeEqualHex(hashSigningSecret(secret), app.signingSecretHash))
  const validScopes = new Set<string>([
    'webhook:receive',
    'events:read',
    'artifacts:read',
    'artifacts:write',
    ...CONNECTED_APP_AI_SCOPES,
  ])
  const scopesValid = app.scopes.length > 0 && app.scopes.every((scope) => validScopes.has(scope))
  const aiScopes = app.scopes.filter((scope) => CONNECTED_APP_AI_SCOPES.includes(scope as never))
  const expectedSecretRef = deriveSigningSecretRef(app.slug)

  if (!app.signingSecretRef?.trim()) blockers.push('Signing secret reference is missing.')
  if (app.signingSecretRef && app.signingSecretRef !== expectedSecretRef) {
    blockers.push(`Signing secret reference must be ${expectedSecretRef}.`)
  }
  if (!secret) blockers.push(`Environment variable ${app.signingSecretRef || '(missing reference)'} is not configured.`)
  if (!hashValid) blockers.push('Stored signing secret hash is missing or invalid.')
  if (secret && hashValid && !secretMatchesHash) blockers.push('Configured signing secret does not match the registered hash.')
  if (!scopesValid) blockers.push('One or more registered scopes are invalid.')
  if (aiScopes.length === 0) blockers.push('No connected-app AI execution scope is assigned.')
  if (app.status !== 'active') blockers.push(`App status is ${app.status}.`)

  return {
    id: app.id,
    slug: app.slug,
    status: app.status,
    state: blockers.length === 0 ? 'ready' : secret && hashValid ? 'invalid' : 'missing',
    secretRef: app.signingSecretRef,
    secretConfigured: Boolean(secret),
    hashValid,
    secretMatchesHash,
    scopesValid,
    aiScopes,
    blockers,
  }
}

export function getConnectedAppSigningReadiness(): ConnectedAppReadiness[] {
  return listConnectedApps().map(inspectConnectedAppReadiness)
}

export function getHfSpecialistReadiness() {
  return AI_CAPABILITY_TAXONOMY
    .filter((capability) => capability.providerRoutes.some((route) => route.provider === 'huggingface'))
    .map((capability) => {
      const route = capability.providerRoutes.find((entry) => entry.provider === 'huggingface')
      return resolveHfSpecialistConfig(capability.id, route)
    })
}

export async function getArtifactPersistenceReadiness() {
  const storage = await verifyStorage()
  const database = await prisma.$transaction(async (transaction) => {
    const probe = await transaction.artifact.create({
      data: {
        appSlug: '__deployment_readiness__',
        type: 'report',
        subType: 'database_write_probe',
        title: 'Deployment readiness probe',
        status: 'processing',
        metadata: '{}',
      },
      select: { id: true },
    })
    await transaction.artifact.delete({ where: { id: probe.id } })
    return { configured: true, writable: true, error: null as string | null }
  })
    .then(() => ({ configured: true, writable: true, error: null as string | null }))
    .catch((error) => ({
      configured: Boolean(process.env.DATABASE_URL?.trim()),
      writable: false,
      error: safeOperationalError(error, 'Artifact database write probe failed.'),
    }))

  let roundTrip = { ok: false, error: null as string | null }
  if (storage.configured && storage.writable && storage.readable) {
    const key = `artifacts/.readiness/probe-${process.pid}-${Date.now()}`
    const driver = getStorageDriver()
    try {
      await driver.put(key, Buffer.from('amarktai-readiness', 'utf8'), 'text/plain')
      const read = await driver.get(key)
      roundTrip = {
        ok: read?.toString('utf8') === 'amarktai-readiness',
        error: read ? null : 'Storage probe could not be read back.',
      }
    } catch (error) {
      roundTrip = { ok: false, error: safeOperationalError(error, 'Storage round-trip failed.') }
    } finally {
      await driver.delete(key).catch(() => false)
    }
  }

  return {
    storage,
    database,
    roundTrip,
    ready: storage.configured && storage.writable && storage.readable && database.writable && roundTrip.ok,
  }
}

export async function getAiDeploymentReadiness() {
  const [providers, artifacts] = await Promise.all([
    getProviderCredentialReadiness(),
    getArtifactPersistenceReadiness(),
  ])
  const huggingFace = getHfSpecialistReadiness()
  const connectedApps = getConnectedAppSigningReadiness()
  const blockers = [
    ...providers.flatMap((provider) => provider.blocker ? [provider.blocker] : []),
    ...huggingFace.filter((route) => !route.configured)
      .map((route) => `Hugging Face ${route.capability}: configure ${route.requiredEnv.join(' or ')}.`),
    ...connectedApps.flatMap((app) => app.blockers.map((blocker) => `${app.slug}: ${blocker}`)),
    ...(!artifacts.ready ? ['Artifact storage/database readiness is incomplete.'] : []),
  ]

  return {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    ready: blockers.length === 0,
    summary: {
      capabilities: AI_CAPABILITY_TAXONOMY.length,
      providersReady: providers.filter((provider) => provider.state === 'ready').length,
      providersTotal: providers.length,
      hfSpecialistRoutesReady: huggingFace.filter((route) => route.configured).length,
      hfSpecialistRoutesTotal: huggingFace.length,
      connectedAppsReady: connectedApps.filter((app) => app.state === 'ready').length,
      connectedAppsTotal: connectedApps.length,
      artifactPersistenceReady: artifacts.ready,
      blockerCount: blockers.length,
    },
    providers,
    huggingFace,
    artifacts,
    connectedApps,
    blockers,
  }
}

function safeEqualHex(left: string, right: string): boolean {
  try {
    const leftBuffer = Buffer.from(left, 'hex')
    const rightBuffer = Buffer.from(right, 'hex')
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

function safeOperationalError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : fallback
  return raw
    .replace(/(?:mysql|mariadb):\/\/[^\s"']+/gi, '[redacted-database-url]')
    .replace(/\b(?:password|secret|token|api[-_]?key)=\S+/gi, '[redacted-credential]')
    .slice(0, 400)
}
