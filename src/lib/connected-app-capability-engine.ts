import {
  AI_CAPABILITY_TAXONOMY,
  type AiCapabilityDefinition,
  type AiCapabilityProviderRoute,
} from '@/lib/ai-capability-taxonomy'
import {
  classifyProviderError,
  getProviderCapabilityAdapter,
  type CapabilityAdapterInput,
  type CapabilityAdapterResult,
  type CapabilityReference,
} from '@/lib/ai-capability-adapters'
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
  selectCapabilityRoutePlan,
  type StoredRoutingQualityTier,
  type RoutingQualityTier,
} from '@/lib/capability-routing-policy'
import {
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/provider-performance'

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

export function selectCapabilityRoute(
  capability: AiCapabilityDefinition,
  requestedProvider?: ApprovedDirectProviderId,
): AiCapabilityProviderRoute | null {
  return capability.providerRoutes.find(
    (route) => route.executable && (!requestedProvider || route.provider === requestedProvider),
  ) ?? null
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
  if (input.capability.fallbackArtifactType) {
    return createDeclaredFallbackArtifact(input, qualityTier)
  }
  const routePlan = await selectCapabilityRoutePlan({
    capability: input.capability,
    requestedProvider: input.request.provider,
    requestedModel: input.request.model,
    qualityTier,
  })
  const selected = routePlan.selected
  const route = selected?.route
  if (!route || !selected) {
    return createTerminalJob(input, {
      status: input.capability.adapterImplemented ? 'needs_configuration' : 'blocked',
      provider: input.request.provider ?? input.capability.defaultProviders[0] ?? 'huggingface',
      model: input.request.model ?? '',
      adapter: '',
      qualityTier,
      error: input.capability.blocker ?? routePlan.reason,
    })
  }
  const adapter = getProviderCapabilityAdapter(route.provider)
  if (!adapter || adapter.id !== route.adapter) {
    return createTerminalJob(input, {
      status: 'needs_configuration',
      provider: route.provider,
      model: input.request.model ?? route.modelIds[0] ?? '',
      adapter: route.adapter,
      qualityTier,
      error: `Adapter ${route.adapter} is not registered.`,
    })
  }

  const context = await loadExecutionContext(input.app.slug, input.request)
  const model = selected.model
  const now = new Date().toISOString()
  let job = appendRecord<Omit<ConnectedAppCapabilityJob, 'id'>>(
    LOCAL_STORE_FILES.connectedAppCapabilityJobs,
    {
      appId: input.app.id,
      appSlug: input.app.slug,
      capability: input.capability.id,
      requiredScope: input.capability.requiredScope,
      provider: route.provider,
      model,
      adapter: adapter.id,
      qualityTier,
      status: 'processing',
      providerJobId: null,
      artifactId: null,
      artifactUrl: null,
      result: null,
      error: null,
      providerAttempts: [],
      request: sanitizeRequest(input.request),
      createdAt: now,
      updatedAt: now,
    },
  ) as ConnectedAppCapabilityJob

  const candidates = [selected, ...routePlan.fallback]
  let finalResult: CapabilityAdapterResult | null = null
  for (const candidate of candidates) {
    const candidateAdapter = getProviderCapabilityAdapter(candidate.route.provider)
    if (!candidateAdapter || candidateAdapter.id !== candidate.route.adapter) continue
    const adapterInput: CapabilityAdapterInput = {
      capability: input.capability,
      route: candidate.route,
      prompt: input.request.prompt?.trim() ?? '',
      text: input.request.text,
      inputs: input.request.inputs,
      references: input.request.references ?? [],
      context,
      model: candidate.model,
      endpointUrl: input.request.endpointUrl,
    }
    let result: CapabilityAdapterResult
    const startedAt = Date.now()
    try {
      result = await candidateAdapter.execute(adapterInput)
    } catch (error) {
      const classified = classifyProviderError({
        error,
        provider: candidate.route.provider,
      })
      result = {
        status: 'failed',
        provider: candidate.route.provider,
        model: candidate.model,
        output: null,
        mediaUrl: null,
        bytes: null,
        contentType: null,
        providerJobId: null,
        latencyMs: Date.now() - startedAt,
        rawStatus: null,
        error: classified.message,
        errorCategory: classified.category,
        retryable: classified.retryable,
        diagnostics: null,
      }
    }
    job.providerAttempts.push({
      provider: result.provider,
      model: result.model,
      adapter: candidateAdapter.id,
      outputType: candidate.route.outputType,
      status: result.status,
      latencyMs: result.latencyMs,
      errorCategory: result.errorCategory,
      error: result.error,
    })
    job = updateCapabilityJob(job.id, {
      providerAttempts: job.providerAttempts,
      provider: result.provider,
      model: result.model,
      adapter: candidateAdapter.id,
    }) ?? job
    if (result.status === 'completed' || result.status === 'processing') {
      await recordProviderSuccess({
        providerId: result.provider,
        model: result.model,
        capability: input.capability.id,
        latencyMs: result.latencyMs,
      })
      finalResult = result
      break
    }
    await recordProviderFailure({
      providerId: result.provider,
      model: result.model,
      capability: input.capability.id,
      latencyMs: result.latencyMs,
      errorCategory: result.errorCategory ?? 'unknown',
    })
    finalResult = result
  }
  if (finalResult) {
    job = await applyAdapterResult(job, input.capability, finalResult)
  } else {
    job = updateCapabilityJob(job.id, {
      status: 'failed',
      error: 'No registered provider adapter could execute this capability.',
    }) ?? job
  }
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

function createTerminalJob(
  input: {
    app: ConnectedApp
    capability: AiCapabilityDefinition
    request: ConnectedAppCapabilityRequest
  },
  terminal: {
    status: ConnectedAppCapabilityJobStatus
    provider: ApprovedDirectProviderId
    model: string
    adapter: string
    qualityTier: StoredRoutingQualityTier
    error: string
  },
): ConnectedAppCapabilityJob {
  const now = new Date().toISOString()
  return appendRecord<Omit<ConnectedAppCapabilityJob, 'id'>>(
    LOCAL_STORE_FILES.connectedAppCapabilityJobs,
    {
      appId: input.app.id,
      appSlug: input.app.slug,
      capability: input.capability.id,
      requiredScope: input.capability.requiredScope,
      provider: terminal.provider,
      model: terminal.model,
      adapter: terminal.adapter,
      qualityTier: terminal.qualityTier,
      status: terminal.status,
      providerJobId: null,
      artifactId: null,
      artifactUrl: null,
      result: null,
      error: terminal.error,
      providerAttempts: [],
      request: sanitizeRequest(input.request),
      createdAt: now,
      updatedAt: now,
    },
  ) as ConnectedAppCapabilityJob
}

async function createDeclaredFallbackArtifact(
  input: {
    app: ConnectedApp
    capability: AiCapabilityDefinition
    request: ConnectedAppCapabilityRequest
  },
  qualityTier: StoredRoutingQualityTier,
): Promise<ConnectedAppCapabilityJob> {
  const fallbackType = input.capability.fallbackArtifactType
  if (!fallbackType) {
    throw new Error('A declared fallback artifact type is required.')
  }
  const now = new Date().toISOString()
  let job = appendRecord<Omit<ConnectedAppCapabilityJob, 'id'>>(
    LOCAL_STORE_FILES.connectedAppCapabilityJobs,
    {
      appId: input.app.id,
      appSlug: input.app.slug,
      capability: input.capability.id,
      requiredScope: input.capability.requiredScope,
      provider: 'amarktai',
      model: `${fallbackType}-v1`,
      adapter: 'declared_fallback_artifact',
      qualityTier,
      status: 'processing',
      providerJobId: null,
      artifactId: null,
      artifactUrl: null,
      result: null,
      error: null,
      providerAttempts: [],
      request: sanitizeRequest(input.request),
      createdAt: now,
      updatedAt: now,
    },
  ) as ConnectedAppCapabilityJob
  const report = {
    kind: fallbackType,
    capability: input.capability.id,
    prompt: input.request.prompt ?? input.request.text ?? '',
    generatedMedia: false,
    readiness: input.capability.readiness,
    blocker: input.capability.blocker,
    sections: fallbackType === 'music_blueprint'
      ? ['concept', 'lyrics_direction', 'arrangement', 'tempo_and_key', 'production_notes']
      : ['scene_plan', 'voice_direction', 'timing', 'visual_notes', 'production_requirements'],
  }
  try {
    const artifact = await createArtifact({
      appSlug: input.app.slug,
      appId: input.app.id,
      jobId: job.id,
      type: 'report',
      subType: fallbackType,
      title: `${input.capability.label} ${fallbackType === 'music_blueprint' ? 'Blueprint' : 'Storyboard'}`,
      description: `Planning artifact only. ${input.capability.blocker ?? 'Generated media is not available in V1.'}`,
      provider: 'amarktai',
      model: `${fallbackType}-v1`,
      capability: input.capability.id,
      mimeType: 'application/json',
      content: Buffer.from(JSON.stringify(report, null, 2), 'utf8'),
      metadata: {
        connectedAppId: input.app.id,
        generatedMedia: false,
        declaredFallback: true,
      },
    })
    job = updateCapabilityJob(job.id, {
      status: 'completed',
      artifactId: artifact.id,
      artifactUrl: artifact.downloadUrl,
      result: report,
      error: null,
    }) ?? job
  } catch (error) {
    job = updateCapabilityJob(job.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Fallback artifact persistence failed.',
    }) ?? job
  }
  return job
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
