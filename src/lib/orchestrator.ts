/**
 * Amarktai Network — AmarktAI Orchestration Layer
 *
 * Single source of truth for:
 *   - Task classification (complexity, execution mode, validation flags)
 *   - Specialist profile mapping (per app category)
 *   - Unified execution engine (delegates to routing-engine, agent-runtime,
 *     retrieval-engine, multimodal-router)
 *   - Confidence scoring
 *
 * Called exclusively by the Brain Gateway (/api/brain/request).
 * Server-side only. Never import from client components.
 *
 * ROUTING FLOW (unified):
 *   classifyTask() → routing-engine.routeRequest() → mode-specific execution
 *
 * Supported modes:
 *   - direct / specialist  → single model call
 *   - review               → primary + validator
 *   - consensus             → two independent generations
 *   - retrieval_chain       → retrieval-engine → model
 *   - agent_chain           → agent-runtime → model(s)
 *   - multimodal_chain      → multimodal-router
 *   - premium_escalation    → escalated model call
 *
 * CONFIDENCE SCORING LOGIC (heuristic, truthful, explainable):
 *   - Base: 0.70 for any routed provider
 *   - +0.15 if provider health is "healthy"
 *   - +0.05 if task category matches provider specialty
 *   - -0.10 if fallback provider was used
 *   - -0.10 if validation step failed or was skipped due to no second provider
 *   - -0.05 per warning beyond the first
 *   Clamped to [0.10, 0.99].
 */

import { callProvider, type ProviderCallResult } from '@/lib/brain'
import { prisma } from '@/lib/prisma'
import {
  getDefaultModelForProvider,
  getModelRegistry,
  isProviderUsable,
  getModelById,
  setProviderHealth,
  type ProviderHealthStatus,
} from '@/lib/model-registry'
import { routeRequest, type RoutingDecision } from '@/lib/routing-engine'
import { isProviderWithinBudget } from '@/lib/budget-tracker'
import { createAgentTask, executeAgent, handoffTask, isAgentPermitted } from '@/lib/agent-runtime'
import { retrieve, type RetrievalResult } from '@/lib/retrieval-engine'
import { generateContent, type MultimodalResult } from '@/lib/multimodal-router'
import { getAppProfileFromDb, runtimeProfileOverrides } from '@/lib/app-profiles'
import { recordPerformance, loadSmartRouterState } from '@/lib/smart-router'
import { lookupCache, storeInCache } from '@/lib/semantic-cache'
import { alertNoEligibleModel } from '@/lib/alert-engine'
import type { ModelEntry } from '@/lib/model-registry'
import {
  getGenXStatusAsync,
  selectGenXModel,
  callGenXChat,
  type GenXChatMessage,
} from '@/lib/genx-client'
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
import {
  productCapabilityToTaxonomyId,
  selectCapabilityRoutePlan,
} from '@/lib/capability-routing-policy'
import {
  isApprovedDirectProvider,
  sanitizeProviderError,
  type ApprovedDirectProviderId,
} from '@/lib/provider-mesh'
import { validateProviderModelAsync } from '@/lib/provider-registry'
import {
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/provider-performance'
import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { createLocalMediaJob } from '@/lib/media-job-store'
import {
  getAppSafetyConfig,
  loadAppSafetyConfigFromDB,
  scanContent,
} from '@/lib/content-filter'
import { crawlAppWebsite } from '@/lib/firecrawl'

/**
 * Check whether a model supports the given modality.
 * Returns true for text (no restriction) or when the model carries
 * the corresponding capability flag. Returns false (fail-safe) for
 * unknown models (null/undefined).
 */
function checkModalitySupport(model: ModelEntry | null | undefined, modality: string): boolean {
  if (!model) return false // unknown model — fail safe
  switch (modality) {
    case 'image':      return model.supports_image_generation === true
    case 'voice':      return model.supports_tts === true || model.supports_stt === true
    case 'embeddings': return model.supports_embeddings === true
    case 'moderation': return model.supports_moderation === true
    case 'video':      return model.supports_video_generation === true || model.supports_video_planning === true
    default:           return true
  }
}

// Consensus synthesizer: prefer longer response if it exceeds primary by this ratio
const CONSENSUS_LENGTH_RATIO_THRESHOLD = 1.2
// Warn about differing consensus outputs if length difference exceeds this (chars)
const CONSENSUS_LENGTH_DIFF_THRESHOLD = 200
const FALLBACK_DISABLED_WARNING = 'Primary model failed and fallback is disabled by policy.'

/** Task types that require image-generation routing (evaluated once at module load). */
const IMAGE_TASK_TYPES_SET = new Set(['image_generation', 'image', 'image_gen', 'generate_image', 'create_image', 'image_editing'])

/** Task types that require voice/audio routing. */
const VOICE_TASK_TYPES_SET = new Set(['tts', 'text_to_speech', 'stt', 'speech_to_text', 'voice', 'voice_input', 'voice_output', 'realtime_voice'])

/** Task types that require embeddings routing. */
const EMBEDDINGS_TASK_TYPES_SET = new Set(['embeddings', 'embedding', 'embed', 'vector'])

/** Task types that require moderation routing. */
const MODERATION_TASK_TYPES_SET = new Set(['moderation', 'moderate', 'content_moderation'])

/** Budget mode → max cost tier mapping for routing-engine integration. */
const BUDGET_TO_COST_TIER: Record<string, string> = {
  low_cost: 'low',
  balanced: 'medium',
  best_quality: 'premium',
}

/** Task types that require video routing. */
const VIDEO_TASK_TYPES_SET = new Set(['video', 'video_generation', 'video_gen', 'video_planning'])

/**
 * Message-content-based image detection.
 *
 * When the explicit taskType is a generic type (e.g. "chat"), but the message
 * clearly requests image generation, this function returns true so the
 * orchestrator sets the correct modality and never routes to a text model.
 *
 * This prevents the critical bug where "create an image of a sunset" sent
 * with taskType="chat" would be routed to gpt-4o-mini for a text response.
 */
const IMAGE_MESSAGE_PATTERNS = [
  /\b(?:create|generate|make|draw|paint|design|produce|render)\b.*\b(?:image|picture|photo|illustration|artwork|visual|graphic)\b/i,
  /\b(?:image|picture|photo|illustration|artwork|visual|graphic)\b.*\b(?:of|showing|depicting|with|featuring)\b/i,
  /\bdall-?e\b/i,
  /\bimage.?generat/i,
  /\bgenerate.?(?:an?\s+)?image\b/i,
]

function detectImageFromMessage(normalizedTask: string, message: string): boolean {
  // Only activate for generic task types — don't override explicit non-image tasks
  if (normalizedTask && !['chat', 'help', 'ping', 'support', 'general', ''].includes(normalizedTask)) {
    return false
  }
  const msg = (message ?? '').toLowerCase()
  return IMAGE_MESSAGE_PATTERNS.some(p => p.test(msg))
}

// ── Classification ────────────────────────────────────────────────────────────

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

/**
 * Classify a task before orchestration.
 *
 * Rules (transparent and minimal — not over-engineered):
 *
 * Complexity:
 *   - simple   → short message (<= 120 chars) AND generic taskType (chat|help|ping)
 *   - complex  → taskType contains analysis|review|audit|forecast|decision|report
 *                OR category is crypto/finance/forex AND taskType is not 'chat'
 *   - moderate → everything else
 *
 * Execution mode:
 *   - direct    → simple tasks
 *   - specialist → moderate tasks (routes to best specialist for the category)
 *   - review    → complex tasks OR financial/operational categories
 *   - consensus → explicit consensus taskType OR very high-stakes category + complex
 *
 * Validation: required for review/consensus modes.
 * Consensus:  only when explicit or complex + financial.
 * Memory:     reserved for future — always false for now.
 * Low latency: simple direct tasks are considered latency-sensitive.
 */
export function classifyTask(
  appCategory: string,
  taskType: string,
  message: string,
): ClassificationResult {
  const cat = (appCategory ?? '').toLowerCase()
  const task = (taskType ?? '').toLowerCase()
  const msgLen = (message ?? '').length

  const isFinancial = cat.includes('crypto') || cat.includes('finance') || cat.includes('forex') || cat.includes('trading')
  const isGenericTask = task === 'chat' || task === 'help' || task === 'ping' || task === 'support'
  const isComplexTask =
    task.includes('analysis') || task.includes('review') || task.includes('audit') ||
    task.includes('forecast') || task.includes('decision') || task.includes('report') ||
    task.includes('strategy') || task.includes('recommendation')
  const isConsensusTask = task.includes('consensus') || task.includes('compare')

  // Complexity
  let taskComplexity: TaskComplexity
  if (msgLen <= 120 && isGenericTask) {
    taskComplexity = 'simple'
  } else if (isComplexTask || (isFinancial && !isGenericTask)) {
    taskComplexity = 'complex'
  } else {
    taskComplexity = 'moderate'
  }

  // Execution mode
  let executionMode: ExecutionMode
  if (taskComplexity === 'simple') {
    executionMode = 'direct'
  } else if (isConsensusTask || (taskComplexity === 'complex' && isFinancial)) {
    executionMode = 'consensus'
  } else if (taskComplexity === 'complex' || isFinancial) {
    executionMode = 'review'
  } else {
    executionMode = 'specialist'
  }

  const requiresValidation = executionMode === 'review' || executionMode === 'consensus'
  const requiresConsensus = executionMode === 'consensus'

  return {
    taskComplexity,
    executionMode,
    requiresValidation,
    requiresConsensus,
    memoryRetrievalNeeded: false, // reserved for memory layer
    lowLatencyRequired: executionMode === 'direct',
    appCategory: cat,
    taskType: task,
  }
}

// ── Specialist Profiles ───────────────────────────────────────────────────────

/**
 * Centralized specialist profile mapping.
 * Maps app category → system-level instruction for that domain.
 * Used to build the specialist prompt prefix passed to providers.
 */
export const SPECIALIST_PROFILES: Record<string, string> = {
  crypto:    'You are a specialist AI assistant for cryptocurrency and digital asset trading. Provide accurate, data-aware responses. Always note that outputs are not financial advice.',
  finance:   'You are a specialist AI assistant for financial analysis and markets. Provide rigorous, well-reasoned responses. Always note that outputs are not financial advice.',
  forex:     'You are a specialist AI assistant for forex and currency markets. Provide accurate, data-aware responses. Always note that outputs are not financial advice.',
  trading:   'You are a specialist AI assistant for trading strategy and market analysis. Provide structured, reasoned responses. Always note that outputs are not financial advice.',
  equine:    'You are a specialist AI assistant for equine care, horse management, and related lifestyle topics. Provide practical, expert-informed responses.',
  horse:     'You are a specialist AI assistant for equine care, horse management, and related lifestyle topics. Provide practical, expert-informed responses.',
  family:    'You are a helpful AI assistant for family lifestyle topics including health, education, and wellbeing. Provide warm, practical, and safe responses.',
  marketing: 'You are a specialist AI assistant for marketing strategy, brand content, and growth campaigns. Provide creative, structured, and actionable responses.',
  content:   'You are a specialist AI assistant for content creation, copywriting, and creative strategy. Provide clear, engaging, and audience-aware responses.',
  generic:   'You are a helpful and knowledgeable AI assistant. Provide clear, accurate, and useful responses.',
}

export function getSpecialistProfile(appCategory: string): string {
  const cat = (appCategory ?? '').toLowerCase()
  for (const key of Object.keys(SPECIALIST_PROFILES)) {
    if (cat.includes(key)) return SPECIALIST_PROFILES[key]
  }
  return SPECIALIST_PROFILES.generic
}

// ── Available Provider Record ─────────────────────────────────────────────────

interface AvailableProvider {
  providerKey: string
  model: string
  healthStatus: string
  isHealthy: boolean
}

/**
 * Resolve the default model for a provider.
 *
 * Delegates to the canonical model registry to avoid duplicate
 * switch-statements scattered across the codebase.
 */
function defaultModelFor(providerKey: string): string {
  return getDefaultModelForProvider(providerKey)
}

/**
 * Load available providers from the DB for fallback/validation use.
 * Used only as a secondary source when the routing engine's model-based
 * decisions need to be verified against actual DB state.
 */
async function loadAvailableProviders(): Promise<AvailableProvider[]> {
  const providers = await prisma.aiProvider.findMany({
    where: { enabled: true, healthStatus: { notIn: ['disabled', 'error'] } },
    orderBy: { sortOrder: 'asc' },
    select: { providerKey: true, defaultModel: true, healthStatus: true, apiKey: true },
  })

  return providers
    .filter(p => p.apiKey)
    .map(p => ({
      providerKey: p.providerKey,
      model: p.defaultModel || defaultModelFor(p.providerKey),
      healthStatus: p.healthStatus,
      isHealthy: p.healthStatus === 'healthy',
    }))
}

/**
 * Sync the model-registry provider health cache from DB-loaded providers.
 *
 * IMPORTANT: This **must** be called before any call to `routeRequest()` or
 * `decideExecution()` so that `getUsableModels()` / `isProviderUsable()` return
 * results that reflect actual DB configuration rather than the static registry
 * defaults (which mark every known model as enabled/configured).
 *
 * Marks each DB-configured provider with its real health status, and marks
 * every other known provider key (from the static registry) as 'unconfigured'.
 */
function syncProviderHealthCache(available: AvailableProvider[]): void {
  const configuredKeys = new Set(available.map(p => p.providerKey))

  // Mark configured providers with their real DB health status.
  // If healthStatus is 'unconfigured' (no health check run yet) but the
  // provider has an API key, upgrade it to 'configured' so the routing
  // engine treats it as usable. A provider with a key is at minimum
  // configured — it should never be excluded from routing just because
  // no health check has been run yet.
  for (const p of available) {
    const status: ProviderHealthStatus =
      p.healthStatus === 'unconfigured' ? 'configured' : (p.healthStatus as ProviderHealthStatus)
    setProviderHealth(p.providerKey, status)
  }

  // Mark all other known provider keys as unconfigured
  const allProviderKeys = new Set(getModelRegistry().map(m => m.provider))
  for (const key of Array.from(allProviderKeys)) {
    if (!configuredKeys.has(key)) {
      setProviderHealth(key, 'unconfigured')
    }
  }
}

// ── Decision Engine (delegates to routing-engine) ─────────────────────────────

export interface DecisionResult {
  executionMode: ExecutionMode
  primaryProvider: AvailableProvider | null
  secondaryProvider: AvailableProvider | null  // for review / consensus
  fallbackEligible: boolean
  fallbackUsed: boolean
  reason: string
  warnings: string[]
  /** The raw routing-engine decision (for traceability). */
  routingDecision?: RoutingDecision
}

/**
 * Detect whether the task has multimodal markers (creative, marketing, etc.).
 */
function detectMultimodal(appCategory: string, taskType: string): boolean {
  const cat = appCategory.toLowerCase()
  const task = taskType.toLowerCase()
  // Marketing / content creation categories
  if (cat.includes('marketing') || cat.includes('content') || cat.includes('creative')) {
    if (task.includes('campaign') || task.includes('ad') || task.includes('image') ||
        task.includes('video') || task.includes('reel') || task.includes('brand') ||
        task.includes('calendar') || task.includes('social') || task.includes('caption')) {
      return true
    }
  }
  return false
}

/**
 * Detect whether the task may benefit from retrieval-augmented generation.
 */
function detectRetrieval(taskType: string, message: string): boolean {
  const task = taskType.toLowerCase()
  // Explicit retrieval signals
  if (task.includes('recall') || task.includes('history') || task.includes('context') ||
      task.includes('previous') || task.includes('retrieval') || task.includes('memory')) {
    return true
  }
  // Message-based heuristic: "remember", "last time", "previously"
  const msg = message.toLowerCase()
  if (msg.includes('remember') || msg.includes('last time') || msg.includes('previously') ||
      msg.includes('recall') || msg.includes('past conversation')) {
    return true
  }
  return false
}

/**
 * Decision engine: given classification + context, uses the routing-engine
 * as the single source of truth for model/provider selection.
 *
 * Falls back to DB-based provider lookup when the routing engine has no models.
 */
export async function decideExecution(
  classification: ClassificationResult,
  available: AvailableProvider[],
  appSlug?: string,
  requiredModality?: 'text' | 'image' | 'video' | 'voice' | 'embeddings' | 'moderation',
): Promise<DecisionResult> {
  const warnings: string[] = []

  // Use the routing engine to make the model selection decision
  const routingCtx = {
    appSlug: appSlug ?? 'unknown',
    appCategory: classification.appCategory,
    taskType: classification.taskType,
    taskComplexity: classification.taskComplexity,
    message: '',
    requiresRetrieval: false,
    requiresMultimodal: false,
    // Pass requiredModality so the engine enforces correct modality filtering here too.
    // Without this, image/voice/video tasks in decideExecution would select text models,
    // generating a spurious "no eligible models" warning even when the outer routeRequest
    // (in orchestrate()) found a valid capability-matched model.
    ...(requiredModality && requiredModality !== 'text' ? { requiredModality } : {}),
  }
  const routingDecision = await routeRequest(routingCtx)

  if (routingDecision.primaryModel) {
    // Convert routing-engine's ModelEntry to AvailableProvider format
    const primary: AvailableProvider = {
      providerKey: routingDecision.primaryModel.provider,
      model: routingDecision.primaryModel.model_id,
      healthStatus: routingDecision.primaryModel.health_status,
      isHealthy: routingDecision.primaryModel.health_status === 'healthy' || routingDecision.primaryModel.health_status === 'configured',
    }
    const secondary = routingDecision.secondaryModel
      ? {
          providerKey: routingDecision.secondaryModel.provider,
          model: routingDecision.secondaryModel.model_id,
          healthStatus: routingDecision.secondaryModel.health_status,
          isHealthy: routingDecision.secondaryModel.health_status === 'healthy' || routingDecision.secondaryModel.health_status === 'configured',
        }
      : null

    // Map routing mode to execution mode
    let executionMode: ExecutionMode = routingDecision.mode as ExecutionMode

    // Validate secondary provider availability for review/consensus
    if ((executionMode === 'review' || executionMode === 'consensus') && !secondary) {
      executionMode = 'specialist'
      warnings.push(
        `${routingDecision.mode} mode requires 2 providers — only 1 available; downgraded to specialist mode`,
      )
    }

    warnings.push(...routingDecision.warnings)

    return {
      executionMode,
      primaryProvider: primary,
      secondaryProvider: secondary,
      fallbackEligible: routingDecision.fallbackModels.length > 0,
      fallbackUsed: false,
      reason: routingDecision.reason,
      warnings,
      routingDecision,
    }
  }

  // Fallback: routing engine had no models — use DB-loaded providers
  if (available.length === 0) {
    return {
      executionMode: 'direct',
      primaryProvider: null,
      secondaryProvider: null,
      fallbackEligible: false,
      fallbackUsed: false,
      reason: 'No providers available',
      warnings: ['No configured AI providers available'],
    }
  }

  warnings.push('Routing engine returned no eligible models — falling back to DB provider list')
  // Fire a deduped system alert so the Control Center reflects this routing failure.
  // This prevents the dashboard from showing "No errors — all clear" while routing is broken.
  alertNoEligibleModel(classification.taskType, appSlug).catch(() => {})

  // HARD GUARD: For non-text modalities (image, video, voice, embeddings, moderation),
  // the DB provider list only holds text chat models. Falling back would silently route
  // an image/voice/video task to a text model. Return null primary provider instead so
  // the caller's modality guard (step 5b in orchestrate) fires correctly.
  if (requiredModality && requiredModality !== 'text') {
    return {
      executionMode: 'direct',
      primaryProvider: null,
      secondaryProvider: null,
      fallbackEligible: false,
      fallbackUsed: false,
      reason: `No eligible model found for modality "${requiredModality}" — DB provider fallback suppressed to prevent text model from servicing a non-text task`,
      warnings: [...warnings, `DB fallback suppressed for modality="${requiredModality}"`],
    }
  }

  const primaryProvider = available[0]
  let secondaryProvider: AvailableProvider | null = null
  let executionMode: ExecutionMode = classification.executionMode

  if (executionMode === 'review' || executionMode === 'consensus') {
    secondaryProvider = available.find(p => p.providerKey !== primaryProvider.providerKey) ?? null
    if (!secondaryProvider) {
      executionMode = 'specialist'
      warnings.push(
        `${classification.executionMode} mode requires 2 providers — only 1 available; downgraded to specialist mode`,
      )
    }
  }

  return {
    executionMode,
    primaryProvider,
    secondaryProvider,
    fallbackEligible: available.length > 1,
    fallbackUsed: false,
    reason: `Fallback to DB providers — routed via ${primaryProvider.providerKey}`,
    warnings,
  }
}

/**
 * Compute a heuristic confidence score. Logic documented in module header.
 * Returns a value between 0.10 and 0.99.
 */
export function computeConfidenceScore(opts: {
  primaryProvider: AvailableProvider
  fallbackUsed: boolean
  validationPassed: boolean | null  // null = validation not attempted
  warnings: string[]
}): number {
  let score = 0.70

  if (opts.primaryProvider.isHealthy) score += 0.15
  else if (opts.primaryProvider.healthStatus === 'configured') score += 0.05

  if (opts.fallbackUsed) score -= 0.10

  if (opts.validationPassed === false) score -= 0.10
  else if (opts.validationPassed === null) score -= 0.00 // not attempted — neutral

  const extraWarnings = Math.max(0, opts.warnings.length - 1)
  score -= extraWarnings * 0.05

  return Math.min(0.99, Math.max(0.10, Math.round(score * 100) / 100))
}

// ── Execution Engine ──────────────────────────────────────────────────────────

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
  /** Human-readable explanation of why this provider/model was chosen. */
  routingReason?: string
  /** Capability name when a non-text capability routing failed (e.g. 'image_generation'). */
  capability?: string
  /** Machine-readable failure code (e.g. 'no_eligible_image_model'). */
  code?: string
  /** Candidate models that were evaluated and why they were rejected. */
  candidateModels?: Array<{ model_id: string; provider: string; enabled: boolean; rejection_reason: string }>
}

/**
 * Main orchestration entry point.
 *
 * Classifies the task, delegates to the routing-engine for model selection,
 * then executes in the decided mode — including new modes for agent chains,
 * retrieval chains, multimodal chains, and premium escalation.
 */
export async function orchestrate(opts: {
  appSlug?: string
  appCategory: string
  taskType: string
  message: string
  /** Optional provider key to override routing (validated against registry). */
  providerOverride?: string
  /** Optional model ID to use when providerOverride is set. */
  modelOverride?: string
  /** Budget mode from app agent: 'low_cost' | 'balanced' | 'best_quality'. Controls maxCostTier. */
  budgetMode?: 'low_cost' | 'balanced' | 'best_quality'
  /**
   * Optional system-level instructions from the app's configured App Agent.
   * Passed directly to each provider's native system role mechanism via callProvider,
   * ensuring the agent persona is applied without polluting the user message.
   */
  agentSystemPrompt?: string
  /** Explicit fallback opt-in. Silent fallback is disabled by default. */
  allowFallback?: boolean
}): Promise<OrchestrationResult> {
  const start = Date.now()
  const { appSlug, appCategory, taskType, message, providerOverride, modelOverride, budgetMode, agentSystemPrompt, allowFallback = false } = opts

  // Hydrate smart-router state from Redis on first request (fire-and-forget)
  loadSmartRouterState().catch(() => {})

  // 1. Classify
  const classification = classifyTask(appCategory, taskType, message)

  // 2. Load DB providers FIRST and sync the model-registry health cache so that
  //    getUsableModels() / isProviderUsable() reflect real configured state before
  //    any routing decision is made.
  const available = await loadAvailableProviders()

  // 2b. Pre-filter providers that have exceeded their budget critical threshold.
  //     Providers over budget are removed from the available list so the routing
  //     engine and fallback logic won't select them. If ALL are over budget,
  //     we keep all to avoid a total outage (the request route has a 429 guard).
  let filteredAvailable = available
  try {
    const budgetOk = await Promise.all(available.map(p => isProviderWithinBudget(p.providerKey)))
    const withinBudget = available.filter((_, i) => budgetOk[i])
    if (withinBudget.length > 0 && withinBudget.length < available.length) {
      filteredAvailable = withinBudget
    }
  } catch {
    // Budget DB unavailable — proceed with all providers
  }

  syncProviderHealthCache(filteredAvailable)

  // 2c. Hydrate per-app DB profile into runtimeProfileOverrides so the routing
  //     engine picks up DB-configured allowedProviders, preferredModels, etc.
  //     Runs async; failure falls back to static defaults silently.
  if (appSlug && appSlug !== 'unknown') {
    try {
      const dbProfile = await getAppProfileFromDb(appSlug)
      if (dbProfile) {
        runtimeProfileOverrides.set(appSlug.toLowerCase().trim(), dbProfile)
      }
    } catch {
      // DB lookup failure — routing engine falls back to static default profile
    }
  }

  // 3. Build routing context with signal detection
  const isMultimodal = detectMultimodal(appCategory, taskType)
  const isRetrieval = detectRetrieval(taskType, message)
  const normalizedTask = (taskType ?? '').toLowerCase()
  const isImageTask = IMAGE_TASK_TYPES_SET.has(normalizedTask) || detectImageFromMessage(normalizedTask, message)
  const isVoiceTask = VOICE_TASK_TYPES_SET.has(normalizedTask)
  const isEmbeddingsTask = EMBEDDINGS_TASK_TYPES_SET.has(normalizedTask)
  const isModerationTask = MODERATION_TASK_TYPES_SET.has(normalizedTask)
  const isVideoTask = VIDEO_TASK_TYPES_SET.has(normalizedTask)
  /** True for any non-text task that returns binary/URL output that can't be text-cached. */
  const isNonTextTask = isImageTask || isVoiceTask || isEmbeddingsTask || isVideoTask

  // Resolve required modality from task type — strict, no cross-capability fallback
  let detectedModality: 'text' | 'image' | 'video' | 'voice' | 'embeddings' | 'moderation' = 'text'
  if (isImageTask) detectedModality = 'image'
  else if (isVoiceTask) detectedModality = 'voice'
  else if (isEmbeddingsTask) detectedModality = 'embeddings'
  else if (isModerationTask) detectedModality = 'moderation'
  else if (isVideoTask) detectedModality = 'video'

  // Resolve maxCostTier from budget mode
  const resolvedMaxCostTier = budgetMode ? BUDGET_TO_COST_TIER[budgetMode] : undefined

  const routingCtx = {
    appSlug: appSlug ?? 'unknown',
    appCategory: classification.appCategory,
    taskType: classification.taskType,
    taskComplexity: classification.taskComplexity,
    message,
    requiresRetrieval: isRetrieval,
    requiresMultimodal: isMultimodal,
    ...(detectedModality !== 'text' ? { requiredModality: detectedModality } : {}),
    ...(resolvedMaxCostTier ? { maxCostTier: resolvedMaxCostTier } : {}),
  }

  // ── GenX-first routing (text tasks only) ───────────────────────────────────
  //
  // When GenX (the primary AI execution layer) is configured and reachable,
  // all text/chat requests are routed to it BEFORE consulting the model-registry
  // routing engine.  Non-text modalities (image, video, voice, embeddings,
  // moderation) are NEVER routed through this path — they use their own
  // specialist routes.
  //
  // Fallback reason is always logged when GenX is skipped so it is visible in
  // Brain routing logs and the Monitor dashboard.
  if (detectedModality === 'text' && !providerOverride) {
    try {
      const genxStatus = await getGenXStatusAsync()
      if (genxStatus.available) {
        const genxModel = await selectGenXModel(
          'best',
          'chat',       // capability
          'chat',       // operationType — both 'chat' for general conversation
        )
        const genxMessages: GenXChatMessage[] = []
        if (agentSystemPrompt) genxMessages.push({ role: 'system', content: agentSystemPrompt })
        genxMessages.push({ role: 'user', content: message })

        const genxResult = await callGenXChat({
          model: genxModel,
          messages: genxMessages,
          max_tokens: 2048,
          metadata: { source: 'orchestrator', taskType, appSlug, appCategory },
        })

        if (genxResult.success && genxResult.output) {
          console.info(
            `[orchestrator] GenX primary: model=${genxResult.model} task=${taskType} app=${appSlug ?? 'unknown'} latency=${genxResult.latencyMs}ms`,
          )
          return {
            output: genxResult.output,
            executionMode: 'specialist',
            routedProvider: 'genx',
            routedModel: genxResult.model,
            confidenceScore: 0.90,
            validationUsed: false,
            consensusUsed: false,
            fallbackUsed: false,
            memoryUsed: false,
            warnings: [],
            errors: [],
            latencyMs: genxResult.latencyMs,
            classification,
            routingReason: `GenX primary — capability: text/${taskType} app=${appSlug ?? 'unknown'}`,
          }
        }

        // GenX reachable but call failed — log and fall through to provider routing
        console.warn(
          `[orchestrator] GenX primary failed (${genxResult.error ?? 'empty output'}) — falling back to provider routing. task=${taskType} app=${appSlug ?? 'unknown'}`,
        )
      } else {
        console.info(
          `[orchestrator] GenX not available (${genxStatus.error ?? 'not configured'}) — routing via provider vault. task=${taskType}`,
        )
      }
    } catch (genxErr) {
      console.warn(
        `[orchestrator] GenX check threw: ${genxErr instanceof Error ? genxErr.message : String(genxErr)} — falling back to provider routing.`,
      )
    }
  }

  // 4. Route via the routing-engine (now health-aware — only configured providers considered)
  const routingDecision = await routeRequest(routingCtx)

  // 5. Build decision from routing-engine result (also uses health-aware cache internally)
  const decision = await decideExecution(classification, filteredAvailable, appSlug, detectedModality !== 'text' ? detectedModality : undefined)

  // 5a. CRITICAL: When the modality-aware routing produced a valid primary model
  //     (e.g. dall-e-3 for image tasks), use IT instead of decideExecution's internally-
  //     routed model (which has no modality signal and selects a chat model).
  //     This fixes the bug where image tasks received text output.
  if (routingDecision.primaryModel) {
    decision.primaryProvider = {
      providerKey: routingDecision.primaryModel.provider,
      model: routingDecision.primaryModel.model_id,
      healthStatus: routingDecision.primaryModel.health_status,
      isHealthy:
        routingDecision.primaryModel.health_status === 'healthy' ||
        routingDecision.primaryModel.health_status === 'configured',
    }
  }

  // 5b. CRITICAL: Hard capability guard — when a non-text modality was required
  //     but the routing engine found no eligible model, STOP immediately.
  //     Never silently fall through to a text model for image/voice/video/embeddings/moderation.
  if (detectedModality !== 'text' && !routingDecision.primaryModel) {
    const capabilityLabel: Record<string, string> = {
      image:      'image generation',
      voice:      'voice/audio',
      video:      'video generation',
      embeddings: 'text embeddings',
      moderation: 'content moderation',
    }
    const label = capabilityLabel[detectedModality] ?? detectedModality
    const checkedProviders = filteredAvailable.map(p => p.providerKey)

    // Build diagnostic: which models were considered and why they were rejected.
    const candidateModels = getModelRegistry()
      .filter((m) => {
        if (detectedModality === 'image') return m.supports_image_generation
        if (detectedModality === 'voice') return m.supports_tts || m.supports_stt
        if (detectedModality === 'video') return m.supports_video_generation || m.supports_video_planning
        if (detectedModality === 'embeddings') return m.supports_embeddings
        if (detectedModality === 'moderation') return m.supports_moderation
        return false
      })
      .map((m) => ({
        model_id: m.model_id,
        provider: m.provider,
        enabled: m.enabled,
        rejection_reason: !m.enabled
          ? 'model_disabled'
          : !checkedProviders.includes(m.provider)
            ? 'provider_not_configured'
            : 'provider_unconfigured_or_unhealthy',
      }))

    return {
      output: null,
      executionMode: 'direct',
      routedProvider: null,
      routedModel: null,
      confidenceScore: null,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: false,
      warnings: [...decision.warnings, ...routingDecision.warnings],
      errors: [
        `No eligible model found for capability: ${label}. ` +
        `Configure a provider that supports ${label} (e.g. OpenAI for images, Groq/OpenAI for voice). ` +
        `Providers checked: [${checkedProviders.join(', ') || 'none'}]. ` +
        `Cross-capability fallback to text models is strictly prohibited.`,
      ],
      capability: detectedModality === 'image' ? 'image_generation' : detectedModality,
      code: detectedModality === 'image' ? 'no_eligible_image_model' : `no_eligible_${detectedModality}_model`,
      candidateModels,
      latencyMs: Date.now() - start,
      classification,
      routingReason: routingDecision.reason,
    }
  }

  // 5c. Apply provider/model override from app metadata (Phase 2).
  //     Validate the override is actually a configured, usable provider before applying.
  if (providerOverride) {
    const overrideUsable = isProviderUsable(providerOverride)
    if (overrideUsable) {
      // Resolve model: use explicit modelOverride if provided and valid,
      // otherwise fall back to the DB-loaded default for that provider,
      // otherwise keep the current primary model (if any).
      const resolvedModel =
        (modelOverride && getModelById(providerOverride, modelOverride)?.model_id) ||
        filteredAvailable.find(p => p.providerKey === providerOverride)?.model ||
        decision.primaryProvider?.model
      decision.primaryProvider = {
        providerKey: providerOverride,
        model: resolvedModel ?? providerOverride,
        healthStatus: 'configured',
        isHealthy: true,
      }
      decision.warnings = decision.warnings ?? []
      decision.warnings.push(`Provider override applied: using ${providerOverride}/${resolvedModel}`)
    } else {
      decision.warnings = decision.warnings ?? []
      decision.warnings.push(
        `Provider override "${providerOverride}" is not configured or usable — using routed provider instead`,
      )
    }
  }

  // Override the execution mode with the routing engine's mode when it returns valid models
  let effectiveMode: ExecutionMode = decision.executionMode
  if (routingDecision.primaryModel) {
    effectiveMode = routingDecision.mode as ExecutionMode
    // But still respect downgrade for review/consensus without secondary
    if ((effectiveMode === 'review' || effectiveMode === 'consensus') && !decision.secondaryProvider) {
      effectiveMode = 'specialist'
    }
  }

  // 6. No providers at all
  if (!decision.primaryProvider) {
    return {
      output: null,
      executionMode: effectiveMode,
      routedProvider: null,
      routedModel: null,
      confidenceScore: null,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: false,
      warnings: decision.warnings,
      errors: ['No AI provider is available — all providers are unconfigured or disabled'],
      latencyMs: Date.now() - start,
      classification,
      routingReason: decision.reason,
    }
  }

  // 7. Build specialist prompt
  const systemProfile = getSpecialistProfile(classification.appCategory)
  const specialistMessage = effectiveMode === 'direct'
    ? message
    : `${systemProfile}\n\n---\n\n${message}`

  // 8. Execute based on the resolved mode
  const warnings = [...decision.warnings]
  const errors: string[] = []

  switch (effectiveMode) {
    // ── Agent Chain ─────────────────────────────────────────────────────
    case 'agent_chain': {
      return await executeAgentChain({
        appSlug: appSlug ?? 'unknown',
        message,
        start,
        classification,
        decision,
        warnings,
      })
    }

    // ── Retrieval Chain ─────────────────────────────────────────────────
    case 'retrieval_chain': {
      return await executeRetrievalChain({
        appSlug: appSlug ?? 'unknown',
        message,
        specialistMessage,
        start,
        classification,
        decision,
        warnings,
      })
    }

    // ── Multimodal Chain ────────────────────────────────────────────────
    case 'multimodal_chain': {
      return await executeMultimodalChain({
        appSlug: appSlug ?? 'unknown',
        appCategory,
        taskType,
        message,
        start,
        classification,
        decision,
        warnings,
      })
    }

    // ── Premium Escalation ──────────────────────────────────────────────
    case 'premium_escalation': {
      const result = await callProvider(
        decision.primaryProvider.providerKey,
        decision.primaryProvider.model,
        specialistMessage,
        agentSystemPrompt,
      )
      if (!result.ok) {
        errors.push(result.error ?? 'Premium escalation provider call failed')
        // Try fallback from routing decision
        if (allowFallback && routingDecision.fallbackModels.length > 0) {
          const fb = routingDecision.fallbackModels[0]
          warnings.push(`Premium escalation failed — attempting fallback to ${fb.provider}/${fb.model_id}`)
          const fallback = await callProvider(fb.provider, fb.model_id, specialistMessage, agentSystemPrompt)
          if (fallback.ok) {
            const confidence = computeConfidenceScore({
              primaryProvider: { ...decision.primaryProvider, providerKey: fb.provider, isHealthy: true, healthStatus: 'configured', model: fb.model_id },
              fallbackUsed: true,
              validationPassed: null,
              warnings,
            })
            return {
              output: fallback.output,
              executionMode: 'premium_escalation',
              routedProvider: fallback.providerKey,
              routedModel: fallback.model,
              confidenceScore: confidence,
              validationUsed: false,
              consensusUsed: false,
              fallbackUsed: true,
              memoryUsed: false,
              warnings,
              errors,
              latencyMs: Date.now() - start,
              classification,
            }
          }
          errors.push(fallback.error ?? 'Fallback also failed')
        }
      }
      const confidence = result.ok
        ? computeConfidenceScore({ primaryProvider: decision.primaryProvider, fallbackUsed: false, validationPassed: null, warnings })
        : null
      return {
        output: result.output,
        executionMode: 'premium_escalation',
        routedProvider: result.providerKey,
        routedModel: result.model,
        confidenceScore: confidence,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: false,
        memoryUsed: false,
        warnings,
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    // ── Direct / Specialist ─────────────────────────────────────────────
    case 'direct':
    case 'specialist': {
      // ── Last-line-of-defense capability check ─────────────────────────
      // Verify the selected model actually supports the required modality.
      // This catches any edge case where the routing guard above was bypassed
      // (e.g. by a provider override pointing to a text model for an image task).
      if (detectedModality !== 'text') {
        const selectedModel = getModelById(
          decision.primaryProvider.providerKey,
          decision.primaryProvider.model,
        )
        const capabilityOk = checkModalitySupport(selectedModel, detectedModality)
        if (!capabilityOk) {
          return {
            output: null,
            executionMode: 'direct',
            routedProvider: decision.primaryProvider.providerKey,
            routedModel: decision.primaryProvider.model,
            confidenceScore: null,
            validationUsed: false,
            consensusUsed: false,
            fallbackUsed: false,
            memoryUsed: false,
            warnings,
            errors: [
              `Capability mismatch: model "${decision.primaryProvider.model}" ` +
              `(${decision.primaryProvider.providerKey}) does not support ${detectedModality}. ` +
              `Cross-capability execution is strictly prohibited. ` +
              `Configure a ${detectedModality}-capable provider to enable this feature.`,
            ],
            latencyMs: Date.now() - start,
            classification,
          }
        }
        if (!allowFallback) warnings.push(FALLBACK_DISABLED_WARNING)
      }

      // ── Semantic cache lookup (text-only tasks) ──────────────────────
      // Skip cache for image/TTS/STT/video/embeddings tasks — those return binary/URL outputs
      // that can't be meaningfully cached by text similarity.
      if (!isNonTextTask && appSlug) {
        try {
          const cacheHit = await lookupCache(message, appSlug, taskType)
          if (cacheHit.hit && cacheHit.entry) {
            warnings.push(`Semantic cache hit (similarity: ${(cacheHit.similarity ?? 0).toFixed(3)}) — returning cached response`)
            const confidence = computeConfidenceScore({
              primaryProvider: decision.primaryProvider,
              fallbackUsed: false,
              validationPassed: null,
              warnings,
            })
            return {
              output: cacheHit.entry.response,
              executionMode: decision.executionMode,
              routedProvider: cacheHit.entry.provider,
              routedModel: cacheHit.entry.model,
              confidenceScore: confidence,
              validationUsed: false,
              consensusUsed: false,
              fallbackUsed: false,
              memoryUsed: false,
              warnings,
              errors,
              latencyMs: Date.now() - start,
              classification,
            }
          }
        } catch {
          // Cache lookup failure — proceed normally
        }
      }

      const result = await callProvider(
        decision.primaryProvider.providerKey,
        decision.primaryProvider.model,
        specialistMessage,
        agentSystemPrompt,
      )

      // Record performance for smart-router learning (fire-and-forget)
      recordPerformance({
        modelId: result.model ?? decision.primaryProvider.model,
        provider: result.providerKey ?? decision.primaryProvider.providerKey,
        taskType,
        success: result.ok,
        latencyMs: Date.now() - start,
        confidence: result.ok ? 0.8 : 0.0,
        costEstimate: 0.001, // coarse estimate; refined later
        timestamp: Date.now(),
      })

      if (!result.ok) {
        errors.push(result.error ?? 'Provider call failed')
        // Attempt fallback if a secondary is available, but ONLY if the secondary
        // supports the required modality. Never fall back to a text model for an
        // image/voice/video/embeddings task — that produces wrong-type output.
        if (allowFallback && decision.secondaryProvider) {
          const secondaryModel = getModelById(
            decision.secondaryProvider.providerKey,
            decision.secondaryProvider.model,
          )
          const fallbackCapabilityOk = detectedModality === 'text'
            || checkModalitySupport(secondaryModel, detectedModality)
          if (!fallbackCapabilityOk) {
            warnings.push(
              `Fallback skipped: secondary model "${decision.secondaryProvider.model}" ` +
              `(${decision.secondaryProvider.providerKey}) does not support ${detectedModality}. ` +
              `Cross-capability fallback is strictly prohibited.`,
            )
          } else {
          warnings.push(`Primary provider failed — attempting fallback to ${decision.secondaryProvider.providerKey}`)
          const fallback = await callProvider(
            decision.secondaryProvider.providerKey,
            decision.secondaryProvider.model,
            specialistMessage,
            agentSystemPrompt,
          )
          if (fallback.ok) {
            const confidence = computeConfidenceScore({
              primaryProvider: decision.secondaryProvider,
              fallbackUsed: true,
              validationPassed: null,
              warnings,
            })
            // Cache successful fallback response
            if (!isNonTextTask && appSlug && fallback.output) {
              storeInCache(message, fallback.output, {
                provider: fallback.providerKey ?? decision.secondaryProvider.providerKey,
                model: fallback.model ?? decision.secondaryProvider.model,
                taskType,
                appSlug,
              }).catch(() => {})
            }
            return {
              output: fallback.output,
              executionMode: decision.executionMode,
              routedProvider: fallback.providerKey,
              routedModel: fallback.model,
              confidenceScore: confidence,
              validationUsed: false,
              consensusUsed: false,
              fallbackUsed: true,
              memoryUsed: false,
              warnings,
              errors,
              latencyMs: Date.now() - start,
              classification,
            }
          }
          errors.push(fallback.error ?? 'Fallback provider also failed')
          } // end fallbackCapabilityOk else
        }
        if (!allowFallback) warnings.push(FALLBACK_DISABLED_WARNING)
      }

      // Cache successful primary response
      if (result.ok && !isNonTextTask && appSlug && result.output) {
        storeInCache(message, result.output, {
          provider: result.providerKey ?? decision.primaryProvider.providerKey,
          model: result.model ?? decision.primaryProvider.model,
          taskType,
          appSlug,
        }).catch(() => {})
      }

      const confidence = result.ok
        ? computeConfidenceScore({ primaryProvider: decision.primaryProvider, fallbackUsed: decision.fallbackUsed, validationPassed: null, warnings })
        : null
      return {
        output: result.output,
        executionMode: decision.executionMode,
        routedProvider: result.providerKey,
        routedModel: result.model,
        confidenceScore: confidence,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: decision.fallbackUsed,
        memoryUsed: false,
        warnings,
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    case 'review': {
      // Step 1: Primary produces draft
      const primary = await callProvider(
        decision.primaryProvider.providerKey,
        decision.primaryProvider.model,
        specialistMessage,
        agentSystemPrompt,
      )
      if (!primary.ok) {
        errors.push(primary.error ?? 'Primary provider failed in review mode')
        return {
          output: null,
          executionMode: 'review',
          routedProvider: primary.providerKey,
          routedModel: primary.model,
          confidenceScore: null,
          validationUsed: false,
          consensusUsed: false,
          fallbackUsed: decision.fallbackUsed,
          memoryUsed: false,
          warnings,
          errors,
          latencyMs: Date.now() - start,
          classification,
        }
      }

      // Step 2: Validator reviews
      let validationPassed: boolean | null = null
      if (decision.secondaryProvider) {
        const validatorPrompt =
          `${systemProfile}\n\n---\n\nYou are a validator. Review the following AI-generated response for quality, accuracy, and consistency with the user request.\n\nOriginal Request:\n${message}\n\nGenerated Response:\n${primary.output ?? ''}\n\nProvide a brief validation verdict: start your reply with "VALID:" if the response is acceptable, or "INVALID:" if it has significant issues. Then explain briefly.`
        const validation = await callProvider(
          decision.secondaryProvider.providerKey,
          decision.secondaryProvider.model,
          validatorPrompt,
        )
        if (validation.ok && validation.output) {
          const verdict = validation.output.trim().toUpperCase()
          validationPassed = verdict.startsWith('VALID:')
          if (!validationPassed) {
            warnings.push('Validator flagged response quality — review recommended')
          }
        } else {
          warnings.push('Validation step failed — returning primary response without validation')
          validationPassed = null
        }
      }

      const confidence = computeConfidenceScore({
        primaryProvider: decision.primaryProvider,
        fallbackUsed: decision.fallbackUsed,
        validationPassed,
        warnings,
      })
      return {
        output: primary.output,
        executionMode: 'review',
        routedProvider: primary.providerKey,
        routedModel: primary.model,
        confidenceScore: confidence,
        validationUsed: decision.secondaryProvider !== null,
        consensusUsed: false,
        fallbackUsed: decision.fallbackUsed,
        memoryUsed: false,
        warnings,
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    case 'consensus': {
      // Both providers generate independently
      const [result1, result2] = await Promise.all([
        callProvider(
          decision.primaryProvider.providerKey,
          decision.primaryProvider.model,
          specialistMessage,
          agentSystemPrompt,
        ),
        decision.secondaryProvider
          ? callProvider(
              decision.secondaryProvider.providerKey,
              decision.secondaryProvider.model,
              specialistMessage,
              agentSystemPrompt,
            )
          : Promise.resolve(null as ProviderCallResult | null),
      ])

      if (!result1.ok) {
        errors.push(result1.error ?? 'Primary provider failed in consensus mode')
        if (!result2 || !result2.ok) {
          if (result2 && result2.error) errors.push(result2.error)
          return {
            output: null,
            executionMode: 'consensus',
            routedProvider: null,
            routedModel: null,
            confidenceScore: null,
            validationUsed: false,
            consensusUsed: false,
            fallbackUsed: decision.fallbackUsed,
            memoryUsed: false,
            warnings,
            errors,
            latencyMs: Date.now() - start,
            classification,
          }
        }
        // Only secondary succeeded — return it as fallback
        warnings.push('Primary provider failed in consensus — returning secondary result only')
        const confidence = computeConfidenceScore({
          primaryProvider: decision.secondaryProvider!,
          fallbackUsed: true,
          validationPassed: null,
          warnings,
        })
        return {
          output: result2.output,
          executionMode: 'consensus',
          routedProvider: result2.providerKey,
          routedModel: result2.model,
          confidenceScore: confidence,
          validationUsed: false,
          consensusUsed: false,
          fallbackUsed: true,
          memoryUsed: false,
          warnings,
          errors,
          latencyMs: Date.now() - start,
          classification,
        }
      }

      // Both succeeded — synthesizer selects the better response
      let finalOutput = result1.output
      let consensusUsed = false

      if (result2?.ok && result2.output) {
        consensusUsed = true
        // Simple synthesizer: prefer the longer, more detailed response unless both are similar
        const len1 = (result1.output ?? '').length
        const len2 = result2.output.length
        // Pick the longer response as the primary signal; add a note if they differ significantly
        finalOutput = len2 > len1 * CONSENSUS_LENGTH_RATIO_THRESHOLD ? result2.output : result1.output
        if (Math.abs(len1 - len2) > CONSENSUS_LENGTH_DIFF_THRESHOLD) {
          warnings.push('Consensus responses differed in length — selected most detailed response')
        }
      }

      const confidence = computeConfidenceScore({
        primaryProvider: decision.primaryProvider,
        fallbackUsed: decision.fallbackUsed,
        validationPassed: consensusUsed ? true : null,
        warnings,
      })
      return {
        output: finalOutput,
        executionMode: 'consensus',
        routedProvider: result1.providerKey,
        routedModel: result1.model,
        confidenceScore: confidence,
        validationUsed: consensusUsed,
        consensusUsed,
        fallbackUsed: decision.fallbackUsed,
        memoryUsed: false,
        warnings,
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    default:
      return {
        output: null,
        executionMode: classification.executionMode as ExecutionMode,
        routedProvider: null,
        routedModel: null,
        confidenceScore: null,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: false,
        memoryUsed: false,
        warnings,
        errors: ['Unknown execution mode'],
        latencyMs: Date.now() - start,
        classification,
      }
  }
}

// ── Agent Chain Execution ─────────────────────────────────────────────────────

async function executeAgentChain(opts: {
  appSlug: string
  message: string
  start: number
  classification: ClassificationResult
  decision: DecisionResult
  warnings: string[]
}): Promise<OrchestrationResult> {
  const { appSlug, message, start, classification, decision, warnings } = opts
  const errors: string[] = []

  try {
    // Step 1: Planner agent decomposes the task
    if (!isAgentPermitted('planner', appSlug)) {
      warnings.push('App does not have planner agent permission — falling back to specialist mode')
      // Fallback to specialist execution
      const result = await callProvider(
        decision.primaryProvider!.providerKey,
        decision.primaryProvider!.model,
        message,
      )
      return {
        output: result.output,
        executionMode: 'agent_chain',
        routedProvider: result.providerKey,
        routedModel: result.model,
        confidenceScore: result.ok ? 0.60 : null,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: false,
        memoryUsed: false,
        warnings,
        errors: result.ok ? [] : [result.error ?? 'Provider call failed'],
        latencyMs: Date.now() - start,
        classification,
      }
    }

    // Execute the planner agent
    const plannerTask = createAgentTask('planner', appSlug, {
      message: `Plan the following task: ${message}`,
      context: { taskType: classification.taskType, complexity: classification.taskComplexity },
    })
    const plannerResult = await executeAgent(plannerTask)

    if (plannerResult.status === 'failed') {
      errors.push(`Planner agent failed: ${plannerResult.error}`)
      // Fallback: use direct provider call instead
      warnings.push('Agent chain planner failed — falling back to direct provider call')
      const result = await callProvider(
        decision.primaryProvider!.providerKey,
        decision.primaryProvider!.model,
        message,
      )
      return {
        output: result.output,
        executionMode: 'agent_chain',
        routedProvider: result.providerKey,
        routedModel: result.model,
        confidenceScore: result.ok ? 0.50 : null,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: true,
        memoryUsed: false,
        warnings,
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    // Step 2: Execute the task with planner output as context
    const plannerOutput = plannerResult.output ?? message
    const result = await callProvider(
      decision.primaryProvider!.providerKey,
      decision.primaryProvider!.model,
      `[Agent Plan]\n${plannerOutput}\n\n[Execute the plan for this request]\n${message}`,
    )

    // Step 3: Validate if permitted
    let validationPassed: boolean | null = null
    if (isAgentPermitted('validator', appSlug) && result.ok) {
      try {
        // Hand off from planner to router (tracks lineage)
        const routerTask = handoffTask(plannerTask, 'router')
        await executeAgent(routerTask)

        // Create and execute a validator task
        const valTask = createAgentTask('validator', appSlug, {
          message: `Validate the following response for quality and accuracy:\n\nOriginal request: ${message}\n\nResponse: ${result.output}`,
          context: { parentOutput: plannerOutput },
        })
        const valResult = await executeAgent(valTask)
        if (valResult.status === 'completed' && valResult.output) {
          validationPassed = valResult.output.toUpperCase().includes('VALID')
          if (!validationPassed) {
            warnings.push('Agent validator flagged response quality — review recommended')
          }
        }
      } catch {
        warnings.push('Agent validation step failed — returning unvalidated response')
      }
    }

    const confidence = result.ok
      ? computeConfidenceScore({
          primaryProvider: decision.primaryProvider!,
          fallbackUsed: false,
          validationPassed,
          warnings,
        })
      : null

    return {
      output: result.output,
      executionMode: 'agent_chain',
      routedProvider: result.providerKey,
      routedModel: result.model,
      confidenceScore: confidence,
      validationUsed: validationPassed !== null,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: false,
      warnings,
      errors: result.ok ? errors : [...errors, result.error ?? 'Provider call failed'],
      latencyMs: Date.now() - start,
      classification,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Agent chain error: ${msg}`)
    return {
      output: null,
      executionMode: 'agent_chain',
      routedProvider: null,
      routedModel: null,
      confidenceScore: null,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: false,
      warnings,
      errors,
      latencyMs: Date.now() - start,
      classification,
    }
  }
}

// ── Retrieval Chain Execution ─────────────────────────────────────────────────

async function executeRetrievalChain(opts: {
  appSlug: string
  message: string
  specialistMessage: string
  start: number
  classification: ClassificationResult
  decision: DecisionResult
  warnings: string[]
}): Promise<OrchestrationResult> {
  const { appSlug, message, specialistMessage, start, classification, decision, warnings } = opts
  const errors: string[] = []

  try {
    // Step 1: Retrieve relevant context using the retrieval engine
    const retrievalResult: RetrievalResult = await retrieve({
      appSlug,
      query: message,
      maxResults: 5,
      includeGlobal: true,
    })

    const memoryUsed = retrievalResult.entries.length > 0

    // Step 2: Build augmented message with retrieved context
    let augmentedMessage = specialistMessage
    if (retrievalResult.entries.length > 0) {
      const contextBlock = retrievalResult.entries
        .map(e => `[${e.source}/${e.memoryType}] (score: ${e.finalScore.toFixed(2)}) ${e.content}`)
        .join('\n')
      augmentedMessage = `[Retrieved Context — ${retrievalResult.entries.length} entries, ${retrievalResult.retrievalLatencyMs}ms]\n${contextBlock}\n\n---\n\n${specialistMessage}`
    } else {
      warnings.push('Retrieval chain: no relevant memories found — proceeding without augmentation')
    }

    // Step 3: Call the primary model with augmented context
    const result = await callProvider(
      decision.primaryProvider!.providerKey,
      decision.primaryProvider!.model,
      augmentedMessage,
    )

    if (!result.ok) {
      errors.push(result.error ?? 'Retrieval chain provider call failed')
    }

    const confidence = result.ok
      ? computeConfidenceScore({
          primaryProvider: decision.primaryProvider!,
          fallbackUsed: false,
          validationPassed: null,
          warnings,
        })
      : null

    return {
      output: result.output,
      executionMode: 'retrieval_chain',
      routedProvider: result.providerKey,
      routedModel: result.model,
      confidenceScore: confidence,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed,
      warnings,
      errors,
      latencyMs: Date.now() - start,
      classification,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Retrieval chain error: ${msg}`)
    // Fallback to non-retrieval call
    warnings.push('Retrieval chain failed — falling back to direct call')
    const result = await callProvider(
      decision.primaryProvider!.providerKey,
      decision.primaryProvider!.model,
      specialistMessage,
    )
    return {
      output: result.output,
      executionMode: 'retrieval_chain',
      routedProvider: result.providerKey,
      routedModel: result.model,
      confidenceScore: result.ok ? 0.55 : null,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: true,
      memoryUsed: false,
      warnings,
      errors,
      latencyMs: Date.now() - start,
      classification,
    }
  }
}

// ── Multimodal Chain Execution ────────────────────────────────────────────────

async function executeMultimodalChain(opts: {
  appSlug: string
  appCategory: string
  taskType: string
  message: string
  start: number
  classification: ClassificationResult
  decision: DecisionResult
  warnings: string[]
}): Promise<OrchestrationResult> {
  const { appSlug, taskType, message, start, classification, decision, warnings } = opts
  const errors: string[] = []

  try {
    // Map task type to content type
    const contentType = detectContentType(taskType)

    const multimodalResult: MultimodalResult = await generateContent({
      appSlug,
      contentType,
      prompt: message,
      outputFormat: 'markdown',
    })

    if (!multimodalResult.success) {
      errors.push(...multimodalResult.errors)
      // Fallback to regular provider call
      warnings.push('Multimodal chain failed — falling back to specialist call')
      const result = await callProvider(
        decision.primaryProvider!.providerKey,
        decision.primaryProvider!.model,
        message,
      )
      return {
        output: result.output,
        executionMode: 'multimodal_chain',
        routedProvider: result.providerKey,
        routedModel: result.model,
        confidenceScore: result.ok ? 0.55 : null,
        validationUsed: false,
        consensusUsed: false,
        fallbackUsed: true,
        memoryUsed: multimodalResult.metadata.usedBrandMemory || multimodalResult.metadata.usedCampaignMemory,
        warnings: [...warnings, ...multimodalResult.warnings],
        errors,
        latencyMs: Date.now() - start,
        classification,
      }
    }

    warnings.push(...multimodalResult.warnings)

    return {
      output: multimodalResult.output,
      executionMode: 'multimodal_chain',
      routedProvider: multimodalResult.metadata.providerUsed,
      routedModel: multimodalResult.metadata.modelUsed,
      confidenceScore: 0.80,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: multimodalResult.metadata.usedBrandMemory || multimodalResult.metadata.usedCampaignMemory,
      warnings,
      errors,
      latencyMs: Date.now() - start,
      classification,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Multimodal chain error: ${msg}`)
    return {
      output: null,
      executionMode: 'multimodal_chain',
      routedProvider: null,
      routedModel: null,
      confidenceScore: null,
      validationUsed: false,
      consensusUsed: false,
      fallbackUsed: false,
      memoryUsed: false,
      warnings,
      errors,
      latencyMs: Date.now() - start,
      classification,
    }
  }
}

/**
 * Map a task type string to the most appropriate multimodal content type.
 */
function detectContentType(taskType: string): import('@/lib/multimodal-router').ContentType {
  const t = taskType.toLowerCase()
  if (t.includes('campaign')) return 'campaign_plan'
  if (t.includes('ad') || t.includes('advert')) return 'ad_concept'
  if (t.includes('image') || t.includes('visual')) return 'image_prompt'
  if (t.includes('video')) return 'video_concept'
  if (t.includes('reel') || t.includes('short')) return 'reel_concept'
  if (t.includes('calendar') || t.includes('schedule')) return 'content_calendar'
  if (t.includes('social') || t.includes('post')) return 'social_post'
  if (t.includes('caption')) return 'caption'
  if (t.includes('brand') || t.includes('voice')) return 'brand_voice'
  return 'text'
}

const PRODUCT_CAPABILITY_SET = new Set<string>(CAPABILITY_ROUTER_CAPABILITIES)
const GOVERNED_ADULT_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
])
const GOVERNED_SUGGESTIVE_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'suggestive_image',
  'suggestive_video',
])

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
      'BLOCKED',
      'Speech-to-text requires an audio input reference.',
      'model_not_supported',
    )
  }
  if (capability === 'adult_video') {
    return capabilityFailure(
      capability,
      'UNAVAILABLE',
      'No approved provider contract currently permits adult-video execution.',
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

  const routePlan = await selectCapabilityRoutePlan({
    capability: definition,
    qualityTier: request.qualityTier ?? String(request.metadata?.qualityTier ?? 'auto'),
    requestedProvider: requestedProvider as ApprovedDirectProviderId | undefined,
    requestedModel,
    allowedProviderIds: capability === 'adult_image'
      ? ['together', 'huggingface']
      : capability === 'adult_text'
        ? ['together', 'huggingface']
        : undefined,
  })
  const candidates = [
    ...(routePlan.selected ? [routePlan.selected] : []),
    ...routePlan.fallback,
  ]
  if (candidates.length === 0) {
    return capabilityFailure(
      capability,
      routePlan.setupRequired ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
      routePlan.reason,
      routePlan.setupRequired ? 'missing_key' : 'model_not_supported',
      requestedProvider ?? null,
      requestedModel ?? null,
      [],
    )
  }

  const attempts: ProviderAttempt[] = []
  for (const [index, candidate] of candidates.entries()) {
    const adapter = getProviderCapabilityAdapter(candidate.route.provider)
    if (!adapter || adapter.id !== candidate.route.adapter) {
      attempts.push({
        provider: candidate.route.provider,
        model: candidate.model,
        status: 'failed',
        errorCategory: 'unsupported_endpoint',
        retryable: true,
        error: `Adapter ${candidate.route.adapter} is not registered.`,
      })
      continue
    }

    const validation = await validateProviderModelAsync(
      candidate.route.provider,
      candidate.model,
      taxonomyId,
    )
    if (!validation.valid) {
      attempts.push({
        provider: candidate.route.provider,
        model: candidate.model,
        status: 'failed',
        errorCategory: 'model_not_supported',
        retryable: true,
        error: validation.reason ?? 'Provider model is not valid for this capability.',
      })
      await recordProviderFailure({
        providerId: candidate.route.provider,
        model: candidate.model,
        capability: taxonomyId,
        latencyMs: 0,
        errorCategory: 'model_not_supported',
      })
      continue
    }

    const startedAt = Date.now()
    let adapterResult
    try {
      adapterResult = await adapter.execute({
        capability: definition,
        route: candidate.route,
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
        model: candidate.model,
      })
    } catch (error) {
      const classified = classifyProviderError({
        error,
        provider: candidate.route.provider,
      })
      adapterResult = {
        status: 'failed' as const,
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

    const latencyMs = adapterResult.latencyMs || Date.now() - startedAt
    attempts.push({
      provider: adapterResult.provider,
      model: adapterResult.model,
      status: adapterResult.status,
      latencyMs,
      errorCategory: adapterResult.errorCategory ?? undefined,
      retryable: adapterResult.retryable,
      error: adapterResult.error ?? undefined,
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
      const mediaType = capabilityArtifactType(capability)
      const localJob = ['image', 'audio', 'music', 'video'].includes(mediaType)
        ? createLocalMediaJob({
            capability,
            appSlug: request.appId ?? request.workspaceId ?? '__system__',
            type: mediaType as 'image' | 'audio' | 'music' | 'video',
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
            },
          })
        : null
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
      }
    }

    await recordProviderFailure({
      providerId: adapterResult.provider,
      model: adapterResult.model,
      capability: taxonomyId,
      latencyMs,
      errorCategory: adapterResult.errorCategory ?? 'unknown',
    })
    if (adapterResult.status === 'blocked' || adapterResult.retryable === false) {
      break
    }
  }

  const lastAttempt = attempts.at(-1)
  const onlyConfigurationFailures = attempts.length > 0 && attempts.every(
    (attempt) => ['missing_key', 'invalid_key', 'provider_misconfigured'].includes(
      attempt.errorCategory ?? '',
    ),
  )
  return capabilityFailure(
    capability,
    onlyConfigurationFailures ? 'NEEDS_CONFIGURATION' : 'UNAVAILABLE',
    attempts.length
      ? 'All eligible provider/model attempts failed.'
      : routePlan.reason,
    (lastAttempt?.errorCategory as CapabilityResponse['error_category']) ?? 'unknown',
    lastAttempt?.provider ?? requestedProvider ?? null,
    lastAttempt?.model ?? requestedModel ?? null,
    attempts,
  )
}

function resolveProductCapability(
  request: CapabilityRequest,
): CapabilityRouterCapability | null {
  const explicit = request.capability
  if (explicit) {
    return PRODUCT_CAPABILITY_SET.has(explicit)
      ? explicit as CapabilityRouterCapability
      : null
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
  const kind: CapabilityReference['kind'] =
    capability === 'stt' ? 'audio'
      : capability === 'file_analysis' ? 'document'
        : capability.includes('video') && !capability.startsWith('image_to_') ? 'video'
          : 'image'
  return (request.files ?? []).map((url) => ({ kind, url }))
}

function capabilityOutputType(capability: CapabilityRouterCapability): string {
  if (['code', 'repo_edit', 'app_build'].includes(capability)) return 'code'
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
  if (['tts', 'voice_response', 'adult_voice'].includes(capability)) return 'voice'
  const outputType = capabilityOutputType(capability)
  return ['code', 'audio', 'image', 'video'].includes(outputType)
    ? outputType as ArtifactType
    : 'text'
}

async function completeCapabilityResult(input: {
  request: CapabilityRequest
  capability: CapabilityRouterCapability
  taxonomyId: string
  definitionCreatesArtifact: boolean
  adapterResult: Awaited<ReturnType<NonNullable<ReturnType<typeof getProviderCapabilityAdapter>>['execute']>>
  attempts: ProviderAttempt[]
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
  if (!input.request.saveArtifact && !input.definitionCreatesArtifact) return response

  try {
    const artifact = await createArtifact({
      appSlug: input.request.appId ?? input.request.workspaceId ?? '__system__',
      appId: input.request.appId,
      workspaceId: input.request.workspaceId,
      executionId: typeof input.request.metadata?.executionId === 'string'
        ? input.request.metadata.executionId
        : undefined,
      type: capabilityArtifactType(input.capability),
      subType: input.capability,
      capability: input.taxonomyId,
      provider: input.adapterResult.provider,
      model: input.adapterResult.model,
      traceId: input.request.traceId,
      mimeType: input.adapterResult.contentType ?? undefined,
      content: input.adapterResult.bytes
        ?? (output && !output.startsWith('http') ? Buffer.from(output, 'utf8') : undefined),
      contentUrl: input.adapterResult.mediaUrl ?? undefined,
      allowRemoteReference: Boolean(input.adapterResult.mediaUrl),
      metadata: {
        ...(input.request.metadata ?? {}),
        providerAttempts: input.attempts,
      },
    })
    return {
      ...response,
      artifactId: artifact.id,
      artifactUrl: artifact.downloadUrl,
      output: input.adapterResult.mediaUrl ?? artifact.storageUrl ?? output,
    }
  } catch (error) {
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
    providerAttempts: attempts,
    nextActions: readiness === 'NEEDS_CONFIGURATION'
      ? ['Configure and live-test at least one approved provider for this capability.']
      : readiness === 'UNAVAILABLE'
        ? ['Review provider attempts in admin diagnostics and retry after correcting the provider contract.']
        : [],
  }
}
