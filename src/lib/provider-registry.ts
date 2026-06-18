import {
  AI_PROVIDER_MESH,
  isApprovedDirectProvider,
  type ApprovedDirectProviderId,
  type ProviderCapability,
} from '@/lib/provider-mesh'
import { PROVIDER_TRUTH } from '@/lib/providers/provider-truth'
import {
  getMeshCredential,
  getMeshTestNotes,
  type MeshTestNotes,
} from '@/lib/provider-mesh-status'
import { prisma } from '@/lib/prisma'
import {
  UNIVERSAL_MODEL_ROUTES,
  type UniversalModelRoute,
} from '@/lib/universal-model-catalog'

export type ProviderReadinessState =
  | 'ready'
  | 'configured_untested'
  | 'misconfigured'
  | 'unconfigured'
  | 'unavailable'

export interface ProviderRegistryEntry {
  id: ApprovedDirectProviderId
  displayName: string
  baseUrl: string
  authHeaderName: 'Authorization' | 'api-key'
  authPrefix: string
  capabilities: readonly ProviderCapability[]
  defaultModelsByCapability: Readonly<Record<string, string>>
  supportedModels: readonly string[]
  supportsDynamicModels: boolean
  supportsAsync: boolean
  region?: string
  adapter: string
  readinessCheck: 'models' | 'identity' | 'chat_probe' | 'genx_models'
  adminDiagnostics: boolean
  publicEnabled: boolean
}

export interface ProviderReadiness {
  providerId: ApprovedDirectProviderId
  state: ProviderReadinessState
  configured: boolean
  tested: boolean
  healthy: boolean
  baseUrl: string
  availableModels: number
  message: string
  checkedAt: string | null
}

const DEFAULT_MODELS: Record<ApprovedDirectProviderId, Record<string, string>> = {
  genx: {
    text: 'gpt-5.4-mini',
    reasoning: 'gpt-5.4-mini',
    code: 'gpt-5.3-codex',
    image: 'gpt-image-1',
    video: 'veo-3.1',
    music: 'lyria-2',
    tts: 'gpt-4o-mini-tts',
    stt: 'gpt-4o-transcribe',
  },
  huggingface: {
    text: 'mistralai/Mistral-7B-Instruct-v0.3',
    image: 'stabilityai/stable-diffusion-xl-base-1.0',
    video: 'Wan-AI/Wan2.1-T2V-14B',
    music: 'facebook/musicgen-small',
    tts: 'facebook/mms-tts-eng',
    stt: 'openai/whisper-large-v3',
    embeddings: 'sentence-transformers/all-MiniLM-L6-v2',
  },
  qwen: {
    text: 'qwen-plus',
    reasoning: 'qwen-plus',
    code: 'qwen-plus',
    vision: 'qwen-vl-max',
    image: 'qwen-image-2.0',
    video: 'wan2.1-i2v-turbo',
  },
  mimo: {
    text: 'mimo-v2.5',
    reasoning: 'mimo-v2.5-pro',
    code: 'mimo-v2.5-pro',
    vision: 'mimo-v2.5',
  },
  groq: {
    text: 'llama-3.3-70b-versatile',
    reasoning: 'llama-3.3-70b-versatile',
    code: 'llama-3.3-70b-versatile',
    stt: 'whisper-large-v3-turbo',
  },
  together: {
    text: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    reasoning: 'deepseek-ai/DeepSeek-R1',
    code: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    image: 'black-forest-labs/FLUX.1-schnell',
  },
}

const REGISTRY_OVERRIDES: Record<
  ApprovedDirectProviderId,
  Pick<
    ProviderRegistryEntry,
    'supportsDynamicModels' | 'region' | 'readinessCheck'
  >
> = {
  genx: {
    supportsDynamicModels: true,
    readinessCheck: 'genx_models',
  },
  huggingface: {
    supportsDynamicModels: true,
    readinessCheck: 'identity',
  },
  qwen: {
    supportsDynamicModels: true,
    region: process.env.DASHSCOPE_REGION?.trim() || 'international',
    readinessCheck: 'models',
  },
  mimo: {
    supportsDynamicModels: true,
    readinessCheck: 'models',
  },
  groq: {
    supportsDynamicModels: true,
    readinessCheck: 'chat_probe',
  },
  together: {
    supportsDynamicModels: true,
    readinessCheck: 'models',
  },
}

const modelDiscoveryCache = new Map<
  ApprovedDirectProviderId,
  { expiresAt: number; models: string[] }
>()

export const PROVIDER_REGISTRY: readonly ProviderRegistryEntry[] = AI_PROVIDER_MESH.map((node) => {
  const id = node.id as ApprovedDirectProviderId
  const override = REGISTRY_OVERRIDES[id]
  const truth = PROVIDER_TRUTH.find((provider) => provider.id === id)!
  return {
    id,
    displayName: node.displayName,
    baseUrl: providerBaseUrl(id, node.baseUrl),
    authHeaderName: truth.auth.header === 'Authorization' ? 'Authorization' : 'api-key',
    authPrefix: truth.auth.prefix,
    capabilities: node.capabilities,
    defaultModelsByCapability: DEFAULT_MODELS[id],
    supportedModels: supportedModels(id),
    supportsDynamicModels: override.supportsDynamicModels,
    supportsAsync: node.asyncJobs,
    region: override.region,
    adapter: `${id}_capability_adapter`,
    readinessCheck: override.readinessCheck,
    adminDiagnostics: true,
    publicEnabled: false,
  }
})

function providerBaseUrl(id: ApprovedDirectProviderId, fallback: string): string {
  const env: Partial<Record<ApprovedDirectProviderId, string | undefined>> = {
    genx: process.env.GENX_BASE_URL,
    huggingface: process.env.HUGGINGFACE_BASE_URL,
    qwen: process.env.DASHSCOPE_BASE_URL ?? process.env.QWEN_BASE_URL,
    mimo: process.env.MIMO_BASE_URL,
    groq: process.env.GROQ_BASE_URL,
    together: process.env.TOGETHER_BASE_URL,
  }
  return (env[id]?.trim() || fallback).replace(/\/+$/, '')
}

function supportedModels(provider: ApprovedDirectProviderId): string[] {
  return [...new Set([
    ...UNIVERSAL_MODEL_ROUTES
      .filter((route) => route.provider === provider)
      .map((route) => route.modelId),
    ...Object.values(DEFAULT_MODELS[provider]),
  ])]
}

export function getProviderInfo(id: string): ProviderRegistryEntry | null {
  return isApprovedDirectProvider(id)
    ? PROVIDER_REGISTRY.find((provider) => provider.id === id) ?? null
    : null
}

export function listProvidersByCapability(capability: ProviderCapability): ProviderRegistryEntry[] {
  return PROVIDER_REGISTRY.filter((provider) => provider.capabilities.includes(capability))
}

export function getSupportedModels(
  id: ApprovedDirectProviderId,
  capability?: string,
): string[] {
  if (!capability) return [...(getProviderInfo(id)?.supportedModels ?? [])]
  return UNIVERSAL_MODEL_ROUTES
    .filter((route) =>
      route.provider === id
      && (route.providerCapabilities.includes(capability as ProviderCapability)
        || route.capabilities.includes(capability as UniversalModelRoute['capabilities'][number])),
    )
    .map((route) => route.modelId)
}

export function getDefaultModel(
  id: ApprovedDirectProviderId,
  capability: string,
): string | null {
  const provider = getProviderInfo(id)
  return provider?.defaultModelsByCapability[capability]
    ?? provider?.supportedModels[0]
    ?? null
}

export function validateProviderModel(
  providerId: ApprovedDirectProviderId,
  model: string,
  capability?: string,
): { valid: boolean; reason: string | null } {
  const provider = getProviderInfo(providerId)
  if (!provider) return { valid: false, reason: 'Provider is not approved.' }
  if (!model.trim()) return { valid: false, reason: 'A provider model is required.' }
  if (providerId === 'huggingface' && !model.startsWith('task:') && model.includes('/')) {
    return { valid: true, reason: null }
  }
  const supported = capability
    ? getSupportedModels(providerId, capability)
    : [...provider.supportedModels]
  if (supported.includes(model)) return { valid: true, reason: null }
  if (provider.supportsDynamicModels) {
    return {
      valid: true,
      reason: 'Model requires live provider validation because the provider supports discovery.',
    }
  }
  return {
    valid: false,
    reason: `Model "${model}" is not catalogued for ${provider.displayName}.`,
  }
}

export async function discoverProviderModels(
  providerId: ApprovedDirectProviderId,
  force = false,
): Promise<string[]> {
  const provider = getProviderInfo(providerId)
  if (!provider) return []
  const cached = modelDiscoveryCache.get(providerId)
  if (!force && cached && cached.expiresAt > Date.now()) return [...cached.models]
  if (!provider.supportsDynamicModels || providerId === 'huggingface' || providerId === 'genx') {
    return [...provider.supportedModels]
  }
  const credential = await getMeshCredential(providerId).catch(() => null)
  if (!credential) return [...provider.supportedModels]
  try {
    const response = await fetch(`${provider.baseUrl}/models`, {
      headers: buildProviderAuthHeaders(providerId, credential),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return [...provider.supportedModels]
    const body = await response.json() as {
      data?: Array<{ id?: string }>
      models?: Array<{ id?: string; name?: string }>
    }
    const discovered = [
      ...(body.data ?? []).map((model) => model.id),
      ...(body.models ?? []).map((model) => model.id ?? model.name),
    ].filter((model): model is string => Boolean(model?.trim()))
    const models = [...new Set([...provider.supportedModels, ...discovered])]
    modelDiscoveryCache.set(providerId, {
      models,
      expiresAt: Date.now() + 5 * 60 * 1000,
    })
    return models
  } catch {
    return [...provider.supportedModels]
  }
}

export async function validateProviderModelAsync(
  providerId: ApprovedDirectProviderId,
  model: string,
  capability?: string,
): Promise<{ valid: boolean; reason: string | null }> {
  const staticValidation = validateProviderModel(providerId, model, capability)
  if (!staticValidation.valid) return staticValidation
  const provider = getProviderInfo(providerId)
  if (
    !provider?.supportsDynamicModels
    || providerId === 'huggingface'
    || providerId === 'genx'
  ) {
    return staticValidation
  }
  const models = await discoverProviderModels(providerId)
  return models.includes(model)
    ? { valid: true, reason: null }
    : {
        valid: false,
        reason: `Model "${model}" was not returned by the live ${provider.displayName} model catalog.`,
      }
}

export function clearProviderModelDiscoveryCache() {
  modelDiscoveryCache.clear()
}

export async function getProviderReadiness(
  id: ApprovedDirectProviderId,
): Promise<ProviderReadiness> {
  const provider = getProviderInfo(id)!
  const [credential, notes, row] = await Promise.all([
    getMeshCredential(id).catch(() => null),
    getMeshTestNotes(id).catch(() => ({} as MeshTestNotes)),
    prisma.aiProvider.findUnique({
      where: { providerKey: id },
      select: {
        enabled: true,
        baseUrl: true,
        healthStatus: true,
        healthMessage: true,
        lastCheckedAt: true,
      },
    }).catch(() => null),
  ])
  const configured = Boolean(credential)
  const tested = Boolean(notes.lastTestedAt ?? row?.lastCheckedAt)
  const notesHaveTestResult = notes.lastTestStatus === 'passed' || notes.lastTestStatus === 'failed'
  const passed = notesHaveTestResult
    ? notes.lastTestStatus === 'passed' && notes.lastTestPassed !== false
    : row?.healthStatus === 'healthy'
  const explicitlyFailed = notesHaveTestResult
    ? notes.lastTestStatus === 'failed'
    : row?.healthStatus === 'error' || row?.healthStatus === 'degraded'
  const enabled = row?.enabled !== false
  const availableModels = provider.supportedModels.length
  let state: ProviderReadinessState
  if (!enabled || availableModels === 0) state = 'unavailable'
  else if (!configured) state = 'unconfigured'
  else if (explicitlyFailed) state = 'misconfigured'
  else if (passed) state = 'ready'
  else state = 'configured_untested'

  return {
    providerId: id,
    state,
    configured,
    tested,
    healthy: state === 'ready',
    baseUrl: row?.baseUrl?.trim() || provider.baseUrl,
    availableModels,
    message: String(
      notes.detail
      ?? notes.lastError
      ?? row?.healthMessage
      ?? (state === 'configured_untested'
        ? 'Credential is configured but has not passed a live provider check.'
        : state === 'unconfigured'
          ? 'Provider credential is not configured.'
          : `Provider is ${state}.`),
    ).slice(0, 280),
    checkedAt: notes.lastTestedAt
      ?? row?.lastCheckedAt?.toISOString()
      ?? null,
  }
}

export async function isProviderReady(id: ApprovedDirectProviderId): Promise<boolean> {
  const readiness = await getProviderReadiness(id)
  return readiness.state === 'ready' || readiness.state === 'configured_untested'
}

export function resolveProviderAdapter(id: ApprovedDirectProviderId) {
  return getProviderInfo(id)?.adapter ?? null
}

export function buildProviderAuthHeaders(
  id: ApprovedDirectProviderId,
  credential: string,
): Record<string, string> {
  const provider = getProviderInfo(id)
  if (!provider) return {}
  return {
    [provider.authHeaderName]: `${provider.authPrefix}${credential}`,
  }
}
