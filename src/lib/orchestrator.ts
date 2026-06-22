/**
 * Canonical AmarktAI Brain orchestration.
 *
 * Product execution resolves a capability, applies policy, discovers eligible
 * provider models, scores candidates, executes a provider-native adapter, and
 * persists jobs/artifacts. No provider or model defaults live here.
 */

import {
  CAPABILITY_ROUTER_CAPABILITIES,
  type CapabilityRequest,
  type CapabilityResponse,
  type CapabilityRouterCapability,
  type ProviderAttempt,
} from '@/lib/capability-contracts'
import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import {
  classifyProviderError,
  getProviderCapabilityAdapter,
  type CapabilityReference,
} from '@/lib/ai-capability-adapters'
import { resolveHfSpecialistConfig } from '@/lib/hf-specialist-config'
import type { AiCapabilityDefinition, AiCapabilityProviderRoute } from '@/lib/ai-capability-taxonomy'
import { productCapabilityToTaxonomyId } from '@/lib/capability-routing-policy'
import {
  isApprovedDirectProvider,
  sanitizeProviderError,
  type ApprovedDirectProviderId,
} from '@/lib/provider-mesh'
import { recordProviderFailure, recordProviderSuccess } from '@/lib/provider-performance'
import { ARTIFACT_TYPES, createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { createLocalMediaJob } from '@/lib/media-job-store'
import {
  getAppSafetyConfig,
  loadAppSafetyConfigFromDB,
  scanContent,
} from '@/lib/content-filter'
import { crawlAppWebsite } from '@/lib/firecrawl'
import {
  getAdultAppCapabilityProfile,
  validateAdultCapabilityRequest,
  type AdultCapabilityId,
} from '@/lib/adult-app-capabilities'
import {
  createControlPlaneJob,
  finishControlPlaneAttempt,
  startControlPlaneAttempt,
} from '@/lib/control-plane-jobs'
import { recordCapabilityTraceSafe } from '@/lib/capability-tracing'
import { planCanonicalExecution } from '@/lib/providers/execution'
import type { RoutingProfileId } from '@/lib/providers/provider-types'

export type TaskComplexity = 'simple' | 'moderate' | 'complex'
export type ExecutionMode =
  | 'direct'
  | 'specialist'
  | 'review'
  | 'consensus'
  | 'retrieval_chain'
  | 'agent_chain'
  | 'multimodal_chain'
  | 'premium_escalation'

export interface ClassificationResult {
  taskComplexity: TaskComplexity
  executionMode: ExecutionMode
  requiresValidation: boolean
  requiresConsensus: boolean
  memoryRetrievalNeeded: boolean
  lowLatencyRequired: boolean
  appCategory: string
  taskType: string
}

export function classifyTask(
  appCategory: string,
  taskType: string,
  message: string,
): ClassificationResult {
  const appCategoryNormalized = (appCategory ?? '').toLowerCase()
  const task = (taskType ?? '').toLowerCase()
  const isFinancial = ['crypto', 'finance', 'forex', 'trading'].some((value) =>
    appCategoryNormalized.includes(value),
  )
  const isGeneric = ['chat', 'help', 'ping', 'support'].includes(task)
  const isComplex = [
    'analysis', 'review', 'audit', 'forecast', 'decision', 'report', 'strategy',
    'recommendation',
  ].some((value) => task.includes(value))
  const isConsensus = task.includes('consensus') || task.includes('compare')
  const taskComplexity: TaskComplexity = message.length <= 120 && isGeneric
    ? 'simple'
    : isComplex || (isFinancial && !isGeneric)
      ? 'complex'
      : 'moderate'
  const executionMode: ExecutionMode = taskComplexity === 'simple'
    ? 'direct'
    : isConsensus || (taskComplexity === 'complex' && isFinancial)
      ? 'consensus'
      : taskComplexity === 'complex' || isFinancial
        ? 'review'
        : 'specialist'
  return {
    taskComplexity,
    executionMode,
    requiresValidation: executionMode === 'review' || executionMode === 'consensus',
    requiresConsensus: executionMode === 'consensus',
    memoryRetrievalNeeded: false,
    lowLatencyRequired: executionMode === 'direct',
    appCategory: appCategoryNormalized,
    taskType: task,
  }
}

export const SPECIALIST_PROFILES: Record<string, string> = {
  crypto: 'You are a specialist AI assistant for cryptocurrency and digital asset trading. Provide accurate, data-aware responses. Always note that outputs are not financial advice.',
  finance: 'You are a specialist AI assistant for financial analysis and markets. Provide rigorous, well-reasoned responses. Always note that outputs are not financial advice.',
  forex: 'You are a specialist AI assistant for forex and currency markets. Provide accurate, data-aware responses. Always note that outputs are not financial advice.',
  trading: 'You are a specialist AI assistant for trading strategy and market analysis. Provide structured, reasoned responses. Always note that outputs are not financial advice.',
  equine: 'You are a specialist AI assistant for equine care, horse management, and related lifestyle topics. Provide practical, expert-informed responses.',
  horse: 'You are a specialist AI assistant for equine care, horse management, and related lifestyle topics. Provide practical, expert-informed responses.',
  family: 'You are a helpful AI assistant for family lifestyle topics including health, education, and wellbeing. Provide warm, practical, and safe responses.',
  marketing: 'You are a specialist AI assistant for marketing strategy, brand content, and growth campaigns. Provide creative, structured, and actionable responses.',
  content: 'You are a specialist AI assistant for content creation, copywriting, and creative strategy. Provide clear, engaging, and audience-aware responses.',
  generic: 'You are a helpful and knowledgeable AI assistant. Provide clear, accurate, and useful responses.',
}

export function getSpecialistProfile(appCategory: string): string {
  const category = (appCategory ?? '').toLowerCase()
  return Object.keys(SPECIALIST_PROFILES).find((key) => category.includes(key))
    ? SPECIALIST_PROFILES[Object.keys(SPECIALIST_PROFILES).find((key) => category.includes(key))!]
    : SPECIALIST_PROFILES.generic
}

export function computeConfidenceScore(opts: {
  primaryProvider: { healthStatus: string; isHealthy: boolean }
  fallbackUsed: boolean
  validationPassed: boolean | null
  warnings: string[]
}): number {
  let score = 0.70
  if (opts.primaryProvider.isHealthy) score += 0.15
  else if (opts.primaryProvider.healthStatus === 'configured') score += 0.05
  if (opts.fallbackUsed) score -= 0.10
  if (opts.validationPassed === false) score -= 0.10
  score -= Math.max(0, opts.warnings.length - 1) * 0.05
  return Math.min(0.99, Math.max(0.10, Math.round(score * 100) / 100))
}

export interface OrchestrationResult {
  output: string | null
  executionMode: ExecutionMode
  routedProvider: string | null
  routedModel: string | null
  confidenceScore: number | null
  validationUsed: boolean
  consensusUsed: boolean
  fallbackUsed: boolean
  memoryUsed: boolean
  warnings: string[]
  errors: string[]
  latencyMs: number
  classification: ClassificationResult
  routingReason?: string
  capability?: string
  code?: string
  candidateModels?: Array<{ model_id: string; provider: string; enabled: boolean; rejection_reason: string }>
}

export async function orchestrate(opts: {
  appSlug?: string
  appCategory: string
  taskType: string
  message: string
  providerOverride?: string
  modelOverride?: string
  budgetMode?: 'low_cost' | 'balanced' | 'best_quality'
  agentSystemPrompt?: string
  allowFallback?: boolean
}): Promise<OrchestrationResult> {
  const start = Date.now()
  const classification = classifyTask(opts.appCategory, opts.taskType, opts.message)
  const canonical = await executeCapabilityOrchestration({
    input: opts.message,
    capability: legacyTaskCapability(opts.taskType),
    appId: opts.appSlug,
    saveArtifact: false,
    metadata: {
      agentSystemPrompt: opts.agentSystemPrompt ?? null,
      routingProfile: opts.budgetMode === 'low_cost'
        ? 'cheap'
        : opts.budgetMode === 'best_quality'
          ? 'premium'
          : 'balanced',
      ignoredProviderOverride: opts.providerOverride ?? null,
      ignoredModelOverride: opts.modelOverride ?? null,
      allowFallback: opts.allowFallback ?? false,
    },
  })
  return {
    output: canonical.output,
    executionMode: classification.executionMode,
    routedProvider: canonical.provider,
    routedModel: canonical.model,
    confidenceScore: canonical.success ? 0.8 : null,
    validationUsed: false,
    consensusUsed: false,
    fallbackUsed: canonical.fallbackUsed,
    memoryUsed: false,
    warnings: [canonical.warning, canonical.fallbackReason].filter(
      (value): value is string => Boolean(value),
    ),
    errors: canonical.success ? [] : [canonical.error ?? canonical.code ?? 'NO_ROUTE_FOUND'],
    latencyMs: Date.now() - start,
    classification,
    routingReason: canonical.success
      ? 'Canonical capability discovery and scoring route.'
      : canonical.error ?? 'NO_ROUTE_FOUND',
    capability: canonical.capability,
    code: canonical.code,
  }
}

const PRODUCT_CAPABILITY_SET = new Set<string>(CAPABILITY_ROUTER_CAPABILITIES)
const GOVERNED_ADULT_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
  'adult_avatar',
])
const GOVERNED_SUGGESTIVE_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'suggestive_image',
  'suggestive_video',
])

function legacyTaskCapability(taskType: string): CapabilityRouterCapability {
  if (PRODUCT_CAPABILITY_SET.has(taskType)) return taskType as CapabilityRouterCapability
  const normalized = taskType.toLowerCase()
  if (normalized.includes('reason')) return 'reasoning'
  if (normalized.includes('research')) return 'research'
  if (normalized.includes('image') && normalized.includes('edit')) return 'image_edit'
  if (normalized.includes('image')) return 'image_generation'
  if (normalized.includes('video')) return 'video_generation'
  if (normalized.includes('music') || normalized.includes('song')) return 'music_generation'
  if (normalized.includes('speech') || normalized === 'tts') return 'tts'
  if (normalized.includes('transcri') || normalized === 'stt') return 'stt'
  if (normalized.includes('embed')) return 'embeddings'
  if (normalized.includes('rerank') || normalized.includes('ranking')) return 'rerank'
  if (normalized.includes('ocr')) return 'ocr'
  if (normalized.includes('document') || normalized.includes('file')) return 'file_analysis'
  if (normalized.includes('code')) return 'code'
  return 'chat'
}

/**
 * Canonical app-facing capability orchestration.
 *
 * Existing Brain task orchestration above remains responsible for complex
 * agent/retrieval modes. This function owns provider/model routing, adapter
 * execution, fallback, performance learning, artifacts, and stable product
 * responses for Studio and capability-router callers.
 */
export async function executeCapabilityOrchestration(
  request: CapabilityRequest,
): Promise<CapabilityResponse> {
  const capability = resolveProductCapability(request)
  if (!capability) {
    return capabilityFailure(
      'chat',
      'BLOCKED',
      `Unknown capability "${request.capability ?? 'unspecified'}".`,
      'model_not_supported',
    )
  }
  const appSlug = request.appId ?? request.workspaceId ?? '__system__'
  await recordCapabilityTraceSafe({
    traceId: request.traceId,
    appSlug,
    adultModeState: request.adultMode ? 'requested' : 'off',
    capability,
    eventType: 'capability.request.accepted',
    providerRequestMeta: {
      requestedProvider: request.providerOverride ?? request.provider ?? null,
      requestedModel: request.modelOverride ?? request.model ?? null,
      qualityTier: request.qualityTier ?? request.metadata?.qualityTier ?? 'auto',
      fileCount: request.files?.length ?? 0,
    },
  })

  const requestedProvider = request.providerOverride ?? request.provider
  const requestedModel = request.modelOverride ?? request.model
  if (requestedProvider && !isApprovedDirectProvider(requestedProvider)) {
    return capabilityFailure(
      capability,
      'BLOCKED',
      `Provider "${requestedProvider}" is not approved for direct execution.`,
      'provider_policy_block',
      requestedProvider,
      requestedModel ?? null,
    )
  }

  const blockedReason = await governedCapabilityBlockReason(request, capability)
  if (blockedReason) {
    return capabilityFailure(
      capability,
      'BLOCKED',
      blockedReason,
      'guardrail_block',
    )
  }

  if (
    capability === 'file_analysis'
    && !request.files?.length
    && !request.metadata?.fileContents
  ) {
    return capabilityFailure(
      capability,
      'BLOCKED',
      'File analysis requires files or fileContents metadata.',
      'model_not_supported',
    )
  }
  if (capability === 'stt' && !request.files?.length) {
    return capabilityFailure(
      capability,
      'NEEDS_INPUT',
      'Speech-to-text requires an audio input reference.',
      'model_not_supported',
    )
  }
  if (
    capability === 'adult_image'
    && requestedProvider
    && !['together', 'huggingface'].includes(requestedProvider)
  ) {
    return capabilityFailure(
      capability,
      'BLOCKED',
      `Provider "${requestedProvider}" is not an approved adult-image executor.`,
      'provider_policy_block',
      requestedProvider,
      requestedModel ?? null,
    )
  }

  if (capability === 'scrape_website') {
    return executeWebsiteCapability(request, capability)
  }

  const taxonomyId = taxonomyCapability(capability)
  const definition = getCapabilityDefinition(taxonomyId)
  if (!definition) {
    return capabilityFailure(
      capability,
      'UNAVAILABLE',
      `Canonical capability "${taxonomyId}" is not registered.`,
      'model_not_supported',
    )
  }

  if (
    definition.requiredSourceInput
    && !hasRequiredSource(request, definition.requiredSourceInput)
  ) {
    return capabilityFailure(
      capability,
      'NEEDS_INPUT',
      `${definition.label} requires a ${definition.requiredSourceInput} input.`,
      'model_not_supported',
    )
  }

  if (capability === 'avatar_video') {
    return capabilityFailure(
      capability,
      'NEEDS_CONFIGURATION',
      'Avatar video generation requires a configured talking-avatar provider route. No completed video or artifact was created.',
      'provider_misconfigured',
    )
  }

  const routePlan = await planCanonicalExecution({
    capability,
    profile: canonicalRoutingProfile(request),
    preferences: {
      adult: GOVERNED_ADULT_CAPABILITIES.has(capability),
      streaming: request.metadata?.streaming === true,
      artifactSupport: definition.createsArtifact,
      providerPreference: requestedProvider
        ? [requestedProvider as ApprovedDirectProviderId]
        : undefined,
      modelPreference: requestedModel ? [requestedModel] : undefined,
      durationSeconds: requestedDurationSeconds(request) ?? undefined,
    },
  })
  const candidates = routePlan.candidates
  if (candidates.length === 0) {
    const rejectedAttempts = attemptsFromRejectedCandidates(
      routePlan.rejectedCandidates ?? [],
      definition.outputType,
    )
    const endpointRequired = rejectedAttempts.some((attempt) =>
      attempt.classification === 'endpoint_required',
    )
    return capabilityFailure(
      capability,
      endpointRequired ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
      `NO_ROUTE_FOUND: ${routePlan.reason}`,
      endpointRequired ? 'provider_misconfigured' : 'no_route_found',
      requestedProvider ?? null,
      requestedModel ?? null,
      rejectedAttempts,
      'NO_ROUTE_FOUND',
    )
  }

  const attempts: ProviderAttempt[] = []
  for (const [index, candidate] of candidates.entries()) {
    const routeResolution = resolveExecutableRoute({
      definition,
      provider: candidate.provider,
      adapter: candidate.adapter,
      taxonomyId,
    })
    if (routeResolution.skippedAttempt) {
      attempts.push(routeResolution.skippedAttempt)
      continue
    }
    const route = routeResolution.route
    const adapter = getProviderCapabilityAdapter(candidate.provider)
    if (!route || !adapter || adapter.id !== candidate.adapter || route.adapter !== candidate.adapter) {
      attempts.push({
        provider: candidate.provider,
        model: candidate.model.id,
        adapter: candidate.adapter,
        outputType: route?.outputType ?? definition.outputType,
        status: 'failed',
        classification: route ? 'adapter_missing' : 'unsupported_by_contract',
        errorCategory: 'unsupported_endpoint',
        retryable: true,
        error: `No canonical adapter contract is registered for ${candidate.provider}/${taxonomyId}.`,
        requestedDurationSeconds: requestedDurationSeconds(request),
        providerLimitSeconds: providerLimitSeconds(candidate.model.metadata),
      })
      continue
    }

    const startedAt = Date.now()
    let adapterResult
    try {
      adapterResult = await adapter.execute({
        capability: definition,
        route: {
          ...route,
          modelIds: [candidate.model.id],
          source: 'provider_mesh',
        },
        prompt: request.input,
        text: request.input,
        inputs: {
          ...(request.metadata ?? {}),
          files: request.files ?? [],
        },
        references: capabilityReferences(request, capability),
        context: {
          appId: request.appId ?? null,
          workspaceId: request.workspaceId ?? null,
          sessionId: request.metadata?.sessionId ?? null,
        },
        model: candidate.model.id,
      })
    } catch (error) {
      const classified = classifyProviderError({
        error,
        provider: candidate.provider,
      })
      adapterResult = {
        status: 'failed' as const,
        provider: candidate.provider,
        model: candidate.model.id,
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

    const latencyMs = adapterResult.latencyMs || Date.now() - startedAt
    attempts.push({
      provider: adapterResult.provider,
      model: adapterResult.model,
      adapter: candidate.adapter,
      outputType: route.outputType,
      status: adapterResult.status,
      classification: attemptClassification(adapterResult.status, adapterResult.errorCategory),
      latencyMs,
      errorCategory: adapterResult.errorCategory ?? undefined,
      retryable: adapterResult.retryable,
      error: adapterResult.error ?? undefined,
      requestedDurationSeconds: requestedDurationSeconds(request),
      providerLimitSeconds: providerLimitSeconds(candidate.model.metadata),
      actualDurationSeconds: numericMetadata(adapterResult.diagnostics?.actualDurationSeconds),
      artifactPersisted: false,
      previewDownloadAvailable: false,
      diagnostics: {
        ...(adapterResult.diagnostics ?? {}),
        modelExecutionClassification: candidate.model.metadata?.executionClassification ?? null,
        endpointEnv: candidate.model.metadata?.endpointEnv ?? null,
      },
    })
    await recordCapabilityTraceSafe({
      traceId: request.traceId,
      appSlug,
      adultModeState: request.adultMode ? 'enabled' : 'off',
      capability,
      eventType: `provider.attempt.${adapterResult.status}`,
      selectedRoute: {
        provider: adapterResult.provider,
        model: adapterResult.model,
        adapter: candidate.adapter,
        fallbackIndex: index,
      },
      providerRequestMeta: {
        outputType: route.outputType,
        latencyMs,
        retryable: adapterResult.retryable,
      },
      providerJobId: adapterResult.providerJobId ?? undefined,
      errorCategory: adapterResult.errorCategory ?? undefined,
    })

    if (adapterResult.status === 'completed') {
      await recordProviderSuccess({
        providerId: adapterResult.provider,
        model: adapterResult.model,
        capability: taxonomyId,
        latencyMs,
      })
      return completeCapabilityResult({
        request,
        capability,
        taxonomyId,
        definitionCreatesArtifact: definition.createsArtifact,
        adapterResult,
        attempts,
        selectedAttemptIndex: attempts.length - 1,
        fallbackUsed: index > 0,
      })
    }

    if (adapterResult.status === 'processing' && adapterResult.providerJobId) {
      await recordProviderSuccess({
        providerId: adapterResult.provider,
        model: adapterResult.model,
        capability: taxonomyId,
        latencyMs,
      })
      const mediaType = localMediaTypeForCapability(capability)
      const localJob = mediaType
        ? createLocalMediaJob({
            capability,
            appSlug: request.appId ?? request.workspaceId ?? '__system__',
            type: mediaType,
            subType: capability,
            title: `${capability.replace(/_/g, ' ')} generation`,
            description: request.input,
            prompt: request.input,
            provider: adapterResult.provider,
            model: adapterResult.model,
            providerJobId: adapterResult.providerJobId,
          metadata: {
            ...(request.metadata ?? {}),
            providerAttempts: attempts,
            requestedDurationSeconds: requestedDurationSeconds(request),
            providerLimitSeconds: providerLimitSeconds(candidate.model.metadata),
          },
          })
        : null
      const durableJob = await createControlPlaneJob({
        idempotencyKey: typeof request.metadata?.idempotencyKey === 'string'
          ? request.metadata.idempotencyKey
          : `${appSlug}:${capability}:${adapterResult.providerJobId}`,
        appSlug,
        requestedCapability: request.capability ?? capability,
        canonicalCapability: taxonomyId,
        jobType: 'external_provider_poll',
        selectedRoute: {
          provider: adapterResult.provider,
          model: adapterResult.model,
          adapter: candidate.adapter,
        },
        metadata: {
          localMediaJobId: localJob?.id ?? null,
          providerAttempts: attempts,
        },
        queueData: {
          provider: adapterResult.provider,
          providerJobId: adapterResult.providerJobId,
          localMediaJobId: localJob?.id ?? null,
          capability,
        },
      })
      const durableAttempt = await startControlPlaneAttempt({
        jobId: durableJob.id,
        provider: adapterResult.provider,
        model: adapterResult.model,
        adapter: candidate.adapter,
        outputType: route.outputType,
        requestMetadata: { localMediaJobId: localJob?.id ?? null },
      })
      await finishControlPlaneAttempt({
        attemptId: durableAttempt.id,
        status: 'processing',
        providerJobId: adapterResult.providerJobId,
        pollUrl: localJob ? `/api/brain/media-jobs/${localJob.id}` : null,
        latencyMs,
        charged: true,
      })
      return {
        success: true,
        capability,
        readiness: 'READY',
        provider: adapterResult.provider,
        model: adapterResult.model,
        outputType: capabilityOutputType(capability),
        output: null,
        jobId: localJob?.id ?? adapterResult.providerJobId,
        providerJobId: adapterResult.providerJobId,
        pollUrl: localJob ? `/api/brain/media-jobs/${localJob.id}` : null,
        status: 'processing',
        fallbackUsed: index > 0,
        fallbackReason: index > 0 ? 'An earlier provider/model attempt failed.' : undefined,
        providerAttempts: attempts,
        diagnostics: {
          controlPlaneJobId: durableJob.id,
          controlPlaneAttemptId: durableAttempt.id,
          queueStatus: durableJob.status,
          requestedDurationSeconds: requestedDurationSeconds(request),
          providerLimitSeconds: providerLimitSeconds(candidate.model.metadata),
        },
      }
    }

    await recordProviderFailure({
      providerId: adapterResult.provider,
      model: adapterResult.model,
      capability: taxonomyId,
      latencyMs,
      errorCategory: adapterResult.errorCategory ?? 'unknown',
    })
  }

  const lastAttempt = attempts.at(-1)
  const onlyConfigurationFailures = attempts.length > 0 && attempts.every(
    (attempt) => ['missing_key', 'invalid_key', 'provider_misconfigured'].includes(
      attempt.errorCategory ?? '',
    ),
  )
  await recordCapabilityTraceSafe({
    traceId: request.traceId,
    appSlug,
    adultModeState: request.adultMode ? 'enabled' : 'off',
    capability,
    eventType: 'capability.failed',
    selectedRoute: lastAttempt
      ? { provider: lastAttempt.provider, model: lastAttempt.model }
      : {},
    errorCategory: lastAttempt?.errorCategory ?? 'unknown',
    payload: { attempts: attempts.length, reason: routePlan.reason },
  })
  return capabilityFailure(
    capability,
    onlyConfigurationFailures ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
    capability === 'music_generation' && attempts.length
      ? 'No configured music provider has a working music_generation adapter that returned audio.'
      : attempts.length
      ? 'All eligible provider/model attempts failed.'
      : routePlan.reason,
    (lastAttempt?.errorCategory as CapabilityResponse['error_category']) ?? 'unknown',
    lastAttempt?.provider ?? requestedProvider ?? null,
    lastAttempt?.model ?? requestedModel ?? null,
    attempts,
    'NO_ROUTE_FOUND',
  )
}

function resolveExecutableRoute(input: {
  definition: AiCapabilityDefinition
  provider: string
  adapter: string
  taxonomyId: string
}): { route: AiCapabilityProviderRoute | null; skippedAttempt?: ProviderAttempt } {
  const executableRoute = input.definition.providerRoutes.find((entry) =>
    entry.provider === input.provider && entry.executable
  )
  if (executableRoute) return { route: executableRoute }

  const declaredRoute = input.definition.providerRoutes.find((entry) =>
    entry.provider === input.provider
  )
  if (
    input.provider === 'huggingface'
    && declaredRoute?.status === 'requires_endpoint'
  ) {
    const specialist = resolveHfSpecialistConfig(input.taxonomyId, declaredRoute)
    if (specialist.configured) {
      return {
        route: {
          ...declaredRoute,
          executable: true,
          status: 'executable',
          modelIds: specialist.model ? [specialist.model] : declaredRoute.modelIds,
        },
      }
    }
    return {
      route: null,
      skippedAttempt: {
        provider: input.provider,
        model: declaredRoute.modelIds[0] ?? specialist.model ?? 'unselected',
        adapter: input.adapter,
        outputType: declaredRoute.outputType,
        status: 'needs_configuration',
        errorCategory: 'provider_misconfigured',
        retryable: true,
        classification: 'endpoint_required',
        error: `${input.taxonomyId} requires a Hugging Face specialist endpoint. Set ${specialist.requiredEnv.join(' or ')}.`,
      },
    }
  }

  return { route: null }
}

function attemptsFromRejectedCandidates(
  rejectedCandidates: NonNullable<Awaited<ReturnType<typeof planCanonicalExecution>>['rejectedCandidates']>,
  outputType: string,
): ProviderAttempt[] {
  return rejectedCandidates.slice(0, 6).map((entry) => ({
    provider: entry.provider,
    model: entry.modelId ?? 'unselected',
    adapter: `${entry.provider}_capability_adapter`,
    outputType,
    status: 'needs_configuration',
    classification: rejectionAttemptClassification(entry.code),
    errorCategory: entry.code === 'DEDICATED_ENDPOINT_REQUIRED'
      || entry.code === 'RUNTIME_FLAG_DISABLED'
      || entry.code === 'TOOL_PLAN_ONLY'
      ? 'provider_misconfigured'
      : entry.code === 'ADAPTER_MISSING'
        ? 'unsupported_endpoint'
        : entry.code === 'POLICY_BLOCKED'
          ? 'guardrail_block'
        : 'no_route_found',
    retryable: true,
    error: entry.reason,
  }))
}

function rejectionAttemptClassification(
  code: NonNullable<Awaited<ReturnType<typeof planCanonicalExecution>>['rejectedCandidates']>[number]['code'],
): NonNullable<ProviderAttempt['classification']> {
  if (code === 'DEDICATED_ENDPOINT_REQUIRED') return 'endpoint_required'
  if (code === 'ADAPTER_MISSING') return 'adapter_missing'
  if (code === 'CATALOG_ONLY') return 'unsupported_by_contract'
  if (code === 'ADULT_GATE_REQUIRED' || code === 'POLICY_BLOCKED') return 'blocked_by_policy'
  if (code === 'DURATION_LIMITED') return 'duration_limited'
  if (code === 'RUNTIME_FLAG_DISABLED' || code === 'TOOL_PLAN_ONLY') return 'needs_configuration'
  return 'unsupported_by_contract'
}

function requestedDurationSeconds(request: CapabilityRequest): number | null {
  const value = request.metadata?.durationSeconds ?? request.metadata?.duration
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function providerLimitSeconds(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).providerLimitSeconds
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numericMetadata(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function attemptClassification(
  status: string,
  errorCategory: string | null,
): NonNullable<ProviderAttempt['classification']> {
  if (status === 'completed' || status === 'processing') return 'executable'
  if (status === 'needs_configuration') return 'needs_configuration'
  if (status === 'blocked') return 'blocked_by_policy'
  if (errorCategory === 'rate_limited') return 'rate_limited'
  if (errorCategory === 'provider_misconfigured') return 'needs_configuration'
  if (errorCategory === 'unsupported_endpoint') return 'unsupported_by_contract'
  if (errorCategory === 'model_not_supported') return 'unsupported_by_contract'
  return 'provider_error'
}

function hasRequiredSource(
  request: CapabilityRequest,
  source: 'image' | 'audio' | 'video' | 'document' | 'avatar',
): boolean {
  if (request.files?.some((file) => typeof file === 'string' && file.trim())) return true
  const metadata = request.metadata ?? {}
  return [
    metadata.source,
    metadata.mediaSource,
    metadata.sourceArtifactId,
    metadata[`${source}Url`],
    metadata[`${source}ArtifactId`],
  ].some((value) => typeof value === 'string' && value.trim())
}

function resolveProductCapability(
  request: CapabilityRequest,
): CapabilityRouterCapability | null {
  const explicit = request.capability
  if (explicit) {
    if (PRODUCT_CAPABILITY_SET.has(explicit)) {
      return explicit as CapabilityRouterCapability
    }
    return CAPABILITY_ROUTER_CAPABILITIES.find(
      (capability) => taxonomyCapability(capability) === explicit,
    ) ?? taxonomyProductCapability(getCapabilityDefinition(explicit))
  }
  const value = request.input.toLowerCase()
  if (/(scrape|crawl|extract).*(website|url|page)|^https?:\/\//.test(value)) return 'scrape_website'
  if (/(edit|modify|change|retouch).*(image|photo|picture)/.test(value)) return 'image_edit'
  if (/(image|photo|picture).*(into|to).*(video|animation)/.test(value)) return 'image_to_video'
  if (/(generate|create|draw|make).*(image|photo|picture|illustration)/.test(value)) return 'image_generation'
  if (/(generate|create|make).*(video|animation|clip)/.test(value)) return 'video_generation'
  if (/(generate|create|compose|make).*(music|song|instrumental|beat)/.test(value)) return 'music_generation'
  if (/(lyrics|verse|chorus|song words)/.test(value)) return 'lyrics_generation'
  if (/(text.to.speech|read aloud|speak this|voice response)/.test(value)) return 'tts'
  if (/(speech.to.text|transcribe|transcription)/.test(value)) return 'stt'
  if (/(analy[sz]e|summari[sz]e|inspect).*(file|document|attachment)/.test(value)) return 'file_analysis'
  if (/(research|investigate|deep dive|find sources)/.test(value)) return 'research'
  if (/(deploy|deployment|release plan|rollout)/.test(value)) return 'deploy_plan'
  if (/(build|create|scaffold).*(app|application|website)/.test(value)) return 'app_build'
  if (/(edit|change|patch|refactor).*(repo|repository|codebase)/.test(value)) return 'repo_edit'
  if (/(code|function|typescript|javascript|python|debug|refactor)/.test(value)) return 'code'
  return 'chat'
}

function taxonomyCapability(capability: CapabilityRouterCapability): string {
  return productCapabilityToTaxonomyId(capability)
    ?? ({
      code: 'text_generation',
      repo_edit: 'text_generation',
      app_build: 'text_generation',
      deploy_plan: 'reasoning',
      lyrics_generation: 'lyrics_generation',
    } as Partial<Record<CapabilityRouterCapability, string>>)[capability]
    ?? 'chat'
}

function taxonomyProductCapability(
  definition: ReturnType<typeof getCapabilityDefinition>,
): CapabilityRouterCapability | null {
  if (!definition) return null
  const id = definition.id.toLowerCase()
  if (id.includes('adult') && id.includes('image')) return 'adult_image'
  if (id.includes('adult') && id.includes('video')) return 'adult_video'
  if (id.includes('adult')) return 'adult_text'
  if (id.includes('research')) return 'research'
  if (id.includes('reason')) return 'reasoning'
  if (id.includes('code')) return 'code'
  if (id.includes('embed')) return 'embeddings'
  if (id.includes('rerank') || id.includes('ranking') || id.includes('similarity')) return 'rerank'
  if (id.includes('translat')) return 'translation'
  if (id.includes('ocr') || id.includes('document')) return id.includes('ocr') ? 'ocr' : 'documents'
  if (id.includes('voice_clone') || id.includes('voice_design')) return 'voice_clone'
  if (id.includes('speech_recognition') || id.includes('speech_to_text')) return 'stt'
  if (id.includes('speech') || id.includes('tts')) return 'tts'
  if (id.includes('avatar') && id.includes('video')) return 'avatar_video'
  if (id.includes('avatar')) return 'avatar_generation'
  if (id.includes('image_to_video') || id.includes('image_text_to_video')) return 'image_to_video'
  if (id.includes('video')) return 'video_generation'
  if (id.includes('image') && (id.includes('edit') || definition.requiredSourceInput === 'image')) {
    return 'image_edit'
  }
  if (id.includes('image')) return 'image_generation'
  if (id.includes('music') || id.includes('song') || definition.group === 'music') return 'music_generation'
  if (definition.group === 'agents_or_planning' || definition.group === 'experimental') return 'agents'
  if (definition.group === 'tabular') return 'documents'
  if (definition.group === 'multimodal' || definition.group === 'computer_vision') return 'vision'
  return 'chat'
}

function canonicalRoutingProfile(request: CapabilityRequest): RoutingProfileId {
  const requested = String(
    request.metadata?.routingProfile
    ?? request.metadata?.qualityTier
    ?? request.qualityTier
    ?? 'balanced',
  )
  if (requested === 'auto') return 'best_available'
  if (
    requested === 'cheap'
    || requested === 'balanced'
    || requested === 'premium'
    || requested === 'mixed'
    || requested === 'best_available'
    || requested === 'custom'
  ) return requested
  return 'balanced'
}

async function governedCapabilityBlockReason(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): Promise<string | null> {
  const isAdult = GOVERNED_ADULT_CAPABILITIES.has(capability)
  const isSuggestive = GOVERNED_SUGGESTIVE_CAPABILITIES.has(capability)
  if (!isAdult && !isSuggestive) return null
  if (isAdult && (request.adultMode !== true || request.safeMode !== false)) {
    return 'Adult capability requires explicit adult mode and safe mode off.'
  }
  if (isSuggestive && request.safeMode !== false) {
    return 'Suggestive capability requires safe mode off.'
  }
  if (request.appId) {
    if (isAdult) {
      const profile = await getAdultAppCapabilityProfile(request.appId)
      const policyCapability = ({
        adult_text: 'adult_text',
        adult_image: 'adult_image',
        adult_voice: 'adult_voice',
        adult_avatar: 'adult_avatar',
        adult_video: 'adult_short_video',
      } as Partial<Record<CapabilityRouterCapability, AdultCapabilityId>>)[capability]
      if (policyCapability) {
        const result = validateAdultCapabilityRequest(profile, policyCapability, request.input)
        if (!result.allowed) return result.blocker
      }
      if (request.providerOverride && !profile.approvedProviders.includes(request.providerOverride)) {
        return `Provider "${request.providerOverride}" is not approved for adult execution by this app.`
      }
      if (!profile.approvedProviders.length) {
        return 'No adult provider is approved for this app. Configure and test one in the app adult capability profile.'
      }
    }
    await loadAppSafetyConfigFromDB(request.appId)
    const safety = getAppSafetyConfig(request.appId)
    if (safety.safeMode) return 'The app safety policy has safe mode enabled.'
    if (isAdult && !safety.adultMode) return 'The app safety policy does not enable adult mode.'
    if (isSuggestive && !safety.suggestiveMode) {
      return 'The app safety policy does not enable suggestive mode.'
    }
  }
  const scan = scanContent(request.input)
  return scan.flagged ? scan.message : null
}

function capabilityReferences(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): CapabilityReference[] {
  const supplied = request.metadata?.references
  if (Array.isArray(supplied)) {
    return supplied.filter((value): value is CapabilityReference =>
      Boolean(value)
      && typeof value === 'object'
      && typeof (value as CapabilityReference).kind === 'string',
    )
  }
  const kind: CapabilityReference['kind'] =
    capability === 'stt' ? 'audio'
      : capability === 'file_analysis' ? 'document'
        : capability.includes('video') && !capability.startsWith('image_to_') ? 'video'
          : 'image'
  const references: CapabilityReference[] = (request.files ?? []).map((url) => ({ kind, url }))
  if (request.metadata?.referenceData !== undefined) {
    references.push({
      kind,
      data: request.metadata.referenceData,
      mimeType: typeof request.metadata.referenceMimeType === 'string'
        ? request.metadata.referenceMimeType
        : undefined,
    })
  }
  return references
}

function capabilityOutputType(capability: CapabilityRouterCapability): string {
  if (['code', 'repo_edit', 'app_build'].includes(capability)) return 'code'
  if (capability === 'avatar_generation' || capability === 'adult_avatar') return 'image'
  if (capability.includes('image')) return 'image'
  if (capability.includes('video') || capability === 'avatar_video') return 'video'
  if (['tts', 'voice_response', 'adult_voice', 'music_generation'].includes(capability)) return 'audio'
  return 'text'
}

function capabilityArtifactType(capability: CapabilityRouterCapability): ArtifactType {
  if (capability === 'music_generation') return 'music'
  if (capability === 'stt') return 'transcript'
  if (capability === 'research' || capability === 'scrape_website') return 'research_result'
  if (capability === 'deploy_plan') return 'deployment_plan'
  if (capability === 'app_build') return 'app_blueprint'
  if (capability === 'repo_edit') return 'repo_patch'
  if (capability === 'avatar_generation' || capability === 'adult_avatar') return 'image'
  if (['tts', 'voice_response', 'adult_voice'].includes(capability)) return 'voice'
  const outputType = capabilityOutputType(capability)
  return ['code', 'audio', 'image', 'video'].includes(outputType)
    ? outputType as ArtifactType
    : 'text'
}

function localMediaTypeForCapability(capability: CapabilityRouterCapability): 'image' | 'audio' | 'music' | 'video' | null {
  if (capability === 'music_generation') return 'music'
  if (['tts', 'voice_response', 'adult_voice'].includes(capability)) return 'audio'
  if (capability === 'avatar_generation' || capability === 'adult_avatar') return 'image'
  const artifactType = capabilityArtifactType(capability)
  return ['image', 'audio', 'music', 'video'].includes(artifactType)
    ? artifactType as 'image' | 'audio' | 'music' | 'video'
    : null
}

function shouldPersistCapabilityArtifact(input: {
  request: CapabilityRequest
  capability: CapabilityRouterCapability
  definitionCreatesArtifact: boolean
}): boolean {
  if (input.request.saveArtifact === true) return true
  if (input.request.saveArtifact === false) return false
  if (!input.definitionCreatesArtifact) return false
  if (localMediaTypeForCapability(input.capability)) return true
  const durableByJob = typeof input.request.metadata?.executionId === 'string'
    || typeof input.request.metadata?.jobId === 'string'
    || input.request.metadata?.durableOutput === true
  if (durableByJob) return true
  return false
}

async function completeCapabilityResult(input: {
  request: CapabilityRequest
  capability: CapabilityRouterCapability
  taxonomyId: string
  definitionCreatesArtifact: boolean
  adapterResult: Awaited<ReturnType<NonNullable<ReturnType<typeof getProviderCapabilityAdapter>>['execute']>>
  attempts: ProviderAttempt[]
  selectedAttemptIndex?: number
  fallbackUsed: boolean
}): Promise<CapabilityResponse> {
  const output = input.adapterResult.mediaUrl
    ?? (typeof input.adapterResult.output === 'string'
      ? input.adapterResult.output
      : input.adapterResult.output == null
        ? null
        : JSON.stringify(input.adapterResult.output))
  if (!output && !input.adapterResult.bytes) {
    return capabilityFailure(
      input.capability,
      'UNAVAILABLE',
      'Provider completed without a usable result.',
      'malformed_response',
      input.adapterResult.provider,
      input.adapterResult.model,
      input.attempts,
    )
  }

  const response: CapabilityResponse = {
    success: true,
    capability: input.capability,
    readiness: 'READY',
    provider: input.adapterResult.provider,
    model: input.adapterResult.model,
    outputType: capabilityOutputType(input.capability),
    output,
    status: 'completed',
    fallbackUsed: input.fallbackUsed,
    fallbackReason: input.fallbackUsed ? 'An earlier provider/model attempt failed.' : undefined,
    providerAttempts: input.attempts,
  }
  const appSlug = input.request.appId ?? input.request.workspaceId ?? '__system__'
  if (!shouldPersistCapabilityArtifact({
    request: input.request,
    capability: input.capability,
    definitionCreatesArtifact: input.definitionCreatesArtifact,
  })) {
    await recordCapabilityTraceSafe({
      traceId: input.request.traceId,
      appSlug,
      adultModeState: input.request.adultMode ? 'enabled' : 'off',
      capability: input.capability,
      eventType: 'capability.completed',
      selectedRoute: {
        provider: input.adapterResult.provider,
        model: input.adapterResult.model,
      },
      payload: { artifactRequired: false, fallbackUsed: input.fallbackUsed },
    })
    return response
  }

  try {
    const requestedArtifactType = typeof input.request.metadata?.artifactTypeOverride === 'string'
      ? input.request.metadata.artifactTypeOverride
      : null
    const artifactType = requestedArtifactType && ARTIFACT_TYPES.includes(requestedArtifactType as ArtifactType)
      ? requestedArtifactType as ArtifactType
      : capabilityArtifactType(input.capability)
    const artifactCapability = typeof input.request.metadata?.artifactCapabilityOverride === 'string'
      ? input.request.metadata.artifactCapabilityOverride
      : input.taxonomyId
    const artifactSubType = typeof input.request.metadata?.artifactSubTypeOverride === 'string'
      ? input.request.metadata.artifactSubTypeOverride
      : input.capability
    const artifact = await createArtifact({
      appSlug,
      appId: input.request.appId,
      workspaceId: input.request.workspaceId,
      executionId: typeof input.request.metadata?.executionId === 'string'
        ? input.request.metadata.executionId
        : undefined,
      type: artifactType,
      subType: artifactSubType,
      capability: artifactCapability,
      provider: input.adapterResult.provider,
      model: input.adapterResult.model,
      traceId: input.request.traceId,
      mimeType: input.adapterResult.contentType ?? undefined,
      content: input.adapterResult.bytes
        ?? (output && !output.startsWith('http') ? Buffer.from(output, 'utf8') : undefined),
      contentUrl: input.adapterResult.mediaUrl ?? undefined,
      metadata: {
        ...(input.request.metadata ?? {}),
        providerAttempts: input.attempts,
      },
    })
    const selectedAttempt = input.selectedAttemptIndex === undefined
      ? null
      : input.attempts[input.selectedAttemptIndex] ?? null
    if (selectedAttempt) {
      selectedAttempt.artifactPersisted = true
      selectedAttempt.previewDownloadAvailable = Boolean(artifact.downloadUrl || artifact.storageUrl)
    }
    await recordCapabilityTraceSafe({
      traceId: input.request.traceId,
      appSlug,
      adultModeState: input.request.adultMode ? 'enabled' : 'off',
      capability: input.capability,
      eventType: 'capability.completed',
      selectedRoute: {
        provider: input.adapterResult.provider,
        model: input.adapterResult.model,
      },
      artifactId: artifact.id,
      payload: { artifactMime: artifact.mimeType, fallbackUsed: input.fallbackUsed },
    })
    return {
      ...response,
      artifactId: artifact.id,
      artifactUrl: artifact.downloadUrl,
      output: artifact.storageUrl ?? output,
    }
  } catch (error) {
    await recordCapabilityTraceSafe({
      traceId: input.request.traceId,
      appSlug,
      adultModeState: input.request.adultMode ? 'enabled' : 'off',
      capability: input.capability,
      eventType: 'capability.artifact_failed',
      selectedRoute: {
        provider: input.adapterResult.provider,
        model: input.adapterResult.model,
      },
      errorCategory: 'artifact_error',
      payload: { error: sanitizeProviderError(error) },
    })
    return {
      ...response,
      warning: `Provider execution succeeded but artifact persistence failed: ${sanitizeProviderError(error)}`,
      error_category: 'artifact_error',
      nextActions: ['Check canonical storage readiness and retry artifact persistence.'],
    }
  }
}

async function executeWebsiteCapability(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): Promise<CapabilityResponse> {
  const result = await crawlAppWebsite(request.input.trim())
  if (!result.success) {
    const classified = classifyProviderError({ error: result.error })
    return capabilityFailure(
      capability,
      classified.category === 'missing_key' ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
      classified.message || 'Website crawl failed.',
      classified.category,
      'local-crawler',
    )
  }
  const output = JSON.stringify({
    summary: result.summary,
    pages: result.pages.length,
    niche: result.detectedNiche,
    features: result.detectedFeatures,
    capabilities: result.aiCapabilitiesNeeded,
  })
  const response: CapabilityResponse = {
    success: true,
    capability,
    readiness: 'READY',
    provider: 'local-crawler',
    model: null,
    outputType: 'text',
    output,
    status: 'completed',
    fallbackUsed: false,
    providerAttempts: [],
  }
  if (!request.saveArtifact) return response
  try {
    const artifact = await createArtifact({
      appSlug: request.appId ?? request.workspaceId ?? '__system__',
      appId: request.appId,
      workspaceId: request.workspaceId,
      type: 'research_result',
      subType: capability,
      capability,
      content: Buffer.from(output, 'utf8'),
      metadata: request.metadata,
    })
    return { ...response, artifactId: artifact.id, artifactUrl: artifact.downloadUrl }
  } catch (error) {
    return {
      ...response,
      warning: `Crawl succeeded but artifact persistence failed: ${sanitizeProviderError(error)}`,
      error_category: 'artifact_error',
    }
  }
}

function capabilityFailure(
  capability: CapabilityRouterCapability,
  readiness: Exclude<CapabilityResponse['readiness'], 'READY'>,
  error: string,
  errorCategory: CapabilityResponse['error_category'],
  provider: string | null = null,
  model: string | null = null,
  attempts: ProviderAttempt[] = [],
  code?: CapabilityResponse['code'],
): CapabilityResponse {
  return {
    success: false,
    capability,
    readiness,
    provider,
    model,
    outputType: capabilityOutputType(capability),
    output: null,
    status: 'failed',
    fallbackUsed: attempts.length > 1,
    fallbackReason: attempts.length > 1 ? 'Every eligible provider/model attempt failed.' : undefined,
    error: sanitizeProviderError(error),
    error_category: errorCategory,
    code,
    providerAttempts: attempts,
    diagnostics: attempts.length
      ? { providerAttempts: summarizeFailedProviderAttempts(attempts) }
      : undefined,
    nextActions: readiness === 'NEEDS_INPUT'
      ? ['Attach the required source input and retry.']
      : readiness === 'NEEDS_CONFIGURATION'
      ? ['Configure and live-test at least one approved provider for this capability.']
      : readiness === 'UNAVAILABLE'
        ? ['Review provider attempts in admin diagnostics and retry after correcting the provider contract.']
        : [],
  }
}

function summarizeFailedProviderAttempts(attempts: ProviderAttempt[]) {
  return attempts.slice(-5).map((attempt) => ({
    provider: attempt.provider,
    model: attempt.model,
    status: attempt.status,
    classification: attempt.classification ?? null,
    errorCategory: attempt.errorCategory ?? null,
    error: attempt.error ?? null,
    diagnostics: summarizeAttemptDiagnostics(attempt.diagnostics),
  }))
}

function summarizeAttemptDiagnostics(diagnostics: ProviderAttempt['diagnostics']) {
  if (!diagnostics) return null
  return Object.fromEntries(Object.entries(diagnostics)
    .filter(([key]) => !/key|token|secret|password|authorization/i.test(key))
    .map(([key, value]) => [key, summarizeDiagnosticValue(value)]))
}

function summarizeDiagnosticValue(value: unknown): unknown {
  if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}...` : value
  if (Array.isArray(value)) return value.slice(0, 8).map(summarizeDiagnosticValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/key|token|secret|password|authorization/i.test(key))
      .slice(0, 12)
      .map(([key, item]) => [key, summarizeDiagnosticValue(item)]))
  }
  return value
}
