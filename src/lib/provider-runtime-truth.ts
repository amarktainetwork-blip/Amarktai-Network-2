import { decryptVaultKey } from '@/lib/crypto-vault'
import { prisma } from '@/lib/prisma'
import { isUsableServiceKey } from '@/lib/service-vault'
import { getAllHfSpecialistRegistryEntries } from '@/lib/hf-specialist-config'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import type { ProviderId, ProviderTruthDefinition } from '@/lib/providers/provider-types'

export type ProviderConfigSource =
  | 'integration_config'
  | 'ai_provider'
  | 'env'
  | 'default'
  | 'missing'

export interface ProviderCredentialTruth {
  present: boolean
  source: ProviderConfigSource
  masked: string | null
  aliasesChecked: string[]
}

export interface ProviderBaseUrlTruth {
  family: string
  currentValue: string
  defaultValue: string
  envName: string | null
  source: ProviderConfigSource
}

export interface ProviderRuntimeFlagTruth {
  name: string
  currentValue: string
  requiredValue: string
  source: 'env' | 'default'
  blocking: boolean
  usedBy: string[]
  nextAction: string
}

export interface ProviderEndpointRequirementTruth {
  capability: string
  type: 'specialist_endpoint' | 'dedicated_endpoint' | 'provider_endpoint' | 'policy'
  envNames: string[]
  configured: boolean
  currentValue: string
  requiredValue: string
  nextAction: string
}

export interface ProviderDbConsistencyTruth {
  integrationConfigPresent: boolean
  aiProviderPresent: boolean
  integrationConfigEnabled: boolean | null
  aiProviderEnabled: boolean | null
  aiProviderHealth: string | null
  warnings: string[]
}

export interface ProviderRuntimeConfigTruth {
  provider: ProviderId
  displayName: string
  credential: ProviderCredentialTruth
  baseUrls: ProviderBaseUrlTruth[]
  runtimeFlags: ProviderRuntimeFlagTruth[]
  endpointRequirements: ProviderEndpointRequirementTruth[]
  db: ProviderDbConsistencyTruth
  accountPolicy: string
  dashboardDisplayStatus: 'ready' | 'configured' | 'blocked' | 'not_configured'
  runtimeExecutableStatus: 'executable_possible' | 'blocked' | 'not_configured'
  blockers: string[]
  nextActions: string[]
}

type IntegrationRow = {
  apiKey?: string | null
  apiUrl?: string | null
  enabled?: boolean | null
  notes?: string | null
}

type AiProviderRow = {
  apiKey?: string | null
  baseUrl?: string | null
  enabled?: boolean | null
  healthStatus?: string | null
  healthMessage?: string | null
  notes?: string | null
}

export interface ProviderRuntimeTruthOptions {
  env?: NodeJS.ProcessEnv
  integrationRow?: IntegrationRow | null
  aiProviderRow?: AiProviderRow | null
  skipDb?: boolean
}

export async function collectProviderRuntimeConfigTruth(
  options: ProviderRuntimeTruthOptions = {},
): Promise<ProviderRuntimeConfigTruth[]> {
  return Promise.all(PROVIDER_TRUTH.map((provider) => getProviderRuntimeConfigTruth(provider.id, options)))
}

export async function getProviderRuntimeConfigTruth(
  providerId: ProviderId,
  options: ProviderRuntimeTruthOptions = {},
): Promise<ProviderRuntimeConfigTruth> {
  const provider = requireProvider(providerId)
  const env = options.env ?? process.env
  const [integrationRow, aiProviderRow] = await resolveDbRows(providerId, options)
  const credential = resolveCredential(provider, env, integrationRow, aiProviderRow)
  const baseUrls = provider.endpoints.map((endpoint) =>
    resolveBaseUrl(endpoint, env, integrationRow, aiProviderRow),
  )
  const runtimeFlags = runtimeFlagsFor(provider, env)
  const endpointRequirements = endpointRequirementsFor(provider, env)
  const dbWarnings = dbConsistencyWarnings(integrationRow, aiProviderRow, credential)
  const blockers = [
    ...(!credential.present ? ['Provider credential is not configured in integrationConfig, aiProvider, or env.'] : []),
    ...runtimeFlags.filter((flag) => flag.blocking).map((flag) =>
      `${flag.name}=${flag.currentValue}; required ${flag.requiredValue}.`,
    ),
    ...endpointRequirements.filter((entry) => !entry.configured).map((entry) =>
      `${entry.capability} requires ${entry.envNames.join(' or ')}.`,
    ),
  ]
  const nextActions = [
    ...(!credential.present ? [`Store ${provider.displayName} credential in integrationConfig.${provider.id} or one of: ${provider.envAliases.join(', ')}.`] : []),
    ...runtimeFlags.filter((flag) => flag.blocking).map((flag) => flag.nextAction),
    ...endpointRequirements.filter((entry) => !entry.configured).map((entry) => entry.nextAction),
    ...dbWarnings,
  ]
  const dashboardDisplayStatus = !credential.present
    ? 'not_configured'
    : blockers.length > 0
      ? 'blocked'
      : aiProviderRow?.healthStatus === 'healthy'
        ? 'ready'
        : 'configured'
  return {
    provider: provider.id,
    displayName: provider.displayName,
    credential,
    baseUrls,
    runtimeFlags,
    endpointRequirements,
    db: {
      integrationConfigPresent: Boolean(integrationRow),
      aiProviderPresent: Boolean(aiProviderRow),
      integrationConfigEnabled: integrationRow?.enabled ?? null,
      aiProviderEnabled: aiProviderRow?.enabled ?? null,
      aiProviderHealth: aiProviderRow?.healthStatus ?? null,
      warnings: dbWarnings,
    },
    accountPolicy: accountPolicyFor(provider, env),
    dashboardDisplayStatus,
    runtimeExecutableStatus: !credential.present
      ? 'not_configured'
      : blockers.length > 0
        ? 'blocked'
        : 'executable_possible',
    blockers,
    nextActions,
  }
}

function requireProvider(providerId: ProviderId): ProviderTruthDefinition {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  return provider
}

async function resolveDbRows(
  providerId: ProviderId,
  options: ProviderRuntimeTruthOptions,
): Promise<[IntegrationRow | null, AiProviderRow | null]> {
  if (options.integrationRow !== undefined || options.aiProviderRow !== undefined || options.skipDb) {
    return [options.integrationRow ?? null, options.aiProviderRow ?? null]
  }
  const [integrationRow, aiProviderRow] = await Promise.all([
    prisma.integrationConfig.findUnique({
      where: { key: providerId },
      select: { apiKey: true, apiUrl: true, enabled: true, notes: true },
    }).catch(() => null),
    prisma.aiProvider.findUnique({
      where: { providerKey: providerId },
      select: {
        apiKey: true,
        baseUrl: true,
        enabled: true,
        healthStatus: true,
        healthMessage: true,
        notes: true,
      },
    }).catch(() => null),
  ])
  return [integrationRow, aiProviderRow]
}

function resolveCredential(
  provider: ProviderTruthDefinition,
  env: NodeJS.ProcessEnv,
  integrationRow: IntegrationRow | null,
  aiProviderRow: AiProviderRow | null,
): ProviderCredentialTruth {
  const integrationKey = decryptUsable(integrationRow?.apiKey)
  if (integrationKey) {
    return {
      present: true,
      source: 'integration_config',
      masked: maskSecret(integrationKey),
      aliasesChecked: [...provider.envAliases],
    }
  }
  const aiProviderKey = decryptUsable(aiProviderRow?.apiKey)
  if (aiProviderKey) {
    return {
      present: true,
      source: 'ai_provider',
      masked: maskSecret(aiProviderKey),
      aliasesChecked: [...provider.envAliases],
    }
  }
  for (const alias of provider.envAliases) {
    const value = env[alias]?.trim()
    if (isUsableServiceKey(value)) {
      return {
        present: true,
        source: 'env',
        masked: maskSecret(value),
        aliasesChecked: [...provider.envAliases],
      }
    }
  }
  return {
    present: false,
    source: 'missing',
    masked: null,
    aliasesChecked: [...provider.envAliases],
  }
}

function resolveBaseUrl(
  endpoint: ProviderTruthDefinition['endpoints'][number],
  env: NodeJS.ProcessEnv,
  integrationRow: IntegrationRow | null,
  aiProviderRow: AiProviderRow | null,
): ProviderBaseUrlTruth {
  const integrationUrl = integrationRow?.apiUrl?.trim()
  if (integrationUrl) {
    return {
      family: endpoint.family,
      currentValue: normalizeUrl(integrationUrl),
      defaultValue: endpoint.baseUrl,
      envName: endpoint.baseUrlEnv ?? null,
      source: 'integration_config',
    }
  }
  const aiProviderUrl = aiProviderRow?.baseUrl?.trim()
  if (aiProviderUrl) {
    return {
      family: endpoint.family,
      currentValue: normalizeUrl(aiProviderUrl),
      defaultValue: endpoint.baseUrl,
      envName: endpoint.baseUrlEnv ?? null,
      source: 'ai_provider',
    }
  }
  if (endpoint.baseUrlEnv && env[endpoint.baseUrlEnv]?.trim()) {
    return {
      family: endpoint.family,
      currentValue: normalizeUrl(env[endpoint.baseUrlEnv]!),
      defaultValue: endpoint.baseUrl,
      envName: endpoint.baseUrlEnv,
      source: 'env',
    }
  }
  return {
    family: endpoint.family,
    currentValue: normalizeUrl(endpoint.baseUrl),
    defaultValue: endpoint.baseUrl,
    envName: endpoint.baseUrlEnv ?? null,
    source: 'default',
  }
}

function runtimeFlagsFor(
  provider: ProviderTruthDefinition,
  env: NodeJS.ProcessEnv,
): ProviderRuntimeFlagTruth[] {
  const flags: ProviderRuntimeFlagTruth[] = []
  if (provider.id === 'together') {
    const value = env.TOGETHER_VIDEO_RUNTIME_ENABLED?.trim().toLowerCase() || 'false'
    flags.push({
      name: 'TOGETHER_VIDEO_RUNTIME_ENABLED',
      currentValue: value,
      requiredValue: 'true',
      source: env.TOGETHER_VIDEO_RUNTIME_ENABLED ? 'env' : 'default',
      blocking: value !== 'true',
      usedBy: ['video', 'image_to_video', 'adult_video'],
      nextAction: 'Set TOGETHER_VIDEO_RUNTIME_ENABLED=true only after /videos endpoint proof succeeds; current VPS proof saw HTTP 404.',
    })
  }
  if (provider.id === 'mimo') {
    const value = env.MIMO_RUNTIME_API_ENABLED?.trim().toLowerCase() || 'false'
    flags.push({
      name: 'MIMO_RUNTIME_API_ENABLED',
      currentValue: value,
      requiredValue: 'true',
      source: env.MIMO_RUNTIME_API_ENABLED ? 'env' : 'default',
      blocking: value !== 'true',
      usedBy: ['tts', 'stt', 'agents'],
      nextAction: 'Set MIMO_RUNTIME_API_ENABLED=true only when Xiaomi MiMo backend runtime API access is confirmed beyond token-plan catalog access.',
    })
  }
  return flags
}

function endpointRequirementsFor(
  provider: ProviderTruthDefinition,
  env: NodeJS.ProcessEnv,
): ProviderEndpointRequirementTruth[] {
  if (provider.id === 'huggingface') {
    return getAllHfSpecialistRegistryEntries().map((entry) => ({
      capability: entry.capability,
      type: entry.executionMode === 'specialist_endpoint'
        ? 'specialist_endpoint'
        : entry.adultOnly
          ? 'policy'
          : 'provider_endpoint',
      envNames: entry.requiredEnv,
      configured: entry.configured,
      currentValue: entry.configured ? (entry.endpoint ?? 'model_api') : 'missing',
      requiredValue: entry.executionMode === 'specialist_endpoint'
        ? 'configured endpoint/account contract'
        : entry.adultOnly
          ? 'adult gate plus configured specialist registry entry'
          : 'Hugging Face router model API execution',
      nextAction: entry.configured
        ? 'No action required for this endpoint requirement.'
        : `Configure ${entry.requiredEnv.join(' or ')} for ${entry.capability} before routing this provider/model as executable.`,
    }))
  }
  if (provider.id === 'together') {
    return [
      endpointRequirement('rerank', 'dedicated_endpoint', ['TOGETHER_DEDICATED_ENDPOINTS_JSON'], env),
      endpointRequirement('video', 'dedicated_endpoint', ['TOGETHER_VIDEO_RUNTIME_ENABLED', 'TOGETHER_VIDEO_BASE_URL'], env),
      endpointRequirement('image_to_video', 'dedicated_endpoint', ['TOGETHER_VIDEO_RUNTIME_ENABLED', 'TOGETHER_VIDEO_BASE_URL'], env),
    ]
  }
  return []
}

function endpointRequirement(
  capability: string,
  type: ProviderEndpointRequirementTruth['type'],
  envNames: string[],
  env: NodeJS.ProcessEnv,
  defaultValue = '',
): ProviderEndpointRequirementTruth {
  const configured = Boolean(defaultValue) || envNames.some((name) => Boolean(env[name]?.trim()))
  return {
    capability,
    type,
    envNames,
    configured,
    currentValue: configured ? (defaultValue || 'configured') : 'missing',
    requiredValue: type === 'provider_endpoint' ? defaultValue || 'provider endpoint URL' : 'configured endpoint/account contract',
    nextAction: configured
      ? 'No action required for this endpoint requirement.'
      : `Configure ${envNames.join(' or ')} for ${capability} before routing this provider/model as executable.`,
  }
}

function dbConsistencyWarnings(
  integrationRow: IntegrationRow | null,
  aiProviderRow: AiProviderRow | null,
  credential: ProviderCredentialTruth,
): string[] {
  const warnings: string[] = []
  if (credential.source === 'integration_config' && aiProviderRow?.enabled === false) {
    warnings.push('integrationConfig has a credential, but aiProvider.enabled is false; dashboard health must not override runtime credential truth.')
  }
  if (
    credential.source === 'integration_config'
    && aiProviderRow?.healthStatus
    && !['healthy', 'configured'].includes(aiProviderRow.healthStatus)
  ) {
    warnings.push(`integrationConfig has a credential, but aiProvider health is ${aiProviderRow.healthStatus}; show as configured with stale/degraded dashboard health, not ready.`)
  }
  if (integrationRow?.apiUrl?.trim() && aiProviderRow?.baseUrl?.trim() && normalizeUrl(integrationRow.apiUrl) !== normalizeUrl(aiProviderRow.baseUrl)) {
    warnings.push('integrationConfig.apiUrl and aiProvider.baseUrl differ; integrationConfig should be treated as the runtime source until reconciled.')
  }
  return warnings
}

function accountPolicyFor(provider: ProviderTruthDefinition, env: NodeJS.ProcessEnv): string {
  if (provider.id === 'mimo') {
    return env.MIMO_RUNTIME_API_ENABLED?.trim().toLowerCase() === 'true'
      ? 'Runtime API enabled.'
      : 'Token-plan/catalog access only; backend runtime execution is blocked for non-proven specialist routes.'
  }
  if (provider.id === 'huggingface') return 'Inference Provider and curated model API routes are distinct from specialist endpoints.'
  if (provider.id === 'together') return 'Catalog models remain visible; video/rerank execution requires endpoint proof/config.'
  return 'Account policy is provider default.'
}

function decryptUsable(value: string | null | undefined): string | null {
  if (!value) return null
  const decrypted = decryptVaultKey(value)
  return isUsableServiceKey(decrypted) ? decrypted.trim() : null
}

function maskSecret(value: string | null | undefined): string | null {
  if (!isUsableServiceKey(value)) return null
  const trimmed = value.trim()
  if (trimmed.length <= 8) return 'configured'
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}
