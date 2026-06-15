import {
  AI_CAPABILITY_TAXONOMY,
  type AiCapabilityDefinition,
} from '@/lib/ai-capability-taxonomy'
import {
  getProviderCapabilityAdapter,
  type CapabilityAdapterInput,
  type CapabilityAdapterResult,
  type CapabilityReference,
} from '@/lib/ai-capability-adapters'
import { executeCapability } from '@/lib/capability-router'
import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { getConnectedApp, type ConnectedApp } from '@/lib/connected-apps'
import { recordAcceptedEvent } from '@/lib/connected-app-events'
import { appendRecord, findRecord, LOCAL_STORE_FILES, updateRecord } from '@/lib/local-json-store'
import { loadAppSafetyConfigFromDB } from '@/lib/content-filter'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature } from '@/lib/webhook-verifier'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'
import {
  resolveRoutingQuality,
  type StoredRoutingQualityTier,
  type RoutingQualityTier,
} from '@/lib/capability-routing-policy'

export type ConnectedAppCapabilityJobStatus =
  | 'processing'
  | 'completed'
  | 'needs_configuration'
  | 'blocked'
  | 'failed'

export interface ConnectedAppCapabilityRequest {
  capability: string
  prompt?: string
  text?: string
  inputs?: Record<string, unknown>
  references?: CapabilityReference[]
  context?: {
    brandKitReference?: string
    appContextReference?: string
    inline?: Record<string, unknown>
  }
  provider?: ApprovedDirectProviderId
  model?: string
  endpointUrl?: string
  qualityTier?: RoutingQualityTier
  callbackUrl?: string
  referenceMetadata?: Record<string, unknown>
}

export interface ConnectedAppCapabilityJob {
  id: string
  appId: string
  appSlug: string
  capability: string
  requiredScope: string
  provider: ApprovedDirectProviderId | 'amarktai'
  model: string
  adapter: string
  qualityTier: StoredRoutingQualityTier
  status: ConnectedAppCapabilityJobStatus
  providerJobId: string | null
  artifactId: string | null
  artifactUrl: string | null
  result: unknown | null
  error: string | null
  providerAttempts: Array<{
    provider: ApprovedDirectProviderId
    model: string
    adapter: string
    outputType: string
    status: string
    latencyMs: number
    errorCategory: string | null
    error: string | null
  }>
  request: ConnectedAppCapabilityRequest
  createdAt: string
  updatedAt: string
}

export type CapabilityAuthenticationResult =
  | {
      ok: true
      app: ConnectedApp
      capability: AiCapabilityDefinition
      request: ConnectedAppCapabilityRequest
    }
  | { ok: false; status: number; error: string }

const LONG_RUNNING_CAPABILITIES = new Set(
  AI_CAPABILITY_TAXONOMY.filter((capability) => capability.longRunning).map((capability) => capability.id),
)

export function authenticateConnectedAppCapabilityRequest(input: {
  appId: string | null
  timestampHeader: string | null
  signatureHeader: string | null
  rawBody: string
}): CapabilityAuthenticationResult {
  if (!input.appId) return { ok: false, status: 400, error: 'Missing x-amarktai-app-id header' }
  const app = getConnectedApp(input.appId)
  if (!app) return { ok: false, status: 401, error: 'Unknown app' }
  if (app.status !== 'active') return { ok: false, status: 403, error: 'App is not active' }

  const verification = verifyWebhookSignature({
    rawBody: input.rawBody,
    timestampHeader: input.timestampHeader,
    signatureHeader: input.signatureHeader,
    signingSecretRef: app.signingSecretRef,
  })
  if (!verification.ok) return { ok: false, status: 401, error: 'Request verification failed' }

  let request: ConnectedAppCapabilityRequest
  try {
    request = JSON.parse(input.rawBody) as ConnectedAppCapabilityRequest
  } catch {
    return { ok: false, status: 400, error: 'Request body must be valid JSON' }
  }
  const capability = AI_CAPABILITY_TAXONOMY.find((entry) => entry.id === request.capability)
  if (!capability) return { ok: false, status: 400, error: 'Unknown capability' }
  if (!app.scopes.includes(capability.requiredScope)) {
    return { ok: false, status: 403, error: `Missing required scope: ${capability.requiredScope}` }
  }
  const validationError = validateCapabilityRequest(capability, request)
  if (validationError) return { ok: false, status: 400, error: validationError }
  return { ok: true, app, capability, request }
}

export function authenticateConnectedAppJobRequest(input: {
  appId: string | null
  timestampHeader: string | null
  signatureHeader: string | null
  rawBody?: string
}): { ok: true; app: ConnectedApp } | { ok: false; status: number; error: string } {
  if (!input.appId) return { ok: false, status: 400, error: 'Missing x-amarktai-app-id header' }
  const app = getConnectedApp(input.appId)
  if (!app) return { ok: false, status: 401, error: 'Unknown app' }
  if (app.status !== 'active') return { ok: false, status: 403, error: 'App is not active' }
  const verification = verifyWebhookSignature({
    rawBody: input.rawBody ?? '',
    timestampHeader: input.timestampHeader,
    signatureHeader: input.signatureHeader,
    signingSecretRef: app.signingSecretRef,
  })
  return verification.ok
    ? { ok: true, app }
    : { ok: false, status: 401, error: 'Request verification failed' }
}

export function validateCapabilityRequest(
  capability: AiCapabilityDefinition,
  request: ConnectedAppCapabilityRequest,
): string | null {
  if (request.provider || request.model || request.endpointUrl) {
    return 'Connected apps request capabilities; provider, model, and endpoint selection are owned by AmarktAI.'
  }
  const references = request.references ?? []
  if (!request.prompt?.trim() && !request.text?.trim() && !request.inputs && references.length === 0) {
    return 'A prompt, text, structured inputs, or reference is required'
  }
  for (const reference of references) {
    if (reference.url && !isPublicHttpsUrl(reference.url)) {
      return 'Reference URLs must be public HTTPS URLs'
    }
  }
  if (request.callbackUrl && !isPublicHttpsUrl(request.callbackUrl)) {
    return 'Callback URLs must be public HTTPS URLs'
  }
  if (
    capability.id === 'voice_clone_or_voice_design'
    && request.inputs?.consentConfirmed !== true
  ) {
    return 'Voice cloning or design requires explicit recorded-speaker consent'
  }
  if (
    capability.id === 'robotics'
    && !['planning', 'simulation'].includes(String(request.inputs?.mode ?? ''))
  ) {
    return 'Robotics execution is limited to planning or simulation; physical actuation is blocked'
  }
  if (capability.requiredSourceInput && !hasRequiredSource(request, capability.requiredSourceInput)) {
    return `${capability.label} requires a ${capability.requiredSourceInput} reference or input.`
  }
  return null
}

function hasRequiredSource(
  request: ConnectedAppCapabilityRequest,
  required: NonNullable<AiCapabilityDefinition['requiredSourceInput']>,
): boolean {
  const referenceKinds = required === 'avatar' ? ['image'] : [required]
  if ((request.references ?? []).some((reference) =>
    referenceKinds.includes(reference.kind)
    && Boolean(reference.url || reference.artifactId || reference.data),
  )) return true

  const inputs = request.inputs ?? {}
  const candidateKeys = required === 'avatar'
    ? ['avatar', 'avatarUrl', 'avatarArtifactId', 'sourceImage', 'sourceImageUrl']
    : [
        required,
        `${required}Url`,
        `${required}ArtifactId`,
        `source${required[0].toUpperCase()}${required.slice(1)}`,
        `source${required[0].toUpperCase()}${required.slice(1)}Url`,
      ]
  return candidateKeys.some((key) => {
    const value = inputs[key]
    return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
  })
}

function isPublicHttpsUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:'
      && host !== 'localhost'
      && host !== '0.0.0.0'
      && !host.startsWith('127.')
      && !host.startsWith('10.')
      && !host.startsWith('192.168.')
      && !host.startsWith('169.254.')
      && !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  } catch {
    return false
  }
}

export async function executeConnectedAppCapability(input: {
  app: ConnectedApp
  capability: AiCapabilityDefinition
  request: ConnectedAppCapabilityRequest
}): Promise<ConnectedAppCapabilityJob> {
  const qualityTier = await resolveRoutingQuality({
    requested: input.request.qualityTier,
    appSlug: input.app.slug,
    surface: 'connected_apps',
  })
  const context = await loadExecutionContext(input.app.slug, input.request)
  const result = await executeCapability({
    capability: input.capability.id,
    input: input.request.prompt?.trim() || input.request.text?.trim() || JSON.stringify(input.request.inputs ?? {}),
    appId: input.app.slug,
    files: (input.request.references ?? [])
      .map((reference) => reference.url ?? reference.artifactId)
      .filter((value): value is string => Boolean(value)),
    saveArtifact: input.capability.createsArtifact,
    metadata: {
      ...input.request.inputs,
      references: input.request.references ?? [],
      context,
      routingProfile: qualityTier,
      callbackUrl: input.request.callbackUrl ?? null,
      referenceMetadata: input.request.referenceMetadata ?? null,
      connectedAppId: input.app.id,
    },
  })
  const now = new Date().toISOString()
  const status: ConnectedAppCapabilityJobStatus = result.success
    ? result.status === 'processing' ? 'processing' : 'completed'
    : result.readiness === 'NEEDS_CONFIGURATION'
      ? 'needs_configuration'
      : result.readiness === 'BLOCKED' || result.readiness === 'NEEDS_INPUT'
        ? 'blocked'
        : 'failed'
  const provider = isApprovedConnectedProvider(result.provider) ? result.provider : 'amarktai'
  const job = appendRecord<Omit<ConnectedAppCapabilityJob, 'id'>>(
    LOCAL_STORE_FILES.connectedAppCapabilityJobs,
    {
      appId: input.app.id,
      appSlug: input.app.slug,
      capability: input.capability.id,
      requiredScope: input.capability.requiredScope,
      provider,
      model: result.model ?? '',
      adapter: result.providerAttempts?.at(-1)?.adapter ?? '',
      qualityTier,
      status,
      providerJobId: result.providerJobId ?? null,
      artifactId: result.artifactId ?? null,
      artifactUrl: result.artifactUrl ?? null,
      result: result.output,
      error: result.error ?? null,
      providerAttempts: (result.providerAttempts ?? []).map((attempt) => ({
        provider: attempt.provider as ApprovedDirectProviderId,
        model: attempt.model,
        adapter: attempt.adapter ?? '',
        outputType: attempt.outputType ?? '',
        status: attempt.status,
        latencyMs: attempt.latencyMs ?? 0,
        errorCategory: attempt.errorCategory ?? null,
        error: attempt.error ?? null,
      })),
      request: sanitizeRequest(input.request),
      createdAt: now,
      updatedAt: now,
    },
  ) as ConnectedAppCapabilityJob
  recordAcceptedEvent({
    appId: input.app.id,
    eventType: 'capability.execution',
    payload: {
      jobId: job.id,
      capability: job.capability,
      provider: job.provider,
      qualityTier: job.qualityTier,
      status: job.status,
      artifactId: job.artifactId,
      fallbackUsed: job.providerAttempts.length > 1,
      callbackConfigured: Boolean(job.request.callbackUrl),
      referenceMetadata: job.request.referenceMetadata ?? null,
    },
  })
  return job
}

function isApprovedConnectedProvider(
  provider: string | null,
): provider is ApprovedDirectProviderId {
  return ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'].includes(provider ?? '')
}

export async function pollConnectedAppCapabilityJob(
  job: ConnectedAppCapabilityJob,
): Promise<ConnectedAppCapabilityJob> {
  if (job.status !== 'processing' || !job.providerJobId) return job
  const capability = AI_CAPABILITY_TAXONOMY.find((entry) => entry.id === job.capability)
  if (job.provider === 'amarktai') return job
  const route = capability?.providerRoutes.find((entry) => entry.provider === job.provider)
  const adapter = getProviderCapabilityAdapter(job.provider)
  if (!capability || !route || !adapter?.poll) {
    return updateCapabilityJob(job.id, {
      status: 'failed',
      error: 'The persisted job no longer has a valid provider polling route.',
    }) ?? job
  }
  const context = await loadExecutionContext(job.appSlug, job.request)
  const adapterInput: CapabilityAdapterInput = {
    capability,
    route,
    prompt: job.request.prompt?.trim() ?? '',
    text: job.request.text,
    inputs: job.request.inputs,
    references: job.request.references ?? [],
    context,
    model: job.model,
    endpointUrl: job.request.endpointUrl,
  }
  const result = await adapter.poll(job.providerJobId, adapterInput)
  return applyAdapterResult(job, capability, result)
}

export function getConnectedAppCapabilityJob(id: string): ConnectedAppCapabilityJob | null {
  return findRecord<ConnectedAppCapabilityJob>(LOCAL_STORE_FILES.connectedAppCapabilityJobs, id)
}

async function applyAdapterResult(
  job: ConnectedAppCapabilityJob,
  capability: AiCapabilityDefinition,
  result: CapabilityAdapterResult,
): Promise<ConnectedAppCapabilityJob> {
  if (result.status !== 'completed') {
    return updateCapabilityJob(job.id, {
      status: result.status,
      providerJobId: result.providerJobId,
      model: result.model,
      result: result.output,
      error: result.error,
    }) ?? job
  }
  if (!capability.createsArtifact) {
    return updateCapabilityJob(job.id, {
      status: 'completed',
      providerJobId: result.providerJobId,
      model: result.model,
      result: result.output,
      error: null,
    }) ?? job
  }
  try {
    const artifact = await createArtifact({
      appSlug: job.appSlug,
      appId: job.appId,
      jobId: job.id,
      type: artifactTypeFor(capability),
      subType: capability.id,
      title: capability.label,
      description: capability.description,
      provider: result.provider,
      model: result.model,
      capability: capability.id,
      mimeType: result.contentType ?? undefined,
      content: result.bytes ?? (
        result.output !== null && result.output !== undefined
          ? Buffer.from(
              typeof result.output === 'string'
                ? result.output
                : JSON.stringify(result.output, null, 2),
              'utf8',
            )
          : undefined
      ),
      contentUrl: result.mediaUrl ?? undefined,
      allowRemoteReference: Boolean(result.mediaUrl),
      metadata: {
        connectedAppId: job.appId,
        providerJobId: result.providerJobId,
        outputTypes: capability.outputTypes,
      },
    })
    return updateCapabilityJob(job.id, {
      status: 'completed',
      providerJobId: result.providerJobId,
      model: result.model,
      artifactId: artifact.id,
      artifactUrl: artifact.downloadUrl,
      result: result.output,
      error: null,
    }) ?? job
  } catch (error) {
    return updateCapabilityJob(job.id, {
      status: 'failed',
      providerJobId: result.providerJobId,
      model: result.model,
      result: null,
      error: error instanceof Error ? error.message : 'Artifact persistence failed.',
    }) ?? job
  }
}

function artifactTypeFor(capability: AiCapabilityDefinition): ArtifactType {
  const outputs = new Set(capability.outputTypes)
  if (outputs.has('image') || outputs.has('mask') || outputs.has('depth_map') || outputs.has('avatar')) return 'image'
  if (outputs.has('video')) return capability.group === 'avatar_voice' ? 'avatar' : 'video'
  if (outputs.has('music') || outputs.has('song')) return 'music'
  if (outputs.has('audio')) return capability.group === 'avatar_voice' ? 'voice' : 'audio'
  if (outputs.has('transcript')) return 'transcript'
  if (outputs.has('research_result')) return 'research_result'
  if (outputs.has('document') || outputs.has('3d_asset')) return 'document'
  return outputs.has('text') ? 'text' : 'report'
}

async function loadExecutionContext(
  appSlug: string,
  request: ConnectedAppCapabilityRequest,
): Promise<Record<string, unknown>> {
  const [profile, safety] = await Promise.all([
    prisma.appIntelligenceProfile.findUnique({ where: { appSlug } }).catch(() => null),
    loadAppSafetyConfigFromDB(appSlug),
  ])
  return {
    appSlug,
    brandKitReference: request.context?.brandKitReference ?? null,
    appContextReference: request.context?.appContextReference ?? null,
    brand: profile ? {
      summary: profile.brandSummary,
      tone: profile.brandTone,
      audience: parseJson(profile.targetUsers),
      productsAndServices: parseJson(profile.productsServices),
      businessType: profile.businessType,
      risks: parseJson(profile.risks),
    } : null,
    safety,
    inline: request.context?.inline ?? {},
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function sanitizeRequest(request: ConnectedAppCapabilityRequest): ConnectedAppCapabilityRequest {
  return {
    ...request,
    endpointUrl: request.endpointUrl ? '[configured-endpoint]' : undefined,
  }
}

function updateCapabilityJob(
  id: string,
  updates: Partial<Omit<ConnectedAppCapabilityJob, 'id'>>,
): ConnectedAppCapabilityJob | null {
  return updateRecord<ConnectedAppCapabilityJob>(
    LOCAL_STORE_FILES.connectedAppCapabilityJobs,
    id,
    { ...updates, updatedAt: new Date().toISOString() },
  )
}

export function isLongRunningCapability(capability: string): boolean {
  return LONG_RUNNING_CAPABILITIES.has(capability)
}
