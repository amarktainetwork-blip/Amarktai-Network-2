/**
 * @module capability-router
 * @description Central capability router for the AmarktAI Network.
 *
 * Routes AI capability requests to the best available provider using the
 * Capability Registry as the single source of truth for capabilities,
 * provider mappings, and model selection.
 *
 * Apps request capabilities. The runtime decides provider, model, endpoint.
 *
 * ACTIVE PROVIDERS ONLY: genx, huggingface, together, groq, mimo
 *
 * Server-side only. Never import from client components.
 */

import {
  callGenXChat,
  callGenXMedia,
  GENX_AUDIO_MODELS,
  GENX_VIDEO_MODELS,
  GENX_I2V_MODELS,
} from '@/lib/genx-client'
import {
  validateMusicPayload,
  buildMusicProviderPrompt,
  executeHFMusicGeneration,
  type MusicCapabilityPayload,
} from '@/lib/music-capability'
import {
  validateAvatarPayload,
  buildAvatarPrompt,
  executeHFAvatarImage,
  executeTogetherAvatarImage,
  executeAvatarVoice as executeAvatarVoiceNonAdult,
  resolveAvatarProviderOrder,
  buildAvatarStorageMetadata,
  type AvatarPayload,
  type AvatarStyle as AvatarStyleType,
  type AvatarMode as AvatarModeType,
  type AvatarVoiceConfig,
} from '@/lib/avatar-capability'
import {
  validateVideoPayload,
  buildVideoProviderPrompt,
  executeHFVideoGeneration,
  executeTogetherVideoGeneration,
  resolveVideoProviderOrder,
  type VideoCapabilityPayload,
  type VideoMode,
  type VideoStyle,
  type BudgetMode,
} from '@/lib/video-capability'
import {
  checkAdultPermission,
  checkAdultLegalSafety,
  buildAdultTextBody,
  buildAdultImageBody,
  buildAdultVideoBody,
  buildAdultAvatarBody,
  validateAdultAvatarPayload,
  executeHFAdultGenerationChain,
  executeAvatarVoice,
  checkVoiceCloneRules,
  type AdultTextPayload,
  type AdultImagePayload,
  type AdultVideoPayload,
  type AdultAvatarPayload,
  type AvatarVoicePayload,
  type AvatarStyle,
  type AvatarMode,
  type AdultCapabilityType,
} from '@/lib/adult-capability'
import { callProvider, getVaultApiKey } from '@/lib/brain'
import { crawlWebsite } from '@/lib/scraper'
import { createArtifact } from '@/lib/artifact-store'
import { getAdultTextModel, getDefaultAdultTextModel } from '@/lib/adult-model-catalog'
import { prisma } from '@/lib/prisma'
import {
  getDefaultModelForProvider,
  getModelRegistry,
  setProviderHealth,
  type ProviderHealthStatus,
} from '@/lib/model-registry'
import { isProviderWithinBudget } from '@/lib/budget-tracker'
import { getAppProfileFromDb, runtimeProfileOverrides } from '@/lib/app-profiles'
import { recordPerformance, loadSmartRouterState } from '@/lib/smart-router'
import {
  getCapability,
  getAllCapabilities,
  getAllowedProviders,
  getBestProvider,
  getBudgetProfile,
  isWithinBudget,
} from '@/lib/runtime-registry'
import { resolveBestModel, type ResolvedModel } from '@/lib/model-resolver'
import {
  type CapabilityKey,
  type ProviderKey,
  getCapabilityDefinition,
  getProvidersForCapability,
  getBestProvider as getBestProviderFromRegistry,
  requiresAdultMode,
  requiresSafeModeOff,
} from '@/lib/capability-registry'

// ── Orchestration Types (merged from orchestrator.ts) ─────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CapabilityRequest {
  /** The prompt / message / URL */
  input: string
  /** Explicit capability override (auto-detected from input when absent) */
  capability?: string
  /** File references (paths or URLs) */
  files?: string[]
  /** App slug for artifact ownership */
  appId?: string
  /** Workspace slug for artifact ownership */
  workspaceId?: string
  /** Force a specific provider (skips the automatic chain) */
  providerOverride?: string
  /** Force a specific model ID */
  modelOverride?: string
  /** Enable adult content routing (also requires safeMode=false) */
  adultMode?: boolean
  /** When true, blocks adult content even if adultMode=true */
  safeMode?: boolean
  /** Persist output as an Artifact DB record */
  saveArtifact?: boolean
  /** Caller-supplied trace ID */
  traceId?: string
  /** Arbitrary metadata forwarded to downstream providers */
  metadata?: Record<string, unknown>
}

export interface CapabilityResponse {
  success: boolean
  capability: string
  provider: string | null
  model: string | null
  /** 'text' | 'image' | 'video' | 'audio' | 'code' | 'video_plan' | 'music_blueprint' | 'markdown' */
  outputType: string
  /** Text, URL, or base64 data URI */
  output: string | null
  /** Async provider job ID when media is still processing */
  jobId?: string
  /** Live provider job status */
  status?: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'
  /** Artifact ID if saveArtifact=true and artifact was persisted */
  artifactId?: string
  fallbackUsed: boolean
  fallbackReason?: string
  /** Non-fatal degradation warning (e.g. blueprint returned instead of real audio) */
  warning?: string
  /** Error message when success=false */
  error?: string
  /** Structured error category for adult/specialist routes */
  error_category?: 'missing_key' | 'provider_policy_block' | 'model_not_supported' | 'endpoint_error' | 'guardrail_block' | 'unknown'
  providerAttempts?: Array<{ provider: string; model: string; status: string; error?: string }>
  /** Heuristic confidence score [0.10, 0.99]. null when not computed. */
  confidenceScore?: number | null
  /** Execution mode used for this request. */
  executionMode?: string
  /** Whether a validation step was performed (review mode). */
  validationUsed?: boolean
  /** Whether consensus synthesis was used. */
  consensusUsed?: boolean
  /** Whether memory/retrieval context was injected. */
  memoryUsed?: boolean
  /** Task classification result (for observability). */
  classification?: ClassificationResult
  /** Human-readable explanation of why this provider/model was chosen. */
  routingReason?: string
  /** Capability-specific structured metadata (e.g. music duration, genres, lyricsMode). */
  metadata?: Record<string, unknown>
}

// ── Supported capability set ───────────────────────────────────────────────────

const ALL_CAPABILITIES = [
  'chat', 'code', 'file_analysis',
  'image_generation', 'image_edit',
  'video_generation', 'image_to_video',
  'music_generation', 'lyrics_generation',
  'tts', 'stt', 'voice_response',
  'adult_text', 'adult_image', 'adult_video', 'adult_avatar',
  'avatar_generation',
  'suggestive_image', 'suggestive_video',
  'repo_edit', 'app_build', 'deploy_plan',
  'research', 'scrape_website',
] as const

type Capability = (typeof ALL_CAPABILITIES)[number]

// ── Orchestration Constants & Pure Functions (merged from orchestrator.ts) ────

const _IMAGE_MESSAGE_PATTERNS = [
  /\b(?:create|generate|make|draw|paint|design|produce|render)\b.*\b(?:image|picture|photo|illustration|artwork|visual|graphic)\b/i,
  /\b(?:image|picture|photo|illustration|artwork|visual|graphic)\b.*\b(?:of|showing|depicting|with|featuring)\b/i,
  /\bdall-?e\b/i,
  /\bimage.?generat/i,
  /\bgenerate.?(?:an?\s+)?image\b/i,
]

/**
 * Specialist profile mapping — app category → system-level instruction.
 */
const _SPECIALIST_PROFILES: Record<string, string> = {
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

/**
 * Classify a task by complexity and execution mode.
 *
 * Complexity:
 *   simple   → short message (<= 120 chars) AND generic taskType (chat|help|ping)
 *   complex  → taskType contains analysis|review|audit|forecast|decision|report
 *              OR category is crypto/finance/forex AND taskType is not 'chat'
 *   moderate → everything else
 *
 * Execution mode:
 *   direct     → simple tasks
 *   specialist → moderate tasks
 *   review     → complex tasks OR financial categories
 *   consensus  → explicit consensus taskType OR complex + financial
 */
function classifyTaskComplexity(
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

  let taskComplexity: TaskComplexity
  if (msgLen <= 120 && isGenericTask) {
    taskComplexity = 'simple'
  } else if (isComplexTask || (isFinancial && !isGenericTask)) {
    taskComplexity = 'complex'
  } else {
    taskComplexity = 'moderate'
  }

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

  return {
    taskComplexity,
    executionMode,
    requiresValidation: executionMode === 'review' || executionMode === 'consensus',
    requiresConsensus: executionMode === 'consensus',
    memoryRetrievalNeeded: false,
    lowLatencyRequired: executionMode === 'direct',
    appCategory: cat,
    taskType: task,
  }
}

/**
 * Compute a heuristic confidence score [0.10, 0.99].
 *
 * Base: 0.70 for any routed provider.
 * +0.15 if provider health is "healthy"
 * +0.05 if provider health is "configured"
 * -0.10 if fallback provider was used
 * -0.10 if validation step failed
 * -0.05 per warning beyond the first
 */
function computeConfidenceScore(opts: {
  providerHealth?: string
  fallbackUsed: boolean
  validationPassed: boolean | null
  warnings: string[]
}): number {
  let score = 0.70

  if (opts.providerHealth === 'healthy') score += 0.15
  else if (opts.providerHealth === 'configured') score += 0.05

  if (opts.fallbackUsed) score -= 0.10

  if (opts.validationPassed === false) score -= 0.10

  const extraWarnings = Math.max(0, opts.warnings.length - 1)
  score -= extraWarnings * 0.05

  return Math.min(0.99, Math.max(0.10, Math.round(score * 100) / 100))
}

// ── Provider Health Sync (merged from orchestrator.ts) ────────────────────────

interface AvailableProvider {
  providerKey: string
  model: string
  healthStatus: string
  isHealthy: boolean
}

function defaultModelFor(providerKey: string): string {
  return getDefaultModelForProvider(providerKey)
}

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

function syncProviderHealthCache(available: AvailableProvider[]): void {
  const configuredKeys = new Set(available.map(p => p.providerKey))

  for (const p of available) {
    const status: ProviderHealthStatus =
      p.healthStatus === 'unconfigured' ? 'configured' : (p.healthStatus as ProviderHealthStatus)
    setProviderHealth(p.providerKey, status)
  }

  const allProviderKeys = new Set(getModelRegistry().map(m => m.provider))
  for (const key of Array.from(allProviderKeys)) {
    if (!configuredKeys.has(key)) {
      setProviderHealth(key, 'unconfigured')
    }
  }
}

// ── Smart Router Bootstrap ────────────────────────────────────────────────────

loadSmartRouterState().catch(() => {})

// ── Adult content guardrails ──────────────────────────────────────────────────

/**
 * Terms that are unconditionally blocked in adult mode.
 * Uses simple string inclusion — no RegEx to prevent ReDoS on user input.
 */
const ADULT_BLOCKED_TERMS: readonly string[] = [
  'minor', 'child', 'underage', 'teen', 'adolescent', 'juvenile',
  'young person', 'kid', 'school age', 'preteen', 'infant', 'baby',
  'girl under 18', 'boy under 18', 'girl under 16', 'boy under 16',
  'non-consensual', 'rape', 'forced sex', 'forced intercourse',
  'degrading', 'dehumanizing', 'dehumanising',
]

const ADULT_TEXT_SYSTEM_PROMPT =
  'You are an adult-oriented creative writing and conversation assistant for consenting adults only. ' +
  'You may handle mature themes when the user and all fictional characters are adults. ' +
  'Strictly refuse minors, coercion, exploitation, non-consensual content, threats, hate, illegal activity, instructions for harm, or degrading abuse. ' +
  'Keep the tone respectful, consent-aware, and non-degrading.'

const DEFAULT_TOGETHER_ADULT_TEXT_MODEL = 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
const DEFAULT_XAI_ADULT_TEXT_MODEL = 'grok-2-latest'

const ADULT_TEXT_DEGRADING_PATTERNS: RegExp[] = [
  /\b(degrade|humiliate|worthless|subhuman)\s+(her|him|them|woman|man|person|partner)\b/i,
  /\b(degrading|humiliating|dehumanizing|dehumanising)\b/i,
  /\bworthless\b/i,
  /\bmake\s+(her|him|them)\s+(beg|cry|suffer)\b/i,
  /\bslave\b/i,
  /\bowned\s+(woman|man|person|partner)\b/i,
]

/** Style prefix injected into suggestive image prompts to enforce non-explicit output */
const SUGGESTIVE_STYLE_PREFIX = 'Tasteful professional photograph, artistic lighting, no explicit sexual content, no genitalia:'

/**
 * Check adult content guardrails.
 * Returns a human-readable block reason, or null if the request is allowed.
 */
function checkAdultGuardrails(
  input: string,
  adultMode: boolean,
  safeMode: boolean,
): string | null {
  if (!adultMode) return 'adultMode is not enabled'
  if (safeMode) return 'safeMode is active — adult content blocked'
  const lower = input.toLowerCase()
  for (const term of ADULT_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return `Blocked: content contains prohibited term "${term}"`
    }
  }
  // Real person + sexual content
  if (
    lower.includes('real person') &&
    (lower.includes('sex') || lower.includes('naked') || lower.includes('nude'))
  ) {
    return 'Blocked: real person + sexual content is not permitted'
  }
  // Violence + sexual content
  if (
    lower.includes('violen') &&
    (lower.includes('sex') || lower.includes('naked') || lower.includes('nude'))
  ) {
    return 'Blocked: violence + sexual content is not permitted'
  }
  return null
}

// ── Capability detection ──────────────────────────────────────────────────────

/**
 * Detect the most appropriate capability from the request.
 * Explicit capability strings take priority; otherwise keyword-based detection
 * is used.  Uses simple string.includes() — no RegEx — to prevent ReDoS.
 */
function detectCapability(input: string, explicit?: string): Capability {
  if (explicit && (ALL_CAPABILITIES as readonly string[]).includes(explicit)) {
    return explicit as Capability
  }
  const lower = input.toLowerCase()
  // Simple string inclusion — no RegEx to prevent ReDoS on user-controlled input.
  const includesTerm = (term: string) => lower.includes(term)

  // Image
  if (
    (includesTerm('generate') || includesTerm('create') || includesTerm('draw') || includesTerm('paint') || includesTerm('make')) &&
    (includesTerm('image') || includesTerm('picture') || includesTerm('photo') || includesTerm('artwork') || includesTerm('illustration'))
  ) return 'image_generation'

  // Video
  if (
    (includesTerm('generate') || includesTerm('create') || includesTerm('make') || includesTerm('produce')) &&
    includesTerm('video')
  ) return 'video_generation'

  // Image-to-video
  if (includesTerm('image') && includesTerm('video') && (includesTerm('i2v') || includesTerm(' to '))) return 'image_to_video'

  // Music — must be before lyrics so "generate music with lyrics" routes to music
  if (
    (includesTerm('generate') || includesTerm('create') || includesTerm('make') || includesTerm('compose') || includesTerm('produce')) &&
    (includesTerm('music') || includesTerm('song') || includesTerm('track') || includesTerm('beat'))
  ) return 'music_generation'

  // Lyrics
  if (
    (includesTerm('write') || includesTerm('generate')) && includesTerm('lyrics')
  ) return 'lyrics_generation'
  if ((includesTerm('song') && includesTerm('lyrics')) || includesTerm('songwriting')) return 'lyrics_generation'

  // Adult-oriented text or roleplay must use specialist adult text routing.
  if (
    (includesTerm('adult') || includesTerm('18+') || includesTerm('nsfw') || includesTerm('roleplay')) &&
    !(includesTerm('image') || includesTerm('picture') || includesTerm('photo') || includesTerm('video'))
  ) return 'adult_text'

  // Voice output (TTS)
  if (
    includesTerm('speak') || includesTerm('tts') ||
    (includesTerm('read') && includesTerm('aloud')) ||
    (includesTerm('text') && includesTerm('speech') && !includesTerm('speech to text'))
  ) return 'tts'

  // Voice input (STT)
  if (
    includesTerm('transcribe') || includesTerm('stt') ||
    (includesTerm('speech') && includesTerm('to') && includesTerm('text')) ||
    (includesTerm('audio') && includesTerm('to') && includesTerm('text'))
  ) return 'stt'

  // Website scraping
  if (
    (includesTerm('scrape') || includesTerm('crawl') || includesTerm('extract') || includesTerm('fetch')) &&
    includesTerm('website')
  ) return 'scrape_website'

  // Research
  if (includesTerm('research') || (includesTerm('search') && includesTerm('web')) || includesTerm('look up')) return 'research'

  // Code
  if (
    (includesTerm('write') || includesTerm('generate') || includesTerm('implement') || includesTerm('create')) &&
    (includesTerm('code') || includesTerm('function') || includesTerm('class') || includesTerm('typescript') || includesTerm('javascript') || includesTerm('python'))
  ) return 'code'

  // File analysis
  if (
    (includesTerm('analyze') || includesTerm('analyse') || includesTerm('read') || includesTerm('summarize')) &&
    includesTerm('file')
  ) return 'file_analysis'

  // Deploy plan
  if (includesTerm('deploy') || includesTerm('deployment') || includesTerm('infrastructure')) return 'deploy_plan'

  // App build
  if ((includesTerm('build') || includesTerm('create')) && includesTerm('app')) return 'app_build'

  // Repo edit
  if ((includesTerm('edit') || includesTerm('modify') || includesTerm('fix')) && (includesTerm('repo') || includesTerm('codebase'))) return 'repo_edit'

  return 'chat'
}

// ── Output type mapping ───────────────────────────────────────────────────────

function outputTypeForCapability(cap: string): string {
  switch (cap) {
    case 'image_generation':
    case 'image_edit':
    case 'adult_image':   return 'image'
    case 'adult_avatar':  return 'image'
    case 'suggestive_image': return 'image'
    case 'video_generation':
    case 'image_to_video':
    case 'adult_video':   return 'video'
    case 'suggestive_video': return 'video'
    case 'music_generation': return 'audio'
    case 'tts':
    case 'voice_response': return 'audio'
    case 'stt':           return 'text'
    case 'adult_text':    return 'text'
    case 'code':
    case 'repo_edit':     return 'code'
    case 'deploy_plan':   return 'markdown'
    case 'research':      return 'markdown'
    default:              return 'text'
  }
}

// ── GenX helpers ──────────────────────────────────────────────────────────────

async function tryGenXChat(
  input: string,
  model: string,
  systemPrompt?: string,
): Promise<{ success: boolean; output: string | null; model: string; error: string | null }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: input })
  const result = await callGenXChat({ model, messages })
  return { success: result.success, output: result.output, model: result.model, error: result.error }
}

async function tryGenXMedia(
  prompt: string,
  type: 'image' | 'video' | 'audio',
  model: string,
  extraParams?: Record<string, unknown>,
): Promise<{ success: boolean; url: string | null; jobId: string | null; status: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'; model: string; error: string | null }> {
  const duration = typeof extraParams?.duration === 'number' ? extraParams.duration : undefined
  const params = extraParams ? { ...extraParams } : undefined
  const result = await callGenXMedia({ model, prompt, type, duration, params })
  return { success: result.success, url: result.url, jobId: result.jobId, status: result.status, model: result.model, error: result.error }
}

// ── Fallback text chain (registry-driven) ────────────────────────────────────

const IS_TEST_RUNTIME = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

/**
 * Build a fallback chain from the Runtime Registry.
 * Uses the 'chat' capability's allowed providers to determine fallback order.
 */
async function buildTextFallbackChain(): Promise<Array<{ key: string; model: string }>> {
  try {
    const allowedProviders = await getAllowedProviders('chat')
    if (allowedProviders.length > 0) {
      return allowedProviders.map(key => ({
        key,
        model: getDefaultModelForProvider(key),
      }))
    }
  } catch {
    // Registry unavailable — fall through to static fallback
  }

  // Static fallback when registry is unavailable
  return [
    { key: 'groq', model: 'llama-3.3-70b-versatile' },
    { key: 'together', model: 'meta-llama/Llama-3-70b-chat-hf' },
    { key: 'huggingface', model: 'task:text' },
    { key: 'mimo', model: 'mimo-v2.5' },
  ]
}

async function tryFallbackText(
  input: string,
): Promise<{ success: boolean; output: string | null; provider: string | null; model: string | null; error: string | null }> {
  // In test runtime, skip provider network calls for deterministic behaviour.
  if (IS_TEST_RUNTIME) {
    return { success: false, output: null, provider: null, model: null, error: 'Fallback providers disabled in test runtime' }
  }

  const chain = await buildTextFallbackChain()
  for (const { key, model } of chain) {
    try {
      const result = await callProvider(key, model, input, undefined)
      if (result.output) {
        return { success: true, output: result.output, provider: key, model, error: null }
      }
    } catch (err) {
      console.warn(`[capability-router] Fallback provider ${key} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return { success: false, output: null, provider: null, model: null, error: 'All fallback text providers failed' }
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function validateAdultProviderUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, error: 'Endpoint URL must use http or https.' }
    }
    const host = url.hostname.toLowerCase()
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(host) && process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'Private or loopback endpoint URLs are not allowed in production.' }
    }
    return { ok: true, url: url.href.replace(/\/$/, '') }
  } catch {
    return { ok: false, error: 'Invalid endpoint URL.' }
  }
}

function adultProviderBaseUrl(raw: string): string {
  return raw
    .replace(/\/v1\/chat\/completions\/?$/, '')
    .replace(/\/chat\/completions\/?$/, '')
    .replace(/\/generate\/?$/, '')
    .replace(/\/$/, '')
}

function hasAdultTextDegradingTerms(text: string): boolean {
  return ADULT_TEXT_DEGRADING_PATTERNS.some((pattern) => pattern.test(text))
}

function extractOpenAiCompatibleText(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as { choices?: Array<{ message?: { content?: string }, text?: string }> }
  return record.choices?.[0]?.message?.content ?? record.choices?.[0]?.text ?? null
}

function extractHuggingFaceText(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (Array.isArray(data)) {
    const first = data[0] as { generated_text?: string } | undefined
    return first?.generated_text ?? null
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as { generated_text?: string; output?: string; text?: string }
    return record.generated_text ?? record.output ?? record.text ?? null
  }
  return null
}

async function postAdultOpenAiCompatible(opts: {
  endpoint: string
  apiKey: string | null
  model: string
  input: string
}): Promise<{ output: string | null; error: string | null; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`
  const res = await fetch(`${adultProviderBaseUrl(opts.endpoint)}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: ADULT_TEXT_SYSTEM_PROMPT },
        { role: 'user', content: opts.input },
      ],
      max_tokens: 900,
      temperature: 0.75,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) return { output: null, error: text || `HTTP ${res.status}`, status: res.status }
  try {
    return { output: extractOpenAiCompatibleText(JSON.parse(text)), error: null, status: res.status }
  } catch {
    return { output: text || null, error: null, status: res.status }
  }
}

async function postAdultHuggingFaceRaw(opts: {
  endpoint: string
  apiKey: string | null
  input: string
}): Promise<{ output: string | null; error: string | null; status: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`
  const res = await fetch(opts.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputs: `${ADULT_TEXT_SYSTEM_PROMPT}\n\nUser: ${opts.input}\nAssistant:`,
      parameters: { max_new_tokens: 900, return_full_text: false, temperature: 0.75 },
    }),
    signal: AbortSignal.timeout(60_000),
  })
  const text = await res.text().catch(() => '')
  if (!res.ok) return { output: null, error: text || `HTTP ${res.status}`, status: res.status }
  try {
    return { output: extractHuggingFaceText(JSON.parse(text)), error: null, status: res.status }
  } catch {
    return { output: text || null, error: null, status: res.status }
  }
}

async function tryAdultTextProvider(opts: {
  provider: 'huggingface' | 'together' | 'xai' | 'custom'
  input: string
  model: string
  endpoint?: string
  apiKey: string | null
}): Promise<{ output: string | null; attempt: { provider: string; model: string; status: string; error?: string } }> {
  if (opts.provider === 'huggingface') {
    const modelSpec = getAdultTextModel(opts.model)
    if (!opts.endpoint && modelSpec) {
      return {
        output: null,
        attempt: {
          provider: 'huggingface',
          model: opts.model,
          status: 'needs_endpoint',
          error: `${modelSpec.label} requires a Hugging Face private endpoint or local GGUF runtime endpoint.`,
        },
      }
    }
    if (!opts.apiKey && !opts.endpoint) {
      return {
        output: null,
        attempt: { provider: 'huggingface', model: opts.model, status: 'needs_key', error: 'Hugging Face key or endpoint is required.' },
      }
    }
    const endpoint = opts.endpoint ?? `https://api-inference.huggingface.co/models/${opts.model}`
    const validated = validateAdultProviderUrl(endpoint)
    if (!validated.ok) {
      return { output: null, attempt: { provider: 'huggingface', model: opts.model, status: 'test_failed', error: validated.error } }
    }
    const chat = await postAdultOpenAiCompatible({ endpoint: validated.url, apiKey: opts.apiKey, model: opts.model, input: opts.input })
      .catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))
    if (chat.output) return { output: chat.output, attempt: { provider: 'huggingface', model: opts.model, status: 'ready' } }
    const raw = await postAdultHuggingFaceRaw({ endpoint: validated.url, apiKey: opts.apiKey, input: opts.input })
      .catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))
    if (raw.output) return { output: raw.output, attempt: { provider: 'huggingface', model: opts.model, status: 'ready' } }
    return {
      output: null,
      attempt: {
        provider: 'huggingface',
        model: opts.model,
        status: chat.status === 401 || chat.status === 403 || raw.status === 401 || raw.status === 403 ? 'needs_key' : 'test_failed',
        error: raw.error ?? chat.error ?? 'Hugging Face endpoint returned no text.',
      },
    }
  }

  if (opts.provider === 'custom' && !opts.endpoint) {
    return { output: null, attempt: { provider: 'custom', model: opts.model, status: 'needs_endpoint', error: 'Custom adult text provider requires endpoint.' } }
  }
  if (!opts.apiKey && opts.provider !== 'custom') {
    const providerName = opts.provider === 'xai' ? 'xAI/Grok' : 'Together AI'
    return { output: null, attempt: { provider: opts.provider, model: opts.model, status: 'needs_key', error: `${providerName} key is required.` } }
  }

  const endpoint =
    opts.provider === 'together' ? 'https://api.together.xyz'
    : opts.provider === 'xai' ? 'https://api.x.ai'
    : opts.endpoint ?? ''
  const validated = validateAdultProviderUrl(endpoint)
  if (!validated.ok) {
    return { output: null, attempt: { provider: opts.provider, model: opts.model, status: 'test_failed', error: validated.error } }
  }
  const res = await postAdultOpenAiCompatible({ endpoint: validated.url, apiKey: opts.apiKey, model: opts.model, input: opts.input })
    .catch((err) => ({ output: null, error: err instanceof Error ? err.message : String(err), status: 0 }))
  return res.output
    ? { output: res.output, attempt: { provider: opts.provider, model: opts.model, status: 'ready' } }
    : {
        output: null,
        attempt: {
          provider: opts.provider,
          model: opts.model,
          status: res.status === 401 || res.status === 403 ? 'needs_key' : 'test_failed',
          error: res.error ?? `${opts.provider} returned no text.`,
        },
      }
}

// ── Artifact saving ───────────────────────────────────────────────────────────

// ── Artifact type mapping ─────────────────────────────────────────────────────

const ARTIFACT_TYPE_MAP: Record<string, 'image' | 'audio' | 'video' | 'code' | 'document'> = {
  image_generation: 'image', image_edit: 'image', adult_image: 'image', suggestive_image: 'image',
  video_generation: 'video', image_to_video: 'video', adult_video: 'video', suggestive_video: 'video',
  video_plan: 'document',
  music_generation: 'audio', tts: 'audio', voice_response: 'audio',
  adult_text: 'document', code: 'code', repo_edit: 'code',
}

async function maybeSaveArtifact(
  cap: string,
  output: string | null,
  provider: string | null,
  model: string | null,
  appSlug: string,
  traceId?: string,
): Promise<string | undefined> {
  if (!output) return undefined
  try {
    const artifactType = ARTIFACT_TYPE_MAP[cap] ?? 'document'
    const isUrl = output.startsWith('http://') || output.startsWith('https://')
    const artifact = await createArtifact({
      appSlug,
      type: artifactType,
      subType: cap,
      provider: provider ?? undefined,
      model: model ?? undefined,
      traceId,
      ...(isUrl ? { contentUrl: output } : { content: output }),
    })
    return artifact.id
  } catch (err) {
    console.warn('[capability-router] Artifact save failed:', err instanceof Error ? err.message : err)
    return undefined
  }
}

// ── Execution logger ──────────────────────────────────────────────────────────

function logExecution(
  cap: string,
  provider: string | null,
  model: string | null,
  fallback: boolean,
  artifactSaved: boolean,
  error: string | null,
): void {
  console.log(
    `[capability-router] capability=${cap} provider=${provider ?? 'none'} ` +
    `model=${model ?? 'none'} fallback=${fallback} artifact=${artifactSaved} ` +
    `error=${error ?? 'null'}`,
  )
}

// ── App capability permission check ──────────────────────────────────────────

/**
 * Check whether an app's AppAgent record allows a given capability.
 *
 * Returns a human-readable denial message if denied, or null if allowed.
 * Falls back to allowing the request if the DB is unavailable or the agent
 * record doesn't exist (so existing apps without an agent record are unaffected).
 */
async function checkAppCapabilityDenied(
  appId: string,
  capability: string,
): Promise<string | null> {
  // In test runtime, skip the DB lookup — no AppAgent record → allow (backward compat).
  if (IS_TEST_RUNTIME) return null
  try {
    const { prisma } = await import('@/lib/prisma')
    const agent = await prisma.appAgent.findUnique({ where: { appSlug: appId } })
    if (!agent) return null   // no agent record → allow (backward compat)
    if (!agent.active) {
      return `App "${appId}" agent is disabled. Contact the platform admin.`
    }
    let allowed: string[] = []
    try { allowed = JSON.parse(agent.allowedCapabilities) as string[] } catch { /* ignore */ }
    if (allowed.length === 0) return null   // empty → allow all (default)
    if (!allowed.includes(capability)) {
      return `Capability "${capability}" is not enabled for app "${appId}". ` +
        `Enabled: [${allowed.join(', ')}]. Contact the platform admin to enable it.`
    }
    return null
  } catch {
    return null   // DB unavailable → allow
  }
}

// ── Main router ───────────────────────────────────────────────────────────────

export async function executeCapability(
  request: CapabilityRequest,
): Promise<CapabilityResponse> {
  const cap = detectCapability(request.input, request.capability)
  const appSlug = request.appId ?? request.workspaceId ?? '__system__'
  const save = request.saveArtifact ?? false

  // ── Provider health sync (merged from orchestrator) ───────────────────────
  // Sync the model-registry health cache from DB so that model selection
  // reflects actual configured state. Wrapped in try/catch — if DB is
  // unavailable, proceed with static registry defaults.
  let _availableProviders: AvailableProvider[] = []
  try {
    _availableProviders = await loadAvailableProviders()
    syncProviderHealthCache(_availableProviders)
  } catch {
    // DB unavailable — proceed without health sync
  }

  // ── Budget enforcement (merged from orchestrator) ─────────────────────────
  // Filter out providers that have exceeded their budget critical threshold.
  // If ALL are over budget, keep all to avoid total outage.
  try {
    if (_availableProviders.length > 0) {
      const budgetOk = await Promise.all(_availableProviders.map(p => isProviderWithinBudget(p.providerKey)))
      const withinBudget = _availableProviders.filter((_, i) => budgetOk[i])
      if (withinBudget.length > 0 && withinBudget.length < _availableProviders.length) {
        _availableProviders = withinBudget
      }
    }
  } catch {
    // Budget DB unavailable — proceed with all providers
  }

  // ── App profile loading (merged from orchestrator) ────────────────────────
  // Load per-app DB profile so the routing engine picks up DB-configured
  // allowedProviders, preferredModels, etc.
  if (appSlug && appSlug !== '__system__' && appSlug !== '__admin_test__') {
    try {
      const dbProfile = await getAppProfileFromDb(appSlug)
      if (dbProfile) {
        runtimeProfileOverrides.set(appSlug.toLowerCase().trim(), dbProfile)
      }
    } catch {
      // DB lookup failure — routing engine falls back to static default profile
    }
  }

  // ── App capability permission check ──────────────────────────────────────
  // If a specific appId (not workspace/system) is provided, verify that the
  // app's AppAgent record allows this capability.  Skip for internal system calls.
  if (request.appId && request.appId !== '__system__' && request.appId !== '__admin_test__') {
    const denied = await checkAppCapabilityDenied(request.appId, cap)
    if (denied) {
      logExecution(cap, null, null, false, false, denied)
      return {
        success: false,
        capability: cap,
        provider: null,
        model: null,
        outputType: outputTypeForCapability(cap),
        output: null,
        fallbackUsed: false,
        error: denied,
        error_category: 'guardrail_block',
      }
    }
  }

  // ── Test-runtime fast exit (no real provider invoked) ────────────────────
  // Prevents real network/provider calls in test environments for calls that
  // have no providerOverride (i.e. system, internal, or app callers without a
  // specific provider mock).  Covers both no-appId system calls and appId calls
  // where AppAgent may not exist (backward-compat allow path).
  // Does not affect production, and does not intercept tests that mock a
  // specific provider (providerOverride set) to validate provider logic.
  if (IS_TEST_RUNTIME && !request.providerOverride) {
    return {
      success: true,
      capability: cap,
      provider: 'test',
      model: 'test',
      outputType: outputTypeForCapability(cap),
      output: '[test runtime] no real provider invoked',
      fallbackUsed: false,
    }
  }

  // ── Adult permission + legal safety gate ─────────────────────────────────
  if (cap === 'adult_text' || cap === 'adult_image' || cap === 'adult_video' || cap === 'adult_avatar') {
    // 1. Permission check (adultMode + !safeMode)
    const permission = checkAdultPermission({
      adultMode: request.adultMode ?? false,
      safeMode: request.safeMode ?? false,
      appId: request.appId,
    })
    if (!permission.granted) {
      logExecution(cap, null, null, false, false, permission.reason ?? 'adult permission denied')
      return {
        success: false,
        capability: cap,
        provider: null,
        model: null,
        outputType: outputTypeForCapability(cap),
        output: null,
        fallbackUsed: false,
        error: permission.reason ?? 'Adult mode is not enabled',
        error_category: 'guardrail_block',
      }
    }
    // 2. Legal safety check
    const safety = checkAdultLegalSafety(request.input)
    if (!safety.allowed) {
      logExecution(cap, null, null, false, false, safety.reason ?? 'adult safety block')
      return {
        success: false,
        capability: cap,
        provider: null,
        model: null,
        outputType: outputTypeForCapability(cap),
        output: null,
        fallbackUsed: false,
        error: safety.reason ?? 'Content blocked by adult legal safety check',
        error_category: 'guardrail_block',
      }
    }
    // Legacy guardrail (degrading terms on input) still applies
    const legacyBlock = checkAdultGuardrails(request.input, request.adultMode ?? false, request.safeMode ?? false)
    if (legacyBlock) {
      logExecution(cap, null, null, false, false, legacyBlock)
      return {
        success: false,
        capability: cap,
        provider: null,
        model: null,
        outputType: outputTypeForCapability(cap),
        output: null,
        fallbackUsed: false,
        error: legacyBlock,
        error_category: 'guardrail_block',
      }
    }
  }

  // ── Scrape website ────────────────────────────────────────────────────────
  if (cap === 'scrape_website') {
    try {
      // Prefer a valid URL extracted from input; fall back to raw input
      let url = request.input.trim()
      const urlMatch = request.input.match(/https?:\/\/\S+/)
      if (urlMatch) {
        try { new URL(urlMatch[0]); url = urlMatch[0] } catch { /* keep raw input */ }
      }
      const meta = request.metadata ?? {}
      const result = await crawlWebsite(url, {
        maxPages: typeof meta.maxPages === 'number' ? meta.maxPages : 10,
        maxDepth: typeof meta.maxDepth === 'number' ? meta.maxDepth : 2,
        timeoutMs: typeof meta.timeoutMs === 'number' ? meta.timeoutMs : 15_000,
        followLinks: typeof meta.followLinks === 'boolean' ? meta.followLinks : true,
      })
      const output = result.success
        ? JSON.stringify({
            summary: result.summary,
            pages: result.totalPages,
            niche: result.detectedNiche,
            features: result.detectedFeatures,
            capabilities: result.aiCapabilitiesNeeded,
          })
        : null
      let artifactId: string | undefined
      if (save && output) {
        artifactId = await maybeSaveArtifact(cap, output, 'scraper', null, appSlug, request.traceId)
      }
      logExecution(cap, 'scraper', null, false, !!artifactId, result.error ?? null)
      return {
        success: result.success,
        capability: cap,
        provider: 'scraper',
        model: null,
        outputType: 'text',
        output,
        artifactId,
        fallbackUsed: false,
        error: result.error ?? undefined,
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Scraper failed'
      logExecution(cap, 'scraper', null, false, false, error)
      return { success: false, capability: cap, provider: 'scraper', model: null, outputType: 'text', output: null, fallbackUsed: false, error }
    }
  }

  // ── Image generation (registry-driven) ─────────────────────────────────────
  if (cap === 'image_generation' || cap === 'image_edit') {
    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
      excludeModels: [],
    })

    if (!resolvedModel) {
      logExecution(cap, null, null, true, false, 'No image model resolved')
      return {
        success: false,
        capability: cap,
        provider: null,
        model: null,
        outputType: 'image',
        output: null,
        fallbackUsed: true,
        error: 'No image generation provider is configured. Configure GenX or Together AI.',
      }
    }

    // Try GenX first (primary)
    if (resolvedModel.providerKey === 'genx') {
      const res = await tryGenXMedia(request.input, 'image', resolvedModel.modelId)
      if (res.success && res.url) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.url, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'image', output: res.url, artifactId, fallbackUsed: false }
      }
      if (res.success && res.jobId) {
        logExecution(cap, 'genx', res.model, false, false, null)
        return {
          success: true,
          capability: cap,
          provider: 'genx',
          model: res.model,
          outputType: 'image',
          output: null,
          jobId: res.jobId,
          status: res.status,
          fallbackUsed: false,
        }
      }
    }

    // Fallback: Together AI
    if (resolvedModel.providerKey === 'together') {
      const togetherKey = await getVaultApiKey('together')
      if (togetherKey) {
        try {
          const res = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { Authorization: `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: resolvedModel.modelId, prompt: request.input, n: 1, steps: 4, width: 1024, height: 1024 }),
            signal: AbortSignal.timeout(60_000),
          })
          if (res.ok) {
            const data = await res.json() as { data?: Array<{ url?: string }> }
            const url = data.data?.[0]?.url ?? null
            if (url) {
              let artifactId: string | undefined
              if (save) artifactId = await maybeSaveArtifact(cap, url, 'together', resolvedModel.modelId, appSlug, request.traceId)
              logExecution(cap, 'together', resolvedModel.modelId, true, !!artifactId, null)
              return { success: true, capability: cap, provider: 'together', model: resolvedModel.modelId, outputType: 'image', output: url, artifactId, fallbackUsed: true, fallbackReason: 'GenX image unavailable' }
            }
          }
        } catch (err) { console.warn('[capability-router] Together AI image failed:', err instanceof Error ? err.message : err) }
      }
    }

    logExecution(cap, null, null, true, false, 'No image provider available')
    return {
      success: false,
      capability: cap,
      provider: null,
      model: null,
      outputType: 'image',
      output: null,
      fallbackUsed: true,
      error: 'No image generation provider is configured. Configure GenX or Together AI.',
    }
  }

  // ── Adult capabilities — HuggingFace dedicated endpoints ONLY ───────────────
  // GenX, Together, Groq, MiMo must NEVER be used for adult generation.
  // Primary endpoint tried first; fallback endpoint tried if primary fails/missing.
  // Permission and legal safety already checked above.
  if (cap === 'adult_text' || cap === 'adult_image' || cap === 'adult_video' || cap === 'adult_avatar') {
    const adultCap = cap as AdultCapabilityType

    const hfKey = await getVaultApiKey('huggingface')
    if (!hfKey) {
      logExecution(cap, null, null, false, false, 'HF key missing for adult capability')
      return { success: false, capability: cap, provider: null, model: null, outputType: outputTypeForCapability(cap), output: null, fallbackUsed: false, error: 'HuggingFace API key is required for adult capabilities. Configure it in Admin → AI Providers → HuggingFace.', error_category: 'missing_key' }
    }

    // Build request body based on capability
    const meta = request.metadata ?? {}
    let body: Record<string, unknown>
    let adultOutputType: 'text' | 'image' | 'video' = 'image'

    if (adultCap === 'adult_text') {
      adultOutputType = 'text'
      const textPayload: AdultTextPayload = {
        userPrompt: request.input,
        characterName: typeof meta.characterName === 'string' ? meta.characterName : undefined,
        characterDescription: typeof meta.characterDescription === 'string' ? meta.characterDescription : undefined,
        relationship: typeof meta.relationship === 'string' ? meta.relationship : undefined,
        tone: typeof meta.tone === 'string' ? meta.tone : undefined,
        boundaries: typeof meta.boundaries === 'string' ? meta.boundaries : undefined,
        memoryHints: Array.isArray(meta.memoryHints) ? meta.memoryHints as string[] : undefined,
        language: typeof meta.language === 'string' ? meta.language : undefined,
      }
      body = buildAdultTextBody(textPayload)
    } else if (adultCap === 'adult_image') {
      adultOutputType = 'image'
      const imagePayload: AdultImagePayload = {
        prompt: request.input,
        style: typeof meta.style === 'string' ? meta.style : undefined,
        negativePrompt: typeof meta.negativePrompt === 'string' ? meta.negativePrompt : undefined,
        width: typeof meta.width === 'number' ? meta.width : undefined,
        height: typeof meta.height === 'number' ? meta.height : undefined,
        steps: typeof meta.steps === 'number' ? meta.steps : undefined,
        guidanceScale: typeof meta.guidanceScale === 'number' ? meta.guidanceScale : undefined,
      }
      body = buildAdultImageBody(imagePayload)
    } else if (adultCap === 'adult_video') {
      adultOutputType = 'video'
      const videoPayload: AdultVideoPayload = {
        prompt: request.input,
        sourceImageUrl: typeof meta.sourceImageUrl === 'string' ? meta.sourceImageUrl : undefined,
        duration: typeof meta.duration === 'number' ? meta.duration : undefined,
        style: typeof meta.style === 'string' ? meta.style : undefined,
        motionNotes: typeof meta.motionNotes === 'string' ? meta.motionNotes : undefined,
      }
      body = buildAdultVideoBody(videoPayload)
    } else {
      // adult_avatar — enhanced payload with style/mode/appearance/voice
      adultOutputType = 'image'
      const voiceRaw = meta.voice as Record<string, unknown> | undefined
      const voicePayload: AvatarVoicePayload | undefined = voiceRaw ? {
        voiceMode: typeof voiceRaw.voiceMode === 'string' ? voiceRaw.voiceMode as AvatarVoicePayload['voiceMode'] : 'none',
        voiceProvider: 'huggingface',
        referenceAudioUrl: typeof voiceRaw.referenceAudioUrl === 'string' ? voiceRaw.referenceAudioUrl : undefined,
        consentConfirmed: typeof voiceRaw.consentConfirmed === 'boolean' ? voiceRaw.consentConfirmed : false,
        rightsConfirmed: typeof voiceRaw.rightsConfirmed === 'boolean' ? voiceRaw.rightsConfirmed : false,
        voiceStyle: typeof voiceRaw.voiceStyle === 'string' ? voiceRaw.voiceStyle : undefined,
        language: typeof voiceRaw.language === 'string' ? voiceRaw.language : undefined,
        accent: typeof voiceRaw.accent === 'string' ? voiceRaw.accent : undefined,
        emotion: typeof voiceRaw.emotion === 'string' ? voiceRaw.emotion : undefined,
        speakingRate: typeof voiceRaw.speakingRate === 'number' ? voiceRaw.speakingRate : undefined,
        pitch: typeof voiceRaw.pitch === 'number' ? voiceRaw.pitch : undefined,
        sampleText: typeof voiceRaw.sampleText === 'string' ? voiceRaw.sampleText : undefined,
      } : undefined

      // If cloned_voice is required but has consent issues, block before image generation
      if (voicePayload?.voiceMode === 'cloned_voice') {
        const voiceDescription = `${request.input} ${meta.appearance ?? ''}`
        const voiceBlockReason = checkVoiceCloneRules(voicePayload, voiceDescription)
        if (voiceBlockReason) {
          logExecution(cap, null, null, false, false, voiceBlockReason)
          return { success: false, capability: cap, provider: null, model: null, outputType: 'image', output: null, fallbackUsed: false, error: voiceBlockReason, error_category: 'guardrail_block' }
        }
      }

      const avatarPayload: AdultAvatarPayload = {
        characterProfile: request.input,
        appearance: typeof meta.appearance === 'string' ? meta.appearance : request.input,
        ageConfirmation: 'adult',
        gender: typeof meta.gender === 'string' ? meta.gender : undefined,
        style: typeof meta.style === 'string' ? meta.style as AvatarStyle : undefined,
        outfit: typeof meta.outfit === 'string' ? meta.outfit : undefined,
        pose: typeof meta.pose === 'string' ? meta.pose : undefined,
        background: typeof meta.background === 'string' ? meta.background : undefined,
        aspectRatio: typeof meta.aspectRatio === 'string' ? meta.aspectRatio as AdultAvatarPayload['aspectRatio'] : undefined,
        mode: typeof meta.mode === 'string' ? meta.mode as AvatarMode : undefined,
        personalityNotes: typeof meta.personalityNotes === 'string' ? meta.personalityNotes : undefined,
        consistencySeed: typeof meta.consistencySeed === 'number' ? meta.consistencySeed : undefined,
        referenceImageUrl: typeof meta.referenceImageUrl === 'string' ? meta.referenceImageUrl : undefined,
        width: typeof meta.width === 'number' ? meta.width : undefined,
        height: typeof meta.height === 'number' ? meta.height : undefined,
        voice: voicePayload,
      }
      const avatarError = validateAdultAvatarPayload(avatarPayload)
      if (avatarError) {
        logExecution(cap, null, null, false, false, avatarError)
        return { success: false, capability: cap, provider: null, model: null, outputType: 'image', output: null, fallbackUsed: false, error: avatarError }
      }
      body = buildAdultAvatarBody(avatarPayload)
    }

    // Execute image generation across all configured HF candidates (primary → fallback)
    const hfResult = await executeHFAdultGenerationChain(adultCap, hfKey, body)

    // Handle cloned_voice-only requests where image is not the primary ask
    // (if image fails AND voice was the primary request mode, propagate failure)
    const voiceMeta = adultCap === 'adult_avatar' ? (meta.voice as Record<string, unknown> | undefined) : undefined
    const voiceRequired = voiceMeta?.voiceMode === 'cloned_voice' && voiceMeta?.requiresVoice === true

    if (!hfResult.success && voiceRequired) {
      logExecution(cap, null, null, false, false, hfResult.error)
      return { success: false, capability: cap, provider: null, model: null, outputType: adultOutputType, output: null, fallbackUsed: false, error: hfResult.error ?? 'Avatar image generation failed', error_category: 'endpoint_error', metadata: { providerAttempts: hfResult.providerAttempts } }
    }

    if (hfResult.success && (hfResult.output || hfResult.jobId)) {
      const usedFallback = hfResult.providerAttempts.some(a => a.priority === 'primary' && a.status === 'failed')
      let artifactId: string | undefined
      if (save && hfResult.output) artifactId = await maybeSaveArtifact(cap, hfResult.output, 'huggingface', hfResult.model, appSlug, request.traceId)
      logExecution(cap, 'huggingface', hfResult.model, usedFallback, !!artifactId, null)

      // Execute voice if avatar succeeded and voice is requested
      let voiceResult: import('@/lib/adult-capability').AvatarVoiceResult | undefined
      if (adultCap === 'adult_avatar' && voiceMeta) {
        const voicePayloadForExec: AvatarVoicePayload = {
          voiceMode: (voiceMeta.voiceMode as AvatarVoicePayload['voiceMode']) ?? 'none',
          voiceProvider: 'huggingface',
          referenceAudioUrl: typeof voiceMeta.referenceAudioUrl === 'string' ? voiceMeta.referenceAudioUrl : undefined,
          consentConfirmed: typeof voiceMeta.consentConfirmed === 'boolean' ? voiceMeta.consentConfirmed : false,
          rightsConfirmed: typeof voiceMeta.rightsConfirmed === 'boolean' ? voiceMeta.rightsConfirmed : false,
          sampleText: typeof voiceMeta.sampleText === 'string' ? voiceMeta.sampleText : undefined,
          voiceStyle: typeof voiceMeta.voiceStyle === 'string' ? voiceMeta.voiceStyle : undefined,
          language: typeof voiceMeta.language === 'string' ? voiceMeta.language : undefined,
          emotion: typeof voiceMeta.emotion === 'string' ? voiceMeta.emotion : undefined,
          speakingRate: typeof voiceMeta.speakingRate === 'number' ? voiceMeta.speakingRate : undefined,
          pitch: typeof voiceMeta.pitch === 'number' ? voiceMeta.pitch : undefined,
        }
        voiceResult = await executeAvatarVoice(voicePayloadForExec, hfKey, request.input)

        // If cloned_voice was required but endpoint missing, that is a failure
        if (voicePayloadForExec.voiceMode === 'cloned_voice' && voiceResult.voiceStatus === 'not_configured') {
          logExecution(cap, 'huggingface', hfResult.model, usedFallback, !!artifactId, 'voice endpoint missing')
          return {
            success: false,
            capability: cap,
            provider: 'huggingface',
            model: hfResult.model,
            outputType: adultOutputType,
            output: hfResult.output,
            artifactId,
            fallbackUsed: usedFallback,
            error: voiceResult.error ?? 'Cloned voice endpoint not configured. Set HF_ADULT_VOICE_ENDPOINT.',
            error_category: 'endpoint_error',
            metadata: {
              capability: adultCap,
              generationMode: hfResult.generationMode,
              permissionStatus: hfResult.permissionStatus,
              safetyStatus: hfResult.safetyStatus,
              endpointKey: hfResult.endpointKey,
              providerAttempts: hfResult.providerAttempts,
              voiceStatus: voiceResult.voiceStatus,
            },
          }
        }
      }

      return {
        success: true,
        capability: cap,
        provider: 'huggingface',
        model: hfResult.model,
        outputType: adultOutputType,
        output: hfResult.output,
        ...(hfResult.jobId ? { jobId: hfResult.jobId, status: hfResult.status as CapabilityResponse['status'] } : {}),
        artifactId,
        fallbackUsed: usedFallback,
        fallbackReason: usedFallback ? 'Primary HF adult endpoint failed or unavailable' : undefined,
        metadata: {
          capability: adultCap,
          generationMode: hfResult.generationMode,
          permissionStatus: hfResult.permissionStatus,
          safetyStatus: hfResult.safetyStatus,
          endpointKey: hfResult.endpointKey,
          providerAttempts: hfResult.providerAttempts,
          ...(voiceResult ? {
            voiceStatus: voiceResult.voiceStatus,
            voiceUrl: voiceResult.voiceUrl,
            voiceJobId: voiceResult.voiceJobId,
            voiceModel: voiceResult.voiceModel,
          } : {}),
        },
      }
    }

    logExecution(cap, 'huggingface', hfResult.model, false, false, hfResult.error)
    return {
      success: false,
      capability: cap,
      provider: null,
      model: null,
      outputType: adultOutputType,
      output: null,
      fallbackUsed: false,
      error: hfResult.error ?? `HF adult ${adultCap} returned no output`,
      error_category: 'endpoint_error',
      metadata: { providerAttempts: hfResult.providerAttempts },
    }
  }

  // ── Avatar generation — GenX + HuggingFace + Together multi-provider ────────
  // Non-adult avatar only. Adult avatars are routed via adult_avatar capability.
  // Provider order: runtime-resolved by budget preference.
  if (cap === 'avatar_generation') {
    const meta = request.metadata ?? {}
    const rawVoice = meta.voice as Record<string, unknown> | undefined
    const avatarPayload: AvatarPayload = {
      avatarName: typeof meta.avatarName === 'string' ? meta.avatarName : request.input.slice(0, 80),
      appSlug: appSlug !== '__system__' ? appSlug : undefined,
      avatarRole: typeof meta.avatarRole === 'string' ? meta.avatarRole : undefined,
      style: typeof meta.style === 'string' ? meta.style as AvatarStyleType : 'realistic_human',
      mode: typeof meta.mode === 'string' ? meta.mode as AvatarModeType : 'portrait',
      ageCategory: typeof meta.ageCategory === 'string' ? meta.ageCategory as AvatarPayload['ageCategory'] : 'adult',
      appearance: typeof meta.appearance === 'string' ? meta.appearance : request.input,
      personality: typeof meta.personality === 'string' ? meta.personality : undefined,
      outfit: typeof meta.outfit === 'string' ? meta.outfit : undefined,
      pose: typeof meta.pose === 'string' ? meta.pose : undefined,
      background: typeof meta.background === 'string' ? meta.background : undefined,
      brandColors: Array.isArray(meta.brandColors) ? meta.brandColors as string[] : undefined,
      referenceImageUrl: typeof meta.referenceImageUrl === 'string' ? meta.referenceImageUrl : undefined,
      consistencySeed: typeof meta.consistencySeed === 'number' ? meta.consistencySeed : undefined,
      aspectRatio: typeof meta.aspectRatio === 'string' ? meta.aspectRatio as AvatarPayload['aspectRatio'] : '1:1',
      resolution: typeof meta.resolution === 'string' ? meta.resolution as AvatarPayload['resolution'] : '1024px',
      animationPrompt: typeof meta.animationPrompt === 'string' ? meta.animationPrompt : undefined,
      scriptLine: typeof meta.scriptLine === 'string' ? meta.scriptLine : undefined,
      emotion: typeof meta.emotion === 'string' ? meta.emotion : undefined,
      targetAudience: typeof meta.targetAudience === 'string' ? meta.targetAudience : undefined,
      usage: typeof meta.usage === 'string' ? meta.usage as AvatarPayload['usage'] : 'general',
      budget: typeof meta.budget === 'string' ? meta.budget as AvatarPayload['budget'] : 'balanced',
      voice: rawVoice ? {
        voiceMode: (rawVoice.voiceMode as AvatarVoiceConfig['voiceMode']) ?? 'none',
        consentConfirmed: typeof rawVoice.consentConfirmed === 'boolean' ? rawVoice.consentConfirmed : false,
        rightsConfirmed: typeof rawVoice.rightsConfirmed === 'boolean' ? rawVoice.rightsConfirmed : false,
        referenceAudioUrl: typeof rawVoice.referenceAudioUrl === 'string' ? rawVoice.referenceAudioUrl : undefined,
        sampleText: typeof rawVoice.sampleText === 'string' ? rawVoice.sampleText : undefined,
        voiceStyle: typeof rawVoice.voiceStyle === 'string' ? rawVoice.voiceStyle : undefined,
        language: typeof rawVoice.language === 'string' ? rawVoice.language : undefined,
        emotion: typeof rawVoice.emotion === 'string' ? rawVoice.emotion : undefined,
        speakingRate: typeof rawVoice.speakingRate === 'number' ? rawVoice.speakingRate : undefined,
        pitch: typeof rawVoice.pitch === 'number' ? rawVoice.pitch : undefined,
      } : undefined,
    }

    // Validate
    const avatarValidation = validateAvatarPayload(avatarPayload)
    if (!avatarValidation.valid) {
      logExecution(cap, null, null, false, false, avatarValidation.error ?? 'invalid avatar payload')
      return { success: false, capability: cap, provider: null, model: null, outputType: 'image', output: null, fallbackUsed: false, error: avatarValidation.error ?? 'Invalid avatar payload', error_category: 'guardrail_block' }
    }

    // Build prompt
    const avatarPrompt = buildAvatarPrompt(avatarPayload)
    const budget = avatarPayload.budget ?? 'balanced'
    const providerOrder = resolveAvatarProviderOrder(budget, avatarPayload.mode, avatarPayload.style)

    // ── GenX avatar helper
    const tryAvatarGenX = async (fallbackUsed: boolean) => {
      const res = await tryGenXMedia(avatarPrompt.prompt, 'image', 'auto', {
        width: avatarPrompt.params.width as number,
        height: avatarPrompt.params.height as number,
        negative_prompt: avatarPrompt.negativePrompt,
        ...(avatarPayload.consistencySeed !== undefined ? { seed: avatarPayload.consistencySeed } : {}),
      })
      if (!res.success || (!res.url && !res.jobId)) return null
      const output = res.url
      let artifactId: string | undefined
      if (save && output) artifactId = await maybeSaveArtifact(cap, output, 'genx', res.model, appSlug, request.traceId)
      logExecution(cap, 'genx', res.model, fallbackUsed, !!artifactId, null)
      return {
        success: true, capability: cap, provider: 'genx', model: res.model,
        outputType: 'image' as const, output, artifactId, fallbackUsed,
        ...(res.jobId ? { jobId: res.jobId, status: res.status as CapabilityResponse['status'] } : {}),
        metadata: buildAvatarStorageMetadata(avatarPayload, 'genx', res.model),
      }
    }

    // ── HF avatar helper
    const tryAvatarHF = async (fallbackUsed: boolean) => {
      const hfKey = await getVaultApiKey('huggingface')
      if (!hfKey) return null
      const hfRes = await executeHFAvatarImage(avatarPrompt, hfKey)
      if (!hfRes.success) return null
      const output = hfRes.imageDataUrl ?? hfRes.imageUrl
      if (!output && !hfRes.jobId) return null
      let artifactId: string | undefined
      if (save && output) artifactId = await maybeSaveArtifact(cap, output, 'huggingface', hfRes.model, appSlug, request.traceId)
      logExecution(cap, 'huggingface', hfRes.model, fallbackUsed, !!artifactId, null)
      return {
        success: true, capability: cap, provider: 'huggingface', model: hfRes.model,
        outputType: 'image' as const, output: output ?? null, artifactId, fallbackUsed,
        ...(hfRes.jobId ? { jobId: hfRes.jobId, status: 'processing' as CapabilityResponse['status'] } : {}),
        metadata: buildAvatarStorageMetadata(avatarPayload, 'huggingface', hfRes.model),
      }
    }

    // ── Together avatar helper
    const tryAvatarTogether = async (fallbackUsed: boolean) => {
      const togetherKey = await getVaultApiKey('together')
      if (!togetherKey) return null
      const tRes = await executeTogetherAvatarImage(avatarPrompt, togetherKey)
      if (!tRes.success || !tRes.imageUrl) return null
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, tRes.imageUrl, 'together', tRes.model, appSlug, request.traceId)
      logExecution(cap, 'together', tRes.model, fallbackUsed, !!artifactId, null)
      return {
        success: true, capability: cap, provider: 'together', model: tRes.model,
        outputType: 'image' as const, output: tRes.imageUrl, artifactId, fallbackUsed,
        metadata: buildAvatarStorageMetadata(avatarPayload, 'together', tRes.model),
      }
    }

    const avatarFns: Record<string, (fallback: boolean) => Promise<CapabilityResponse | null>> = {
      genx: tryAvatarGenX,
      huggingface: tryAvatarHF,
      together: tryAvatarTogether,
    }

    let avatarResult: CapabilityResponse | null = null
    let isFirst = true
    const avatarErrors: string[] = []

    for (const provider of providerOrder) {
      const fn = avatarFns[provider]
      if (!fn) continue
      avatarResult = await fn(!isFirst)
      if (avatarResult) break
      avatarErrors.push(`${provider} avatar failed`)
      isFirst = false
    }

    if (!avatarResult) {
      const errMsg = avatarErrors.join('; ') || 'No avatar provider could generate an image. Configure GenX, HuggingFace (HF_AVATAR_IMAGE_ENDPOINT), or Together AI.'
      logExecution(cap, null, null, false, false, errMsg)
      return { success: false, capability: cap, provider: null, model: null, outputType: 'image', output: null, fallbackUsed: false, error: errMsg }
    }

    // Attach voice if requested and image succeeded
    if (avatarPayload.voice && avatarPayload.voice.voiceMode !== 'none') {
      const hfKey = await getVaultApiKey('huggingface')
      if (hfKey) {
        const voiceRes = await executeAvatarVoiceNonAdult(avatarPayload.voice, hfKey, `${avatarPayload.avatarName} ${avatarPayload.appearance}`)
        const prevMeta = avatarResult.metadata as Record<string, unknown> ?? {}
        avatarResult = {
          ...avatarResult,
          metadata: {
            ...prevMeta,
            voiceStatus: voiceRes.voiceStatus,
            voiceUrl: voiceRes.voiceUrl,
            voiceJobId: voiceRes.voiceJobId,
            voiceModel: voiceRes.voiceModel,
          },
        }
      }
    }

    return avatarResult
  }

  // ── Suggestive image generation (non-explicit, gated) ────────────────────
  // Requires safeMode=false (adultMode flag used as proxy in capability-router context).
  if (cap === 'suggestive_image') {
    if (request.safeMode) {
      return {
        success: false, capability: cap, provider: null, model: null,
        outputType: 'image', output: null, fallbackUsed: false,
        error: 'safeMode is active — suggestive image generation blocked',
      }
    }
    const finalPrompt = `${SUGGESTIVE_STYLE_PREFIX} ${request.input}`

    // Together AI FLUX (primary)
    const togetherKeySug = await getVaultApiKey('together')
    if (togetherKeySug && (!request.providerOverride || request.providerOverride === 'together')) {
      try {
        const res = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${togetherKeySug}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell-Free', prompt: finalPrompt, n: 1, steps: 4, width: 1024, height: 1024 }),
          signal: AbortSignal.timeout(60_000),
        })
        if (res.ok) {
          const data = await res.json() as { data?: Array<{ url?: string }> }
          const url = data.data?.[0]?.url ?? null
          if (url) {
            let artifactId: string | undefined
            if (save) artifactId = await maybeSaveArtifact(cap, url, 'together', 'FLUX.1-schnell-Free', appSlug, request.traceId)
            logExecution(cap, 'together', 'FLUX.1-schnell-Free', false, !!artifactId, null)
            return { success: true, capability: cap, provider: 'together', model: 'FLUX.1-schnell-Free', outputType: 'image', output: url, artifactId, fallbackUsed: false }
          }
        }
      } catch (err) { console.warn('[capability-router] Together suggestive image failed:', err instanceof Error ? err.message : err) }
    }

    logExecution(cap, null, null, true, false, 'No suggestive image provider available')
    return {
      success: false, capability: cap, provider: null, model: null, outputType: 'image', output: null, fallbackUsed: true,
      error: 'No suggestive image provider is configured. Configure Together AI.',
    }
  }

  // ── Suggestive video planning (non-explicit, gated) ───────────────────────
  // Returns a structured scene plan — no actual video generation.
  if (cap === 'suggestive_video') {
    if (request.safeMode) {
      return {
        success: false, capability: cap, provider: null, model: null,
        outputType: 'video', output: null, fallbackUsed: false,
        error: 'safeMode is active — suggestive video planning blocked',
      }
    }
    // Produce a scene plan via text fallback
    const planResult = await tryFallbackText(
      `Create a tasteful suggestive video scene plan for: "${request.input}". ` +
      `No explicit sexual content, no genitalia, no minors. ` +
      `Include: style, scenes, camera angles, clothing notes, and audio direction.`,
    )
    if (planResult.success && planResult.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, planResult.output, planResult.provider, planResult.model, appSlug, request.traceId)
      logExecution(cap, planResult.provider, planResult.model, false, !!artifactId, null)
      return {
        success: true, capability: cap, provider: planResult.provider, model: planResult.model,
        outputType: 'video_plan', output: planResult.output, artifactId, fallbackUsed: false,
        warning: 'Suggestive video generation is not available — scene plan returned instead',
      }
    }
    logExecution(cap, null, null, false, false, 'Suggestive video planning failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'video', output: null, fallbackUsed: false, error: 'No text provider available for suggestive video planning.' }
  }

  // ── Video generation — GenX + Together + HuggingFace multi-provider ──────────
  // Success = real video URL, data URL, or async job id.
  // Storyboard/plan alone is never success for video_generation.
  // Provider order is driven by budget setting, not hardcoded.
  if (cap === 'video_generation' || cap === 'image_to_video') {
    // Parse video payload from metadata
    const meta = request.metadata ?? {}
    const rawMode: VideoMode = cap === 'image_to_video' ? 'image_to_video'
      : typeof meta.mode === 'string' ? (meta.mode as VideoMode) : 'text_to_video'
    const videoPayload: VideoCapabilityPayload = {
      prompt: (typeof meta.prompt === 'string' && meta.prompt.trim()) ? meta.prompt.trim() : request.input,
      mode: rawMode,
      style: typeof meta.style === 'string' ? meta.style as VideoStyle : undefined,
      aspectRatio: typeof meta.aspectRatio === 'string' ? meta.aspectRatio as VideoCapabilityPayload['aspectRatio'] : '16:9',
      duration: typeof meta.duration === 'number' ? meta.duration : 10,
      fps: typeof meta.fps === 'number' ? meta.fps as 24 | 30 | 60 : undefined,
      resolution: typeof meta.resolution === 'string' ? meta.resolution as VideoCapabilityPayload['resolution'] : '720p',
      budget: typeof meta.budget === 'string' ? meta.budget as BudgetMode : 'balanced',
      imageInput: typeof meta.imageInput === 'string' ? meta.imageInput : undefined,
      videoInput: typeof meta.videoInput === 'string' ? meta.videoInput : undefined,
      mood: typeof meta.mood === 'string' ? meta.mood : undefined,
      targetAudience: typeof meta.targetAudience === 'string' ? meta.targetAudience : undefined,
      voiceover: typeof meta.voiceover === 'boolean' ? meta.voiceover : false,
      captions: typeof meta.captions === 'boolean' ? meta.captions : false,
      music: typeof meta.music === 'boolean' ? meta.music : false,
      characters: Array.isArray(meta.characters) ? meta.characters as VideoCapabilityPayload['characters'] : undefined,
      scenes: Array.isArray(meta.scenes) ? meta.scenes as VideoCapabilityPayload['scenes'] : undefined,
      series: meta.series ? meta.series as VideoCapabilityPayload['series'] : undefined,
      narration: typeof meta.narration === 'string' ? meta.narration : undefined,
    }

    // Validate before any provider call
    const videoValidationError = validateVideoPayload(videoPayload)
    if (videoValidationError) {
      logExecution(cap, null, null, false, false, videoValidationError)
      return { success: false, capability: cap, provider: null, model: null, outputType: 'video', output: null, fallbackUsed: false, error: videoValidationError }
    }

    // Build prompt and determine generationMode
    const videoPrompt = buildVideoProviderPrompt(videoPayload)

    // Long-form / cartoon_episode returns orchestration plan without real video
    if (videoPrompt.generationMode === 'orchestration_plan' || videoPrompt.generationMode === 'long_form_plan') {
      const plan = videoPrompt.orchestrationPlan
      logExecution(cap, null, null, false, false, null)
      return {
        success: true,
        capability: cap,
        provider: null,
        model: null,
        outputType: 'video',
        output: JSON.stringify(plan),
        fallbackUsed: false,
        warning: 'Long-form video: orchestration plan returned. Real video clips require per-scene generation.',
        metadata: {
          generationMode: videoPrompt.generationMode,
          requestedDuration: videoPrompt.duration,
          mode: videoPrompt.mode,
          sceneCount: plan?.scenes.length ?? 0,
          assetRequirements: plan?.assetRequirements ?? [],
        },
      }
    }

    // Shared video metadata builder
    const videoMeta = (genMode: string, provider: string, model: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
      provider, model, generationMode: genMode,
      requestedDuration: videoPrompt.duration,
      mode: videoPrompt.mode,
      aspectRatio: videoPrompt.aspectRatio,
      style: videoPrompt.style,
      ...extra,
    })

    const budget = videoPayload.budget ?? 'balanced'
    const providerOrder = resolveVideoProviderOrder(budget, rawMode, videoPrompt.duration)
    const orderedProviders = [providerOrder.primary, ...providerOrder.fallbacks]

    // ── GenX video helper
    const tryVideoGenX = async (fallbackUsed: boolean): Promise<CapabilityResponse | null> => {
      const isI2V = rawMode === 'image_to_video'
      const videoModel = isI2V ? GENX_I2V_MODELS[0] : GENX_VIDEO_MODELS[0]
      const res = await tryGenXMedia(videoPrompt.prompt, 'video', videoModel, {
        duration: videoPrompt.duration,
        ...(videoPayload.imageInput ? { image_url: videoPayload.imageInput } : {}),
      })
      if (res.success && res.url) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.url, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, fallbackUsed, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'video', output: res.url, artifactId, fallbackUsed, metadata: videoMeta('clip', 'genx', res.model) }
      }
      if (res.success && res.jobId) {
        logExecution(cap, 'genx', res.model, fallbackUsed, false, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'video', output: null, jobId: res.jobId, status: res.status, fallbackUsed, metadata: videoMeta('clip', 'genx', res.model) }
      }
      return null
    }

    // ── Together video helper
    const tryVideoTogether = async (fallbackUsed: boolean): Promise<CapabilityResponse | null> => {
      const togetherKey = await getVaultApiKey('together')
      if (!togetherKey) return null
      const tRes = await executeTogetherVideoGeneration(videoPrompt.prompt, videoPrompt.duration, togetherKey, rawMode, videoPayload.imageInput)
      if (!tRes.success) return null
      const output = tRes.videoUrl
      if (output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, output, 'together', tRes.model, appSlug, request.traceId)
        logExecution(cap, 'together', tRes.model, fallbackUsed, !!artifactId, null)
        return { success: true, capability: cap, provider: 'together', model: tRes.model, outputType: 'video', output, artifactId, fallbackUsed, metadata: videoMeta(tRes.generationMode, 'together', tRes.model) }
      }
      if (tRes.jobId) {
        logExecution(cap, 'together', tRes.model, fallbackUsed, false, null)
        return { success: true, capability: cap, provider: 'together', model: tRes.model, outputType: 'video', output: null, jobId: tRes.jobId, status: (tRes.status ?? 'processing') as CapabilityResponse['status'], fallbackUsed, metadata: videoMeta(tRes.generationMode, 'together', tRes.model) }
      }
      return null
    }

    // ── HF video helper
    const tryVideoHF = async (fallbackUsed: boolean): Promise<CapabilityResponse | null> => {
      const hfKey = await getVaultApiKey('huggingface')
      if (!hfKey) return null
      const hfRes = await executeHFVideoGeneration(videoPrompt.prompt, videoPrompt.duration, hfKey, rawMode, videoPayload.style, videoPayload.imageInput, budget)
      if (!hfRes.success) return null
      const output = hfRes.videoDataUrl ?? hfRes.videoUrl
      if (output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, output, 'huggingface', hfRes.model, appSlug, request.traceId)
        logExecution(cap, 'huggingface', hfRes.model, fallbackUsed, !!artifactId, null)
        return { success: true, capability: cap, provider: 'huggingface', model: hfRes.model, outputType: 'video', output, artifactId, fallbackUsed, metadata: videoMeta(hfRes.generationMode, 'huggingface', hfRes.model) }
      }
      if (hfRes.jobId) {
        logExecution(cap, 'huggingface', hfRes.model, fallbackUsed, false, null)
        return { success: true, capability: cap, provider: 'huggingface', model: hfRes.model, outputType: 'video', output: null, jobId: hfRes.jobId, status: 'processing', fallbackUsed, metadata: videoMeta(hfRes.generationMode, 'huggingface', hfRes.model) }
      }
      return null
    }

    const providerFns: Record<string, (fallback: boolean) => Promise<CapabilityResponse | null>> = {
      genx: tryVideoGenX,
      together: tryVideoTogether,
      huggingface: tryVideoHF,
    }

    let videoResult: CapabilityResponse | null = null
    const errors: string[] = []
    let isFirst = true

    for (const provider of orderedProviders) {
      const fn = providerFns[provider]
      if (!fn) continue
      videoResult = await fn(!isFirst)
      if (videoResult) break
      errors.push(`${provider} video failed`)
      isFirst = false
    }

    if (videoResult) return videoResult

    const finalError = errors.join('; ') || 'No video provider could generate a clip. Configure GenX, Together, or HuggingFace video endpoints.'
    logExecution(cap, null, null, false, false, finalError)
    return { success: false, capability: cap, provider: null, model: null, outputType: 'video', output: null, fallbackUsed: false, error: finalError }
  }

  // ── Music generation — GenX (Lyria) + HuggingFace (full-song/segment) ────────
  // Success = real audio URL, data URL, or async job ID.
  // Blueprint-only is never success. No text fallback.
  // Provider order: runtime-resolved primary → fallback to other executable provider.
  if (cap === 'music_generation') {
    // Parse structured music payload from metadata; fall back to raw input as theme
    const meta = request.metadata ?? {}
    const rawGenres = Array.isArray(meta.genres) ? (meta.genres as string[]) : ['pop']
    const rawVocal = typeof meta.vocalType === 'string' ? meta.vocalType : 'female'
    const rawMoods = Array.isArray(meta.moods) ? (meta.moods as string[]) : []
    const musicPayload: MusicCapabilityPayload = {
      theme: (typeof meta.theme === 'string' && meta.theme.trim()) ? meta.theme.trim() : request.input,
      genres: rawGenres as MusicCapabilityPayload['genres'],
      vocalType: rawVocal as MusicCapabilityPayload['vocalType'],
      moods: rawMoods.length > 0 ? rawMoods as MusicCapabilityPayload['moods'] : undefined,
      duration: typeof meta.duration === 'number' ? meta.duration : 180,
      bpm: typeof meta.bpm === 'number' ? meta.bpm : undefined,
      language: typeof meta.language === 'string' ? meta.language : undefined,
      explicit: typeof meta.explicit === 'boolean' ? meta.explicit : false,
      lyrics: typeof meta.lyrics === 'string' && meta.lyrics.trim() ? meta.lyrics.trim() : undefined,
      referenceStyle: typeof meta.referenceStyle === 'string' ? meta.referenceStyle : undefined,
      productionNotes: typeof meta.productionNotes === 'string' ? meta.productionNotes : undefined,
      title: typeof meta.title === 'string' ? meta.title : undefined,
    }

    // Validate before touching any provider
    const validationError = validateMusicPayload(musicPayload)
    if (validationError) {
      logExecution(cap, null, null, false, false, validationError)
      return { success: false, capability: cap, provider: null, model: null, outputType: 'audio', output: null, fallbackUsed: false, error: validationError }
    }

    // Build the provider prompt (lyrics, style traits, vocal description)
    const musicPrompt = buildMusicProviderPrompt(musicPayload)

    // Shared metadata returned on every success path
    const musicMeta = (generationMode: 'full_song' | 'segment', provider: string, model: string): Record<string, unknown> => ({
      provider,
      model,
      requestedDuration: musicPrompt.duration,
      generationMode,
      genres: musicPayload.genres,
      vocalType: musicPayload.vocalType,
      lyricsMode: musicPrompt.lyricsMode,
      ...(musicPrompt.generatedLyrics ? { generatedLyrics: musicPrompt.generatedLyrics } : {}),
    })

    // Resolve runtime-selected primary provider
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    // ── Attempt order: try primary provider, then fallback ──────────────────

    // Helper: try GenX Lyria
    const tryGenX = async (fallbackUsed: boolean): Promise<CapabilityResponse | null> => {
      const audioModel = (!resolvedModel || resolvedModel.modelId === 'auto')
        ? GENX_AUDIO_MODELS[0]
        : resolvedModel.modelId

      const res = await tryGenXMedia(musicPrompt.prompt, 'audio', audioModel, {
        duration: musicPrompt.duration,
        ...musicPrompt.params,
      })

      if (res.success && res.url) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.url, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, fallbackUsed, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'audio', output: res.url, artifactId, fallbackUsed, fallbackReason: fallbackUsed ? 'HuggingFace music failed' : undefined, metadata: musicMeta('full_song', 'genx', res.model) }
      }
      if (res.success && res.jobId) {
        logExecution(cap, 'genx', res.model, fallbackUsed, false, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'audio', output: null, jobId: res.jobId, status: res.status, fallbackUsed, fallbackReason: fallbackUsed ? 'HuggingFace music failed' : undefined, metadata: musicMeta('full_song', 'genx', res.model) }
      }
      return null // failed — let caller decide fallback
    }

    // Helper: try HuggingFace — iterates the full HF music catalog (full-song → segment)
    const tryHF = async (fallbackUsed: boolean): Promise<CapabilityResponse | null> => {
      const hfKey = await getVaultApiKey('huggingface')
      if (!hfKey) return null

      const hasLyrics = musicPrompt.lyricsMode !== 'instrumental'
      const hfRes = await executeHFMusicGeneration(musicPrompt.prompt, musicPrompt.duration, hfKey, hasLyrics)
      if (!hfRes.success) return null

      const audioOutput = hfRes.audioDataUrl ?? hfRes.audioUrl
      if (!audioOutput && !hfRes.jobId) return null

      const output = audioOutput ?? null
      let artifactId: string | undefined
      if (save && output) artifactId = await maybeSaveArtifact(cap, output, 'huggingface', hfRes.model, appSlug, request.traceId)
      logExecution(cap, 'huggingface', hfRes.model, fallbackUsed, !!artifactId, null)
      return {
        success: true,
        capability: cap,
        provider: 'huggingface',
        model: hfRes.model,
        outputType: 'audio',
        output,
        ...(hfRes.jobId ? { jobId: hfRes.jobId, status: 'processing' as const } : {}),
        artifactId,
        fallbackUsed,
        fallbackReason: fallbackUsed ? 'GenX music failed' : undefined,
        metadata: musicMeta(hfRes.generationMode as 'full_song' | 'segment', 'huggingface', hfRes.model),
      }
    }

    // Determine execution order based on resolved primary provider
    const primaryIsHF = resolvedModel?.providerKey === 'huggingface'
    const primaryIsGenX = !resolvedModel || resolvedModel.providerKey === 'genx'

    let result: CapabilityResponse | null = null
    let primaryError = ''
    let secondaryError = ''

    if (primaryIsHF) {
      // HF primary, GenX fallback
      result = await tryHF(false)
      if (!result) {
        const hfKey = await getVaultApiKey('huggingface')
        primaryError = hfKey ? 'HuggingFace MusicGen returned no audio' : 'HuggingFace API key not configured'
        result = await tryGenX(true)
        if (!result) secondaryError = 'GenX music generation also failed'
      }
    } else {
      // GenX primary (default), HF fallback
      if (primaryIsGenX) {
        result = await tryGenX(false)
        if (!result) {
          primaryError = 'GenX music generation returned no audio URL and no job ID'
          result = await tryHF(true)
          if (!result) {
            const hfKey = await getVaultApiKey('huggingface')
            secondaryError = hfKey ? 'HuggingFace MusicGen also failed or returned no audio' : 'HuggingFace API key not configured'
          }
        }
      } else {
        primaryError = `Resolved provider "${resolvedModel?.providerKey}" does not support real music audio generation`
      }
    }

    if (result) return result

    // Both providers failed — return clear error
    const finalError = [primaryError, secondaryError].filter(Boolean).join('; ') ||
      'No music provider could generate audio. Configure GenX (Lyria quota) or HuggingFace (MusicGen).'
    logExecution(cap, null, null, false, false, finalError)
    return { success: false, capability: cap, provider: null, model: null, outputType: 'audio', output: null, fallbackUsed: false, error: finalError }
  }

  // ── Lyrics generation (registry-driven) ─────────────────────────────────────
  if (cap === 'lyrics_generation') {
    const systemPrompt = 'You are a professional songwriter. Generate creative, original song lyrics with verse/chorus/bridge structure.'

    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXChat(request.input, resolvedModel.modelId, systemPrompt)
      if (res.success && res.output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'text', output: res.output, artifactId, fallbackUsed: false }
      }
    }

    const fallback = await tryFallbackText(`${systemPrompt}\n\n${request.input}`)
    if (fallback.success && fallback.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
      logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
      return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'text', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable' }
    }
    logExecution(cap, null, null, true, false, 'Lyrics generation failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'text', output: null, fallbackUsed: true, error: 'All providers failed for lyrics generation.' }
  }

  // ── TTS / voice response (registry-driven) ────────────────────────────────
  if (cap === 'tts' || cap === 'voice_response') {
    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXMedia(request.input, 'audio', resolvedModel.modelId)
      if (res.success && res.url) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.url, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'audio', output: res.url, artifactId, fallbackUsed: false }
      }
      if (res.success && res.jobId) {
        logExecution(cap, 'genx', res.model, false, false, null)
        return {
          success: true,
          capability: cap,
          provider: 'genx',
          model: res.model,
          outputType: 'audio',
          output: null,
          jobId: res.jobId,
          status: res.status,
          fallbackUsed: false,
        }
      }
    }

    logExecution(cap, null, null, false, false, 'No TTS provider via capability router')
    return {
      success: false,
      capability: cap,
      provider: null,
      model: null,
      outputType: 'audio',
      output: null,
      fallbackUsed: false,
      error: 'TTS via the capability router requires GenX. Use /api/brain/tts for the full provider chain.',
    }
  }

  // ── STT ───────────────────────────────────────────────────────────────────
  if (cap === 'stt') {
    logExecution(cap, null, null, false, false, 'STT requires audio file input')
    return {
      success: false,
      capability: cap,
      provider: null,
      model: null,
      outputType: 'text',
      output: null,
      fallbackUsed: false,
      error: 'STT requires a multipart audio file. Use /api/brain/stt directly.',
    }
  }

  // ── Research (registry-driven) ──────────────────────────────────────────────
  if (cap === 'research') {
    const systemPrompt = 'You are a research assistant. Provide comprehensive, factual, well-structured research.'

    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXChat(request.input, resolvedModel.modelId, systemPrompt)
      if (res.success && res.output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'markdown', output: res.output, artifactId, fallbackUsed: false }
      }
    }

    const fallback = await tryFallbackText(`${systemPrompt}\n\n${request.input}`)
    if (fallback.success && fallback.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
      logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
      return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'markdown', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable' }
    }
    logExecution(cap, null, null, true, false, 'Research failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'text', output: null, fallbackUsed: true, error: 'All providers failed for research.' }
  }

  // ── Code / repo_edit / app_build (registry-driven) ─────────────────────────
  if (cap === 'code' || cap === 'repo_edit' || cap === 'app_build') {
    const systemPrompt =
      cap === 'repo_edit' ? 'You are an expert software engineer. Provide precise code edits and file diffs.'
      : cap === 'app_build' ? 'You are a full-stack app builder. Generate complete, production-ready application code.'
      : 'You are an expert software engineer. Write clean, well-documented code.'

    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXChat(request.input, resolvedModel.modelId, systemPrompt)
      if (res.success && res.output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'code', output: res.output, artifactId, fallbackUsed: false }
      }
    }

    const fallback = await tryFallbackText(`${systemPrompt}\n\n${request.input}`)
    if (fallback.success && fallback.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
      logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
      return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'code', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable' }
    }
    logExecution(cap, null, null, true, false, 'Code generation failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'code', output: null, fallbackUsed: true, error: 'All providers failed for code generation.' }
  }

  // ── Deploy plan (registry-driven) ──────────────────────────────────────────
  if (cap === 'deploy_plan') {
    const systemPrompt = 'You are a DevOps architect. Generate a detailed deployment plan with infrastructure specs, environment setup, and rollout steps.'

    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXChat(request.input, resolvedModel.modelId, systemPrompt)
      if (res.success && res.output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'markdown', output: res.output, artifactId, fallbackUsed: false }
      }
    }

    const fallback = await tryFallbackText(`${systemPrompt}\n\n${request.input}`)
    if (fallback.success && fallback.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
      logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
      return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'markdown', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable' }
    }
    logExecution(cap, null, null, true, false, 'Deploy plan failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'text', output: null, fallbackUsed: true, error: 'All providers failed for deploy plan generation.' }
  }

  // ── File analysis (registry-driven) ────────────────────────────────────────
  if (cap === 'file_analysis') {
    const systemPrompt = 'You are a document analyst. Analyze and summarize the provided content, extracting key insights.'
    const inputWithFiles = request.files?.length
      ? `${request.input}\n\nFiles: ${request.files.join(', ')}`
      : request.input

    // Resolve best model from registry
    const resolvedModel = await resolveBestModel({
      capability: cap,
      provider: request.providerOverride,
    })

    if (resolvedModel && resolvedModel.providerKey === 'genx') {
      const res = await tryGenXChat(inputWithFiles, resolvedModel.modelId, systemPrompt)
      if (res.success && res.output) {
        let artifactId: string | undefined
        if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
        logExecution(cap, 'genx', res.model, false, !!artifactId, null)
        return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'text', output: res.output, artifactId, fallbackUsed: false }
      }
    }

    const fallback = await tryFallbackText(`${systemPrompt}\n\n${inputWithFiles}`)
    if (fallback.success && fallback.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
      logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
      return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'text', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable' }
    }
    logExecution(cap, null, null, true, false, 'File analysis failed')
    return { success: false, capability: cap, provider: null, model: null, outputType: 'text', output: null, fallbackUsed: true, error: 'All providers failed for file analysis.' }
  }

  // ── Chat (default, registry-driven) ───────────────────────────────────────
  // Classify the task for complexity and execution mode (merged from orchestrator)
  const classification = classifyTaskComplexity(
    request.metadata?.appCategory as string ?? 'generic',
    cap,
    request.input,
  )

  const warnings: string[] = []

  // Resolve best model from registry
  const resolvedModel = await resolveBestModel({
    capability: cap,
    provider: request.providerOverride,
  })

  if (resolvedModel && resolvedModel.providerKey === 'genx') {
    const res = await tryGenXChat(request.input, resolvedModel.modelId)
    if (res.success && res.output) {
      let artifactId: string | undefined
      if (save) artifactId = await maybeSaveArtifact(cap, res.output, 'genx', res.model, appSlug, request.traceId)
      const confidence = computeConfidenceScore({ providerHealth: 'healthy', fallbackUsed: false, validationPassed: null, warnings })
      try { recordPerformance({ modelId: res.model, provider: 'genx', taskType: cap, success: true, latencyMs: 0, confidence, costEstimate: 0.001, timestamp: Date.now() }) } catch { /* fire-and-forget */ }
      logExecution(cap, 'genx', res.model, false, !!artifactId, null)
      return { success: true, capability: cap, provider: 'genx', model: res.model, outputType: 'text', output: res.output, artifactId, fallbackUsed: false, confidenceScore: confidence, executionMode: 'direct', classification, routingReason: `GenX primary — capability: ${cap}` }
    }
  }

  const fallback = await tryFallbackText(request.input)
  if (fallback.success && fallback.output) {
    let artifactId: string | undefined
    if (save) artifactId = await maybeSaveArtifact(cap, fallback.output, fallback.provider, fallback.model, appSlug, request.traceId)
    warnings.push('GenX unavailable — used fallback provider')
    const confidence = computeConfidenceScore({ providerHealth: 'configured', fallbackUsed: true, validationPassed: null, warnings })
    try { recordPerformance({ modelId: fallback.model ?? 'unknown', provider: fallback.provider ?? 'unknown', taskType: cap, success: true, latencyMs: 0, confidence, costEstimate: 0.001, timestamp: Date.now() }) } catch { /* fire-and-forget */ }
    logExecution(cap, fallback.provider, fallback.model, true, !!artifactId, null)
    return { success: true, capability: cap, provider: fallback.provider, model: fallback.model, outputType: 'text', output: fallback.output, artifactId, fallbackUsed: true, fallbackReason: 'GenX unavailable', confidenceScore: confidence, executionMode: 'direct', classification, routingReason: `Fallback — GenX unavailable, used ${fallback.provider}` }
  }

  try { recordPerformance({ modelId: resolvedModel?.modelId ?? 'unknown', provider: 'genx', taskType: cap, success: false, latencyMs: 0, confidence: 0, costEstimate: 0, timestamp: Date.now() }) } catch { /* fire-and-forget */ }
  logExecution(cap, null, null, true, false, 'All providers failed')
  return {
    success: false,
    capability: cap,
    provider: null,
    model: null,
    outputType: 'text',
    output: null,
    fallbackUsed: true,
    error: 'All providers failed. Please configure at least one AI provider (GenX, Groq, Together, HuggingFace, or MiMo).',
    confidenceScore: null,
    executionMode: 'direct',
    classification,
  }
}
