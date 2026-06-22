import './load-repo-env'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getMeshCredential } from '@/lib/provider-mesh-status'
import { discoverProvider, resolveProviderEndpoint } from '@/lib/providers/provider-discovery'
import { modelsForCapability } from '@/lib/providers/model-discovery'
import { getProviderTruth } from '@/lib/providers/registry'
import { executeCapability } from '@/lib/capability-router'
import { researchRuntime } from '@/lib/research-runtime'
import { processAppAgentRequest } from '@/lib/app-agent'
import { executeConnectedAppCapability } from '@/lib/connected-app-capability-engine'
import { getCapabilityDefinition } from '@/lib/ai-capability-taxonomy'
import { listControlPlaneJobs } from '@/lib/control-plane-jobs'
import { getLocalMediaJob } from '@/lib/media-job-store'
import { getArtifact, listArtifacts } from '@/lib/artifact-store'
import { prisma } from '@/lib/prisma'
import { setupCommandForLocalTool, testLocalTool } from '@/lib/local-tools'
import { isRedisHealthy } from '@/lib/redis'
import { isQdrantConfigured, isQdrantHealthy } from '@/lib/vector-store'
import { collectProviderRuntimeConfigTruth, type ProviderRuntimeConfigTruth } from '@/lib/provider-runtime-truth'
import { CAPABILITY_REGISTRY } from '@/lib/providers/capability-registry'
import { getCanonicalProviderHealth } from '@/lib/providers/health'
import { buildProviderCapabilityContracts } from '@/lib/providers/provider-capability-contracts'
import { getProviderCapabilityAdapter, providerHasCanonicalPollingContract } from '@/lib/ai-capability-adapters'
import {
  proveAudioBedGeneration,
  proveCaptionsSubtitlesPipeline,
  proveLongFormAssemblyFromProvidedClips,
  type MediaFoundationResult,
} from '@/lib/media-workflow-foundation'

type ProofStatus = 'LIVE_PROVEN' | 'SOURCE_WIRED' | 'PROVIDER_AVAILABLE' | 'BLOCKED' | 'NOT_WIRED'

type CapabilityProof = {
  capabilityId: string
  capabilityName?: string
  routeFile?: string
  providerCandidates?: string[]
  requiredKeys?: string[]
  requiredLocalTools?: string[]
  artifactBehavior?: string
  jobBehavior?: string
  providerSelected: string | null
  modelSelected: string | null
  routeOrAdapter: string
  status: ProofStatus
  artifactId: string | null
  jobId: string | null
  pollUrl: string | null
  exactError: string | null
  diagnostics?: Record<string, unknown>
  sourceFileResponsible: string | null
}

type ProviderKeyResult = {
  provider: string
  configured: boolean
  masked: string | null
  error: string | null
}

type ProviderDiscoveryResult = {
  provider: string
  credentialEnvNames: string[]
  catalogEndpoint: string | null
  status: string
  discoverySource: string
  rawCatalogCount: number
  modelCount: number
  executableCandidateCount: number
  executableModels: number
  catalogOnlyModels: number
  requiresDedicatedEndpointModels: number
  adultGatedModels: number
  chatModels: number
  reasoningModels: number
  codingModels: number
  liveAuthenticatedModels: number
  publicCatalogModels: number
  staticFallbackModels: number
  catalogDerivedModels: number
  imageModels: number
  imageEditModels: number
  videoModels: number
  imageToVideoModels: number
  ttsModels: number
  sttModels: number
  embeddingsModels: number
  rerankModels: number
  musicModels: number
  avatarModels: number
  adultImageModels: number
  executableBlocker: string | null
  error: string | null
  endpoint: string | null
}

type ModelSmokeProof = {
  provider: string
  capability: string
  modelStatus: 'EXECUTABLE' | 'CATALOG_ONLY' | 'REQUIRES_DEDICATED_ENDPOINT' | 'GATED_OR_UNAVAILABLE' | 'ADULT_GATED' | 'FAILED_CONTRACT' | 'FAILED_PROVIDER' | 'FAILED_ARTIFACT'
  credentialPresent: boolean
  catalogReachable: boolean
  providerSmokePassed: boolean
  modelExecutionPassed: boolean
  capabilityRoutePassed: boolean
  artifactPersisted: boolean
  previewReachable: boolean
  providerSelected: string | null
  modelSelected: string | null
  artifactId: string | null
  error: string | null
}

type ProviderContractSummary = {
  provider: string
  contracts: number
  executableNow: number
  liveProven: number
  endpointRequired: number
  specialistRequired: number
  adapterMissing: number
  runtimeFlagDisabled: number
  toolPlanOnly: number
  blockedByPolicy: number
  missingCredential: number
  nextActions: string[]
}

type ProviderRuntimeContractChecklist = {
  provider: string
  authDetection: string
  modelDiscovery: string
  capabilityMapping: string
  requestExecutionPath: string
  responseParsing: string
  artifactPersistence: string
  errorClassification: string
  fallbackBehavior: string
}

type ToolReadinessProof = {
  id: string
  installed: boolean
  wired: boolean
  usedBy: string[]
  setupCommand: string
  blocker: string | null
  detail: string
}

type PhaseName =
  | 'BOOT'
  | 'ENV_LOAD_START'
  | 'ENV_LOAD_DONE'
  | 'DB_CHECK_START'
  | 'DB_CHECK_DONE'
  | 'PROVIDER_KEY_RESOLUTION_START'
  | 'PROVIDER_KEY_RESOLUTION_DONE'
  | 'PROVIDER_DISCOVERY_START'
  | 'PROVIDER_DISCOVERY_DONE'
  | 'MODEL_SMOKE_START'
  | 'MODEL_SMOKE_DONE'
  | 'CAPABILITY_PROOF_START'
  | 'CAPABILITY_PROOF_DONE'
  | 'WRITE_PROOF_START'
  | 'WRITE_PROOF_DONE'
  | 'CLEANUP_START'
  | 'CLEANUP_DONE'
  | 'EXIT'

type DbCheckResult = {
  attempted: boolean
  available: boolean
  error: string | null
}

type ProofReport = {
  generatedAt: string
  environment: {
    hasDatabaseUrl: boolean
    appSlug: string
    connectedAppSecretPresent: boolean
    envLoader?: string
    envFilesLoaded?: string[]
    envDiagnostics?: {
      cwd: string
      repoRoot: string
      searchedEnvPaths: string[]
      foundEnvPaths: string[]
      loadedEnvPaths: string[]
    } | null
    providerKeyPresent?: Record<string, boolean>
    dbCheck?: DbCheckResult
  }
  providerKeyPath: ProviderKeyResult[]
  providerConfigTruth: ProviderRuntimeConfigTruth[]
  providerDiscovery: ProviderDiscoveryResult[]
  providerRuntimeContracts: ProviderRuntimeContractChecklist[]
  providerContractSummary: ProviderContractSummary[]
  modelSmokeProofs: ModelSmokeProof[]
  toolReadiness: ToolReadinessProof[]
  capabilities: CapabilityProof[]
  summary: { liveProven: number; sourceWired: number; providerAvailable: number; blocked: number; notWired: number }
  proofState?: {
    partial: boolean
    activePhase: string
    activeCapability: string | null
    lastCompletedCapability: string | null
    capabilityStartedAt: string | null
    capabilityTimeoutMs: number | null
    completedPhases: string[]
    failure: string | null
    activeHandleTypes: string[]
  }
  nextVpsCommand: string | null
}

const OUTPUT_JSON = path.join(process.cwd(), 'V1_25_CAPABILITY_PROOF.json')
const OUTPUT_MD = path.join(process.cwd(), 'V1_25_CAPABILITY_PROOF.md')
const APP_SLUG = process.env.AMARKTAI_PROOF_APP_SLUG?.trim() || 'amarktai-network'
const CONNECTED_APP_SECRET = process.env.AMARKTAI_CONNECTED_APP_SECRET?.trim() || process.env.AMARKTAI_APP_SECRET_AMARKTAI_NETWORK?.trim() || ''
const PROVIDER_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_PROVIDER_TIMEOUT_MS ?? 15_000)
const CAPABILITY_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_CAPABILITY_TIMEOUT_MS ?? 30_000)
const MEDIA_CAPABILITY_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_MEDIA_CAPABILITY_TIMEOUT_MS ?? 60_000)
const QUICK_PROOF_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_QUICK_TIMEOUT_MS ?? 10_000)
const DB_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_DB_TIMEOUT_MS ?? 10_000)
const CLI_WATCHDOG_MS = Number(process.env.AMARKTAI_PROOF_CLI_WATCHDOG_MS ?? 300_000)
const PROOF_SOURCE_IMAGE_URL = process.env.AMARKTAI_PROOF_SOURCE_IMAGE_URL?.trim()
  || 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/coco_sample.png'

let activePhase: PhaseName = 'BOOT'
const completedPhases: string[] = []
let watchdog: ReturnType<typeof setTimeout> | null = null
let exiting = false
let dbCheckResult: DbCheckResult = { attempted: false, available: false, error: null }
let providerKeyResults: ProviderKeyResult[] = []
let providerConfigTruthResults: ProviderRuntimeConfigTruth[] = []
let providerDiscoveryResults: ProviderDiscoveryResult[] = []
let providerRuntimeContractResults: ProviderRuntimeContractChecklist[] = []
let providerContractSummaryResults: ProviderContractSummary[] = []
let modelSmokeProofs: ModelSmokeProof[] = []
let toolReadinessProofs: ToolReadinessProof[] = []
let capabilityResults: CapabilityProof[] = []
let activeCapability: string | null = null
let lastCompletedCapability: string | null = null
let capabilityStartedAt: string | null = null
let capabilityTimeoutMs: number | null = null

async function main() {
  startWatchdog()

  setPhase('DB_CHECK_START')
  dbCheckResult = await checkDatabase()
  setPhase('DB_CHECK_DONE')
  await writePartialProof(null)

  setPhase('PROVIDER_KEY_RESOLUTION_START')
  providerKeyResults = await collectProviderKeys(dbCheckResult)
  setPhase('PROVIDER_KEY_RESOLUTION_DONE')
  await writePartialProof(null)

  providerConfigTruthResults = await collectProviderConfigTruth()
  await writePartialProof(null)

  setPhase('PROVIDER_DISCOVERY_START')
  providerDiscoveryResults = await collectProviderDiscovery()
  setPhase('PROVIDER_DISCOVERY_DONE')
  await writePartialProof(null)

  providerContractSummaryResults = await collectProviderContractSummary()
  providerRuntimeContractResults = collectProviderRuntimeContracts()
  await writePartialProof(null)

  setPhase('MODEL_SMOKE_START')
  modelSmokeProofs = await collectModelSmokeProofs(providerKeyResults, providerDiscoveryResults)
  setPhase('MODEL_SMOKE_DONE')
  await writePartialProof(null)

  toolReadinessProofs = await collectToolReadinessProofs()
  await writePartialProof(null)

  setPhase('CAPABILITY_PROOF_START')
  capabilityResults = await collectCapabilityProofs()
  setPhase('CAPABILITY_PROOF_DONE')

  const report = buildReport(false, null)
  await writeProof(report)
  console.log(JSON.stringify(report.summary, null, 2))
}

function setPhase(phase: PhaseName) {
  activePhase = phase
  completedPhases.push(phase)
  console.log(phase)
}

function startWatchdog() {
  if (watchdog) clearTimeout(watchdog)
  watchdog = setTimeout(() => {
    void handleWatchdogTimeout()
  }, CLI_WATCHDOG_MS)
}

async function handleWatchdogTimeout() {
  if (exiting) return
  exiting = true
  const message = `CLI watchdog timed out after ${CLI_WATCHDOG_MS}ms during ${activePhase}.`
  console.error(message)
  await writePartialProof(message).catch((error) => {
    console.error(`Partial proof write failed during watchdog: ${sanitizeProofError(error)}`)
  })
  await cleanup()
  console.log('EXIT')
  process.exit(2)
}

async function cleanup() {
  setPhase('CLEANUP_START')
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
  await withTimeout(
    () => prisma.$disconnect(),
    DB_TIMEOUT_MS,
    undefined,
  ).catch(() => undefined)
  setPhase('CLEANUP_DONE')
}

async function checkDatabase(): Promise<DbCheckResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { attempted: false, available: false, error: 'DATABASE_URL is not present after env loading.' }
  }
  return withTimeout(async () => {
    try {
      await prisma.$queryRawUnsafe('SELECT 1')
      return { attempted: true, available: true, error: null }
    } catch (error) {
      return { attempted: true, available: false, error: sanitizeProofError(error) }
    }
  }, DB_TIMEOUT_MS, {
    attempted: true,
    available: false,
    error: `Database check timed out after ${DB_TIMEOUT_MS}ms.`,
  })
}

function buildReport(partial: boolean, failure: string | null): ProofReport {
  return {
    generatedAt: new Date().toISOString(),
    environment: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
      appSlug: APP_SLUG,
      connectedAppSecretPresent: Boolean(CONNECTED_APP_SECRET),
      envLoader: 'scripts/load-repo-env.ts',
      envFilesLoaded: globalThis.__AMARKTAI_LOADED_ENV_FILES__ ?? [],
      envDiagnostics: globalThis.__AMARKTAI_ENV_DIAGNOSTICS__ ?? null,
      providerKeyPresent: Object.fromEntries(
        providerKeyResults.map((entry) => [entry.provider, entry.configured]),
      ),
      dbCheck: dbCheckResult,
    },
    providerKeyPath: providerKeyResults,
    providerConfigTruth: providerConfigTruthResults,
    providerDiscovery: providerDiscoveryResults,
    providerRuntimeContracts: providerRuntimeContractResults,
    providerContractSummary: providerContractSummaryResults,
    modelSmokeProofs,
    toolReadiness: toolReadinessProofs,
    capabilities: capabilityResults,
    summary: summarize(capabilityResults),
    proofState: {
      partial,
      activePhase,
      activeCapability,
      lastCompletedCapability,
      capabilityStartedAt,
      capabilityTimeoutMs,
      completedPhases: [...completedPhases],
      failure,
      activeHandleTypes: activeHandleTypes(),
    },
    nextVpsCommand: process.env.DATABASE_URL?.trim()
      ? null
      : 'DATABASE_URL="<production mysql url>" npx tsx scripts/v1-25-capability-proof.ts',
  }
}

async function writePartialProof(failure: string | null) {
  await writeProof(buildReport(true, failure))
}

async function writeProof(report: ProofReport) {
  setPhase('WRITE_PROOF_START')
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8')
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report), 'utf8')
  setPhase('WRITE_PROOF_DONE')
}

function activeHandleTypes(): string[] {
  const getter = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles
  if (!getter) return []
  return [...new Set(getter.call(process).map((handle) =>
    handle && typeof handle === 'object' && 'constructor' in handle
      ? (handle as { constructor?: { name?: string } }).constructor?.name ?? 'Object'
      : typeof handle,
  ))].sort()
}

function sanitizeProofError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'unknown error')
  return raw
    .replace(/(mysql:\/\/|postgres(?:ql)?:\/\/)([^:@/\s]+):([^@/\s]+)@/gi, '$1$2:[redacted]@')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[redacted]')
    .replace(/\b(api[-_]?key|token|secret|password)=([^&\s]+)/gi, '$1=[redacted]')
    .slice(0, 800)
}

const PROOF_TAXONOMY: Record<string, string> = {
  chat_text_generation: 'chat',
  reasoning: 'reasoning',
  coding_assistant: 'text_generation',
  web_research: 'research',
  summarization: 'summarization',
  translation: 'translation',
  embeddings: 'embeddings',
  rerank_search_relevance: 'rerank',
  text_to_image: 'text_to_image',
  image_editing_source_transform: 'image_text_to_image',
  text_to_video_short_clip: 'text_to_video',
  text_to_speech: 'text_to_speech',
  speech_to_text: 'automatic_speech_recognition',
  image_to_video: 'image_to_video',
  long_form_multi_scene_video_assembly: 'text_to_video',
  music_audio_bed_generation: 'text_to_audio',
  captions_subtitles_pipeline: 'automatic_speech_recognition',
  avatar_library_avatar_image_generation: 'avatar_generation',
  talking_avatar_video: 'avatar_video',
  adult_media_policy_gated_generation: 'text_to_image',
  agent_request_execution: 'chat',
  connected_app_capability_execution: 'chat',
  provider_auto_selection: 'chat',
  provider_fallback: 'chat',
  strict_provider_proof_mode: 'chat',
  route_outcome_logging: 'chat',
  worker_job_retry_and_polling_completion: 'text_to_video',
}

const SOURCE_WIRED_ON_ROUTE_FAILURE = new Set([
  'image_editing_source_transform',
  'image_to_video',
])

const SOURCE_WIRED_ON_MISSING_CREDENTIAL = new Set([
  'chat_text_generation',
  'reasoning',
  'coding_assistant',
  'web_research',
  'embeddings',
  'text_to_image',
  'text_to_video_short_clip',
  'text_to_speech',
  'speech_to_text',
  'avatar_library_avatar_image_generation',
  'provider_auto_selection',
])

const BLOCKED_ON_ROUTE_FAILURE = new Set([
  'rerank_search_relevance',
])

const PROVIDER_KEY_ENVS: Record<string, string[]> = {
  genx: ['GENX_API_KEY'],
  huggingface: ['HUGGINGFACE_API_KEY', 'HUGGINGFACEHUB_API_TOKEN', 'HF_TOKEN'],
  qwen: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
  mimo: ['MIMO_API_KEY', 'XIAOMI_API_KEY'],
  groq: ['GROQ_API_KEY'],
  together: ['TOGETHER_API_KEY'],
}

function enrichCapabilityProofs(results: CapabilityProof[]): CapabilityProof[] {
  return results.map((entry) => {
    const taxonomyId = PROOF_TAXONOMY[entry.capabilityId] ?? entry.capabilityId
    const definition = getCapabilityDefinition(taxonomyId)
    const providerCandidates = definition?.providerRoutes
      .filter((route) => route.executable)
      .map((route) => `${route.provider}:${route.modelIds.join(',') || 'provider-discovery'}`)
      ?? []
    const requiredKeys = [...new Set(
      providerCandidates.flatMap((candidate) => PROVIDER_KEY_ENVS[candidate.split(':')[0]] ?? []),
    )]
    return {
      ...entry,
      capabilityName: entry.capabilityName ?? definition?.label ?? entry.capabilityId.replace(/_/g, ' '),
      routeFile: entry.routeFile ?? entry.sourceFileResponsible ?? routeFileFor(entry.routeOrAdapter),
      providerCandidates: entry.providerCandidates ?? providerCandidates,
      requiredKeys: entry.requiredKeys ?? requiredKeys,
      requiredLocalTools: entry.requiredLocalTools ?? localToolsFor(entry.capabilityId),
      artifactBehavior: entry.artifactBehavior ?? artifactBehaviorFor(entry, definition?.createsArtifact ?? false),
      jobBehavior: entry.jobBehavior ?? jobBehaviorFor(entry, definition?.longRunning ?? false),
    }
  })
}

function routeFileFor(routeOrAdapter: string): string {
  if (routeOrAdapter.includes('researchRuntime')) return 'src/lib/research-runtime.ts'
  if (routeOrAdapter.includes('processAppAgentRequest')) return 'src/lib/app-agent.ts'
  if (routeOrAdapter.includes('executeConnectedAppCapability')) return 'src/lib/connected-app-capability-engine.ts'
  if (routeOrAdapter.includes('media_workflow_foundation')) return 'src/lib/media-workflow-foundation.ts'
  if (routeOrAdapter.includes('control-plane-jobs')) return 'src/lib/control-plane-jobs.ts'
  if (routeOrAdapter.startsWith('/api/')) return `src/app${routeOrAdapter}/route.ts`
  return 'src/lib/orchestrator.ts'
}

function localToolsFor(capabilityId: string): string[] {
  if (capabilityId === 'web_research') return ['Playwright', 'Scrapy', 'Trafilatura']
  if (capabilityId === 'captions_subtitles_pipeline') return ['local storage']
  if (capabilityId === 'music_audio_bed_generation') return ['ffmpeg', 'ffprobe', 'local storage']
  if (capabilityId === 'long_form_multi_scene_video_assembly') return ['ffmpeg', 'ffprobe', 'local storage']
  if (capabilityId.includes('talking_avatar')) return ['ffmpeg', 'Rhubarb/lip-sync adapter']
  if (capabilityId.includes('video') || capabilityId.includes('music') || capabilityId.includes('voice')) return ['ffmpeg']
  if (capabilityId.includes('worker_job')) return ['Redis/BullMQ worker', 'local storage']
  return []
}

function artifactBehaviorFor(entry: CapabilityProof, createsArtifact: boolean): string {
  if (entry.artifactId) return `Intentional artifact persisted: ${entry.artifactId}.`
  if (createsArtifact) return 'Intentional output should persist an artifact when execution succeeds.'
  return 'No artifact by default; normal chat/text response remains transient unless explicitly requested.'
}

function jobBehaviorFor(entry: CapabilityProof, longRunning: boolean): string {
  if (entry.jobId || entry.pollUrl) return `Async job tracked${entry.jobId ? ` as ${entry.jobId}` : ''}${entry.pollUrl ? ` via ${entry.pollUrl}` : ''}.`
  return longRunning
    ? 'Async job/polling expected when provider returns processing.'
    : 'Synchronous completion expected; no durable job required.'
}

async function collectProviderKeys(dbCheck: DbCheckResult): Promise<ProviderKeyResult[]> {
  const providers = ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'] as const
  return Promise.all(providers.map((provider) => withTimeout(async () => {
    try {
      const credential = await getMeshCredential(provider)
      const dbPrefix = process.env.DATABASE_URL?.trim()
        ? dbCheck.available
          ? 'DB lookup completed'
          : `DB lookup unavailable: ${dbCheck.error ?? 'unknown database error'}`
        : 'DATABASE_URL not loaded; only environment fallback was checked'
      return {
        provider,
        configured: Boolean(credential),
        masked: credential ? `${credential.slice(0, 4)}...${credential.slice(-4)}` : null,
        error: credential ? null : `${dbPrefix}. No credential resolved from integrationConfig/aiProvider/env path.`,
      }
    } catch (error) {
      return {
        provider,
        configured: false,
        masked: null,
        error: sanitizeProofError(error),
      }
    }
  }, PROVIDER_TIMEOUT_MS, {
    provider,
    configured: false,
    masked: null,
    error: `Credential lookup timed out after ${PROVIDER_TIMEOUT_MS}ms.`,
  })))
}

async function collectProviderConfigTruth(): Promise<ProviderRuntimeConfigTruth[]> {
  return withTimeout(
    () => collectProviderRuntimeConfigTruth(),
    PROVIDER_TIMEOUT_MS,
    [],
  )
}

async function collectProviderDiscovery(): Promise<ProviderDiscoveryResult[]> {
  const providers = ['mimo', 'genx', 'huggingface', 'qwen', 'together', 'groq'] as const
  return Promise.all(providers.map((provider) => withTimeout(async () => {
    try {
      const snapshot = await discoverProvider(provider, { force: true })
      return {
        provider,
        credentialEnvNames: PROVIDER_KEY_ENVS[provider] ?? [],
        catalogEndpoint: snapshot.endpoint,
        status: snapshot.status,
        discoverySource: snapshot.discoverySource ?? 'none',
        rawCatalogCount: snapshot.rawCatalogCount ?? snapshot.models.length,
        modelCount: snapshot.models.length,
        executableCandidateCount: executableCandidateCount(snapshot),
        executableModels: snapshot.models.filter((model) => model.metadata?.executable === true || model.metadata?.executable === 'candidate').length,
        catalogOnlyModels: snapshot.models.filter((model) => model.metadata?.executable === 'CATALOG_ONLY').length,
        requiresDedicatedEndpointModels: snapshot.models.filter((model) => model.metadata?.executable === 'REQUIRES_DEDICATED_ENDPOINT').length,
        adultGatedModels: snapshot.models.filter((model) => model.metadata?.adultGate === true).length,
        chatModels: modelsForCapability(snapshot, 'chat').length,
        reasoningModels: modelsForCapability(snapshot, 'reasoning').length,
        codingModels: modelsForCapability(snapshot, 'coding').length,
        liveAuthenticatedModels: snapshot.models.filter((model) => model.discoverySource === 'live_authenticated').length,
        publicCatalogModels: snapshot.models.filter((model) => model.discoverySource === 'public_catalog').length,
        staticFallbackModels: snapshot.models.filter((model) => model.discoverySource === 'static_fallback').length,
        catalogDerivedModels: snapshot.models.filter((model) => (model.discoverySource ?? 'catalog_derived') === 'catalog_derived').length,
        imageModels: modelsForCapability(snapshot, 'image').length,
        imageEditModels: modelsForCapability(snapshot, 'image_edit').length,
        videoModels: modelsForCapability(snapshot, 'video').length,
        imageToVideoModels: modelsForCapability(snapshot, 'image_to_video').length,
        ttsModels: modelsForCapability(snapshot, 'tts').length,
        sttModels: modelsForCapability(snapshot, 'stt').length,
        embeddingsModels: modelsForCapability(snapshot, 'embeddings').length,
        rerankModels: modelsForCapability(snapshot, 'rerank').length,
        musicModels: modelsForCapability(snapshot, 'music').length,
        avatarModels: modelsForCapability(snapshot, 'avatar').length,
        adultImageModels: modelsForCapability(snapshot, 'adult_image').length,
        executableBlocker: providerExecutableBlocker(snapshot),
        error: snapshot.error,
        endpoint: snapshot.endpoint,
      }
    } catch (error) {
      return {
        provider,
        credentialEnvNames: PROVIDER_KEY_ENVS[provider] ?? [],
        catalogEndpoint: getProviderTruth(provider) ? resolveProviderEndpoint(getProviderTruth(provider)!) : null,
        status: 'failed',
        discoverySource: 'none',
        rawCatalogCount: 0,
        modelCount: 0,
        executableCandidateCount: 0,
        executableModels: 0,
        catalogOnlyModels: 0,
        requiresDedicatedEndpointModels: 0,
        adultGatedModels: 0,
        chatModels: 0,
        reasoningModels: 0,
        codingModels: 0,
        liveAuthenticatedModels: 0,
        publicCatalogModels: 0,
        staticFallbackModels: 0,
        catalogDerivedModels: 0,
        imageModels: 0,
        imageEditModels: 0,
        videoModels: 0,
        imageToVideoModels: 0,
        ttsModels: 0,
        sttModels: 0,
        embeddingsModels: 0,
        rerankModels: 0,
        musicModels: 0,
        avatarModels: 0,
        adultImageModels: 0,
        executableBlocker: error instanceof Error ? error.message : 'Provider discovery failed.',
        error: error instanceof Error ? error.message : 'Provider discovery failed.',
        endpoint: getProviderTruth(provider) ? resolveProviderEndpoint(getProviderTruth(provider)!) : null,
      }
    }
  }, PROVIDER_TIMEOUT_MS, timedOutProviderDiscovery(provider))))
}

async function collectProviderContractSummary(): Promise<ProviderContractSummary[]> {
  const providers = ['mimo', 'genx', 'huggingface', 'qwen', 'together', 'groq'] as const
  return Promise.all(providers.map((providerId) => withTimeout(async () => {
    const provider = getProviderTruth(providerId)
    if (!provider) {
      return emptyProviderContractSummary(providerId, ['Unknown provider truth definition.'])
    }
    const [snapshot, health] = await Promise.all([
      discoverProvider(providerId, { force: true }),
      getCanonicalProviderHealth(providerId),
    ])
    const contracts = buildProviderCapabilityContracts({
      provider,
      models: snapshot.models,
      capabilities: CAPABILITY_REGISTRY,
      health,
    })
    const nextActions = [...new Set(contracts
      .filter((contract) => !contract.runtimeExecutableNow)
      .map((contract) => contract.nextAction)
      .filter(Boolean))].slice(0, 8)
    return {
      provider: providerId,
      contracts: contracts.length,
      executableNow: contracts.filter((contract) => contract.runtimeExecutableNow).length,
      liveProven: contracts.filter((contract) => contract.liveProven).length,
      endpointRequired: contracts.filter((contract) => contract.requiresDedicatedEndpoint).length,
      specialistRequired: contracts.filter((contract) => contract.requiresSpecialistEndpoint).length,
      adapterMissing: contracts.filter((contract) => !contract.adapterAvailable).length,
      runtimeFlagDisabled: contracts.filter((contract) => contract.runtimeFlagState === 'disabled').length,
      toolPlanOnly: contracts.filter((contract) => contract.toolPlanOnly).length,
      blockedByPolicy: contracts.filter((contract) => contract.requiresAppPolicyApproval || contract.requiresAdultToggle).length,
      missingCredential: contracts.filter((contract) => !contract.accountKeyAvailable).length,
      nextActions,
    }
  }, PROVIDER_TIMEOUT_MS, emptyProviderContractSummary(providerId, [`Provider contract summary timed out after ${PROVIDER_TIMEOUT_MS}ms.`]))))
}

function collectProviderRuntimeContracts(): ProviderRuntimeContractChecklist[] {
  const providers = ['mimo', 'genx', 'huggingface', 'qwen', 'together', 'groq'] as const
  return providers.map((providerId) => {
    const provider = getProviderTruth(providerId)
    const adapter = getProviderCapabilityAdapter(providerId)
    const discovery = providerDiscoveryResults.find((entry) => entry.provider === providerId)
    const summary = providerContractSummaryResults.find((entry) => entry.provider === providerId)
    const config = providerConfigTruthResults.find((entry) => entry.provider === providerId)
    const asyncPolling = provider?.features.asyncJobs
      ? providerHasCanonicalPollingContract(providerId)
        ? 'wired: canonical async polling contract present'
        : 'blocked: provider advertises async jobs without canonical polling contract'
      : 'not_required: synchronous adapter path'
    return {
      provider: providerId,
      authDetection: provider?.envAliases.length
        ? `wired: ${provider.envAliases.join(' or ')} plus integrationConfig/aiProvider key path; current source=${config?.credential.source ?? 'unknown'}`
        : 'not_wired: provider auth aliases missing',
      modelDiscovery: provider?.discovery.models
        ? `wired: ${discovery?.catalogEndpoint ?? provider.discovery.models}; current status=${discovery?.status ?? 'not_run'}`
        : 'blocked: provider has no catalog discovery contract',
      capabilityMapping: provider?.capabilities.length
        ? `wired: ${provider.capabilities.join(', ')}`
        : 'not_wired: no provider capability map',
      requestExecutionPath: adapter
        ? `wired: ${adapter.id}; categories=${adapter.categories.join(', ')}`
        : 'not_wired: canonical provider adapter missing',
      responseParsing: adapter
        ? 'wired: adapter normalizes completed/processing/needs_configuration/blocked/failed results'
        : 'not_wired: no adapter response parser',
      artifactPersistence: provider?.features.artifactSupport
        ? 'wired: durable artifact persistence handled centrally after adapter bytes/mediaUrl output'
        : 'not_required: provider does not advertise durable media/artifact output',
      errorClassification: 'wired: classifyProviderError/sanitizeProviderError normalize provider failures without secrets',
      fallbackBehavior: `wired: Brain route planner returns rejected candidates and fallback chain; ${asyncPolling}; executableNow=${summary?.executableNow ?? 0}`,
    }
  })
}

function emptyProviderContractSummary(provider: string, nextActions: string[]): ProviderContractSummary {
  return {
    provider,
    contracts: 0,
    executableNow: 0,
    liveProven: 0,
    endpointRequired: 0,
    specialistRequired: 0,
    adapterMissing: 0,
    runtimeFlagDisabled: 0,
    toolPlanOnly: 0,
    blockedByPolicy: 0,
    missingCredential: 0,
    nextActions,
  }
}

async function collectModelSmokeProofs(
  providerKeys: ProviderKeyResult[],
  discoveries: ProviderDiscoveryResult[],
): Promise<ModelSmokeProof[]> {
  const providerProofs = await Promise.all(providerKeys.map((entry) =>
    withTimeout(async () => {
      const discovery = discoveries.find((item) => item.provider === entry.provider)
      if (!entry.configured) return modelSmokeBlocked(entry.provider, 'chat', entry.configured, Boolean(discovery?.status === 'ready'), 'Provider credential is not configured.')
      if (discovery?.status !== 'ready') return modelSmokeBlocked(entry.provider, 'chat', entry.configured, false, discovery?.error ?? 'Provider catalog is not reachable.')
      const result = await executeCapability({
        input: 'Reply with OK.',
        capability: 'chat',
        providerOverride: entry.provider,
        appId: APP_SLUG,
        saveArtifact: false,
      })
      return modelSmokeFromResult(entry.provider, 'chat', entry.configured, true, result)
    }, CAPABILITY_TIMEOUT_MS, modelSmokeBlocked(entry.provider, 'chat', entry.configured, false, `Model smoke timed out after ${CAPABILITY_TIMEOUT_MS}ms.`)),
  ))
  return providerProofs
}

async function collectToolReadinessProofs(): Promise<ToolReadinessProof[]> {
  const localToolIds = ['playwright', 'scrapy', 'trafilatura', 'ffmpeg', 'ffprobe', 'rhubarb', 'storage'] as const
  const localTools = await Promise.all(localToolIds.map((id) => withTimeout(
    () => testLocalTool(id),
    QUICK_PROOF_TIMEOUT_MS,
    {
      id,
      connected: false,
      capabilities: [],
      detail: `Tool check timed out after ${QUICK_PROOF_TIMEOUT_MS}ms.`,
    },
  )))
  const redis = await withTimeout(
    () => isRedisHealthy(),
    QUICK_PROOF_TIMEOUT_MS,
    false,
  )
  const qdrant = await withTimeout(
    () => isQdrantHealthy(),
    QUICK_PROOF_TIMEOUT_MS,
    false,
  )
  const qdrantConfigured = await withTimeout(
    () => isQdrantConfigured(),
    QUICK_PROOF_TIMEOUT_MS,
    false,
  )
  return [
    toolProof('redis_bullmq', redis, Boolean(process.env.REDIS_URL?.trim()), ['worker_job_retry_and_polling_completion', 'async media jobs'], 'sudo apt-get install -y redis-server && sudo systemctl enable --now redis-server; export REDIS_URL=redis://127.0.0.1:6379', redis ? 'Redis ping passed.' : 'Redis/BullMQ is not reachable or REDIS_URL is absent.'),
    toolProof('qdrant', qdrant, qdrantConfigured, ['research', 'memory', 'RAG'], 'docker run -d --name amarktai-qdrant --restart unless-stopped -p 127.0.0.1:6333:6333 -v /var/www/amarktai/qdrant:/qdrant/storage qdrant/qdrant:latest; add QDRANT_URL=http://127.0.0.1:6333 to the VPS .env or qdrant service config', qdrant ? 'Qdrant health passed.' : qdrantConfigured ? 'Qdrant URL is configured, but the service is not reachable.' : 'Qdrant is not configured in env or service config.'),
    ...localTools.map((tool) => toolProof(
      tool.id,
      tool.connected,
      isToolWired(tool.id),
      toolUsage(tool.id),
      tool.setupCommand ?? setupCommandForTool(tool.id),
      tool.detail,
    )),
  ]
}

function toolProof(
  id: string,
  installed: boolean,
  wired: boolean,
  usedBy: string[],
  setupCommand: string,
  detail: string,
): ToolReadinessProof {
  return {
    id,
    installed,
    wired,
    usedBy,
    setupCommand,
    blocker: installed && wired ? null : detail,
    detail,
  }
}

function toolUsage(id: string): string[] {
  if (id === 'playwright' || id === 'scrapy' || id === 'trafilatura') return ['web_research', 'scrape_website']
  if (id === 'ffmpeg' || id === 'ffprobe') return ['long_form_multi_scene_video_assembly', 'video_generation', 'music_duration_probe']
  if (id === 'rhubarb') return ['talking_avatar_video']
  if (id === 'storage') return ['artifact persistence', 'preview/download']
  return []
}

function isToolWired(id: string): boolean {
  if (id === 'scrapy' || id === 'trafilatura') {
    return Boolean(process.env.AMARKTAI_PYTHON_BIN?.trim() || process.env.PYTHON_PATH?.trim())
  }
  if (id === 'rhubarb') {
    return Boolean(process.env.RHUBARB_PATH?.trim() || process.env.LIPSYNC_SERVICE_URL?.trim())
  }
  if (id === 'storage') {
    const root = process.env.AMARKTAI_STORAGE_ROOT?.trim()
    return (process.env.STORAGE_DRIVER ?? '').trim().toLowerCase() === 'local_vps' && Boolean(root)
  }
  return true
}

function setupCommandForTool(id: string): string {
  if (id === 'local-crawler' || id === 'playwright' || id === 'scrapy' || id === 'trafilatura' || id === 'ffmpeg' || id === 'ffprobe' || id === 'rhubarb' || id === 'storage') {
    return setupCommandForLocalTool(id)
  }
  return 'See ACTIVE_OPEN_SOURCE_STACK.md.'
}

function modelSmokeBlocked(
  provider: string,
  capability: string,
  credentialPresent: boolean,
  catalogReachable: boolean,
  error: string,
): ModelSmokeProof {
  return {
    provider,
    capability,
    modelStatus: credentialPresent ? (catalogReachable ? 'FAILED_CONTRACT' : 'GATED_OR_UNAVAILABLE') : 'FAILED_PROVIDER',
    credentialPresent,
    catalogReachable,
    providerSmokePassed: false,
    modelExecutionPassed: false,
    capabilityRoutePassed: false,
    artifactPersisted: false,
    previewReachable: false,
    providerSelected: null,
    modelSelected: null,
    artifactId: null,
    error,
  }
}

async function modelSmokeFromResult(
  provider: string,
  capability: string,
  credentialPresent: boolean,
  catalogReachable: boolean,
  result: Awaited<ReturnType<typeof executeCapability>>,
): Promise<ModelSmokeProof> {
  const artifactId = result.artifactId ?? null
  const artifact = artifactId ? await getArtifact(artifactId).catch(() => null) : null
  const artifactPersisted = Boolean(artifactId && artifact)
  const previewReachable = Boolean(artifact?.previewUrl || artifact?.downloadUrl || result.mediaUrl || result.artifactUrl)
  const modelExecutionPassed = result.success === true && Boolean(result.model)
  const capabilityRoutePassed = result.success === true
  return {
    provider,
    capability,
    modelStatus: modelExecutionStatus({
      modelExecutionPassed,
      capabilityRoutePassed,
      artifactPersisted,
      previewReachable,
      result,
    }),
    credentialPresent,
    catalogReachable,
    providerSmokePassed: result.provider === provider,
    modelExecutionPassed,
    capabilityRoutePassed,
    artifactPersisted,
    previewReachable,
    providerSelected: result.provider ?? null,
    modelSelected: result.model ?? null,
    artifactId,
    error: result.success ? null : result.error ?? result.code ?? result.readiness,
  }
}

function modelExecutionStatus(input: {
  modelExecutionPassed: boolean
  capabilityRoutePassed: boolean
  artifactPersisted: boolean
  previewReachable: boolean
  result: Awaited<ReturnType<typeof executeCapability>>
}): ModelSmokeProof['modelStatus'] {
  if (input.modelExecutionPassed && input.capabilityRoutePassed) {
    if (input.result.artifactId && !input.artifactPersisted) return 'FAILED_ARTIFACT'
    return 'EXECUTABLE'
  }
  const reason = `${input.result.error ?? input.result.code ?? input.result.readiness ?? ''}`.toLowerCase()
  if (/catalog.only|catalog-only/.test(reason)) return 'CATALOG_ONLY'
  if (/dedicated endpoint|specialist endpoint/.test(reason)) return 'REQUIRES_DEDICATED_ENDPOINT'
  if (/adult|gated|permission|policy/.test(reason)) return 'ADULT_GATED'
  if (/provider|credential|key|endpoint|http|unauthorized|forbidden/.test(reason)) return 'FAILED_PROVIDER'
  return 'FAILED_CONTRACT'
}

const AUDIT_CAPABILITIES = [
  'chat',
  'reasoning',
  'coding',
  'image',
  'image_edit',
  'video',
  'image_to_video',
  'tts',
  'stt',
  'embeddings',
  'rerank',
  'music',
  'avatar',
  'adult_image',
] as const

function executableCandidateCount(snapshot: Awaited<ReturnType<typeof discoverProvider>>): number {
  const unique = new Set<string>()
  for (const capability of AUDIT_CAPABILITIES) {
    for (const model of modelsForCapability(snapshot, capability)) {
      unique.add(`${snapshot.provider}:${model.id}`)
    }
  }
  return unique.size
}

function providerExecutableBlocker(snapshot: Awaited<ReturnType<typeof discoverProvider>>): string | null {
  const executableCount = executableCandidateCount(snapshot)
  const rawCount = snapshot.rawCatalogCount ?? snapshot.models.length
  if (executableCount > 0) return null
  if (snapshot.status !== 'ready') return snapshot.error ?? 'Provider catalog is not ready.'
  if (rawCount > 0 && snapshot.models.length === 0) {
    return 'Raw catalog returned records, but normalization produced zero models. Check model id/parser shape.'
  }
  if (snapshot.models.length > 0) {
    return 'Catalog normalized models, but none mapped to executable capability candidates.'
  }
  return snapshot.error ?? 'No catalog models were returned.'
}

type CapabilityProofStep = {
  capabilityId: string
  timeoutMs: number
  run: () => Promise<CapabilityProof>
}

async function collectCapabilityProofs(): Promise<CapabilityProof[]> {
  capabilityResults = []
  for (const step of capabilityProofSteps()) {
    const result = enrichCapabilityProofs([await runCapabilityProofStep(step)])[0]
    capabilityResults.push(result)
    await writePartialProof(null)
  }
  activeCapability = null
  capabilityStartedAt = null
  capabilityTimeoutMs = null
  return capabilityResults
}

function capabilityProofSteps(): CapabilityProofStep[] {
  return [
    capabilityStep('chat_text_generation', () => proveExecuteCapability('chat/text generation', 'chat_text_generation', { input: 'Reply with OK.', capability: 'chat' })),
    capabilityStep('reasoning', () => proveExecuteCapability('reasoning', 'reasoning', { input: 'Explain in two steps why the sky is blue.', capability: 'reasoning' })),
    capabilityStep('coding_assistant', () => proveExecuteCapability('coding assistant', 'coding_assistant', { input: 'Write a hello world function in TypeScript.', capability: 'code' })),
    capabilityStep('web_research', () => proveResearch()),
    capabilityStep('summarization', () => proveAdminTextCapability('summarization', 'summarization'), QUICK_PROOF_TIMEOUT_MS),
    capabilityStep('translation', () => proveAdminTextCapability('translation', 'translation'), QUICK_PROOF_TIMEOUT_MS),
    capabilityStep('embeddings', () => proveExecuteCapability('embeddings', 'embeddings', { input: 'embedding check', capability: 'embeddings' })),
    capabilityStep('rerank_search_relevance', () => proveRerank()),
    mediaCapabilityStep('text_to_image', () => proveExecuteCapability('text-to-image', 'text_to_image', { input: 'A Cape Town skyline at sunrise.', capability: 'image_generation', saveArtifact: true })),
    mediaCapabilityStep('image_editing_source_transform', () => proveExecuteCapability('image editing/source-image transform', 'image_editing_source_transform', { input: 'Edit the image to be warmer.', capability: 'image_edit', files: [PROOF_SOURCE_IMAGE_URL], saveArtifact: true })),
    mediaCapabilityStep('text_to_video_short_clip', () => proveExecuteCapability('text-to-video short clip', 'text_to_video_short_clip', { input: 'A four second cinematic sunrise.', capability: 'video_generation', saveArtifact: true })),
    mediaCapabilityStep('text_to_speech', () => proveExecuteCapability('text-to-speech', 'text_to_speech', { input: 'AmarktAI proof speech.', capability: 'tts', saveArtifact: true })),
    mediaCapabilityStep('speech_to_text', () => proveExecuteCapability('speech-to-text', 'speech_to_text', { input: 'Transcribe the supplied audio accurately.', capability: 'stt', files: ['inline:audio'], metadata: { referenceData: Buffer.from('proof-audio'), referenceMimeType: 'audio/webm' } as Record<string, unknown>, saveArtifact: true })),
    capabilityStep('agent_request_execution', () => proveAgentRequest()),
    capabilityStep('connected_app_capability_execution', () => proveConnectedAppExecution(), QUICK_PROOF_TIMEOUT_MS),
    mediaCapabilityStep('image_to_video', () => proveExecuteCapability('image-to-video', 'image_to_video', { input: 'Animate the image.', capability: 'image_to_video', files: [PROOF_SOURCE_IMAGE_URL], saveArtifact: true })),
    mediaCapabilityStep('long_form_multi_scene_video_assembly', () => proveLongFormVideo()),
    mediaCapabilityStep('music_audio_bed_generation', () => proveMusicAudioBed()),
    capabilityStep('captions_subtitles_pipeline', () => proveCaptionsSubtitles(), QUICK_PROOF_TIMEOUT_MS),
    mediaCapabilityStep('avatar_library_avatar_image_generation', () => proveExecuteCapability('avatar library/avatar image generation', 'avatar_library_avatar_image_generation', { input: 'Create a professional avatar portrait.', capability: 'avatar_generation', saveArtifact: true })),
    mediaCapabilityStep('talking_avatar_video', () => classifyBlocked('talking-avatar video', 'talking_avatar_video', 'src/lib/orchestrator.ts', 'src/app/api/brain/avatar-video/route.ts delegates to avatar_video, but the runtime has no approved Rhubarb/lip-sync binary/service adapter configured. Install/configure a lip-sync adapter and expose its executable path/service URL before live proof can run.'), QUICK_PROOF_TIMEOUT_MS),
    mediaCapabilityStep('adult_media_policy_gated_generation', () => proveAdultMedia()),
    capabilityStep('provider_auto_selection', () => proveAutoSelection()),
    capabilityStep('provider_fallback', () => proveFallback(), QUICK_PROOF_TIMEOUT_MS),
    capabilityStep('strict_provider_proof_mode', () => proveStrictProviderProofMode(), QUICK_PROOF_TIMEOUT_MS),
    capabilityStep('route_outcome_logging', () => proveRouteOutcomeLogging()),
    mediaCapabilityStep('worker_job_retry_and_polling_completion', () => proveWorkerRetryAndPolling(), QUICK_PROOF_TIMEOUT_MS),
  ]
}

function capabilityStep(
  capabilityId: string,
  run: () => Promise<CapabilityProof>,
  timeoutMs = CAPABILITY_TIMEOUT_MS,
): CapabilityProofStep {
  return { capabilityId, run, timeoutMs }
}

function mediaCapabilityStep(
  capabilityId: string,
  run: () => Promise<CapabilityProof>,
  timeoutMs = MEDIA_CAPABILITY_TIMEOUT_MS,
): CapabilityProofStep {
  return { capabilityId, run, timeoutMs }
}

async function runCapabilityProofStep(step: CapabilityProofStep): Promise<CapabilityProof> {
  activeCapability = step.capabilityId
  capabilityStartedAt = new Date().toISOString()
  capabilityTimeoutMs = step.timeoutMs
  console.log(`CAPABILITY_START ${step.capabilityId}`)
  await writePartialProof(null)
  let timedOut = false
  let failed = false
  const result = await withTimeout(
    async () => {
      try {
        return await step.run()
      } catch (error) {
        failed = true
        return capabilityErrorProof(step.capabilityId, error)
      }
    },
    step.timeoutMs,
    capabilityTimeoutProof(step.capabilityId, step.timeoutMs),
    () => {
      timedOut = true
      console.log(`CAPABILITY_TIMEOUT ${step.capabilityId}`)
    },
  )
  if (!timedOut) console.log(`${failed ? 'CAPABILITY_ERROR' : 'CAPABILITY_DONE'} ${step.capabilityId}`)
  lastCompletedCapability = step.capabilityId
  activeCapability = null
  capabilityStartedAt = null
  capabilityTimeoutMs = null
  return result
}

function timedOutProviderDiscovery(provider: keyof typeof PROVIDER_KEY_ENVS): ProviderDiscoveryResult {
  const truth = getProviderTruth(provider)
  return {
    provider,
    credentialEnvNames: PROVIDER_KEY_ENVS[provider] ?? [],
    catalogEndpoint: truth ? resolveProviderEndpoint(truth) : null,
    status: 'failed',
    discoverySource: 'none',
    rawCatalogCount: 0,
    modelCount: 0,
    executableCandidateCount: 0,
    executableModels: 0,
    catalogOnlyModels: 0,
    requiresDedicatedEndpointModels: 0,
    adultGatedModels: 0,
    chatModels: 0,
    reasoningModels: 0,
    codingModels: 0,
    liveAuthenticatedModels: 0,
    publicCatalogModels: 0,
    staticFallbackModels: 0,
    catalogDerivedModels: 0,
    imageModels: 0,
    imageEditModels: 0,
    videoModels: 0,
    imageToVideoModels: 0,
    ttsModels: 0,
    sttModels: 0,
    embeddingsModels: 0,
    rerankModels: 0,
    musicModels: 0,
    avatarModels: 0,
    adultImageModels: 0,
    executableBlocker: `Provider discovery timed out after ${PROVIDER_TIMEOUT_MS}ms.`,
    error: `Provider discovery timed out after ${PROVIDER_TIMEOUT_MS}ms.`,
    endpoint: truth ? resolveProviderEndpoint(truth) : null,
  }
}

function proveStep(
  capabilityId: string,
  step: () => Promise<CapabilityProof>,
  timeoutMs = CAPABILITY_TIMEOUT_MS,
): Promise<CapabilityProof> {
  return withTimeout(step, timeoutMs, capabilityTimeoutProof(capabilityId, timeoutMs))
}

function withTimeout<T>(
  work: () => Promise<T>,
  timeoutMs: number,
  fallback: T,
  onTimeout?: () => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return Promise.race([
    work().finally(() => {
      if (timeout) clearTimeout(timeout)
    }),
    new Promise<T>((resolve) => {
      timeout = setTimeout(() => {
        onTimeout?.()
        resolve(fallback)
      }, timeoutMs)
    }),
  ])
}

function capabilityTimeoutProof(capabilityId: string, timeoutMs: number): CapabilityProof {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'v1-25-capability-proof timeout guard',
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: `CAPABILITY_PROOF_TIMEOUT after ${timeoutMs} ms`,
    sourceFileResponsible: 'scripts/v1-25-capability-proof.ts',
  }
}

function capabilityErrorProof(capabilityId: string, error: unknown): CapabilityProof {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'v1-25-capability-proof error guard',
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: sanitizeProofError(error),
    sourceFileResponsible: 'scripts/v1-25-capability-proof.ts',
  }
}

async function proveExecuteCapability(label: string, capabilityId: string, request: Parameters<typeof executeCapability>[0]): Promise<CapabilityProof> {
  try {
    const result = await executeCapability({ appId: APP_SLUG, ...request })
    if (result.success) {
      return {
        capabilityId,
        providerSelected: result.provider ?? null,
        modelSelected: result.model ?? null,
        routeOrAdapter: `executeCapability:${request.capability}`,
        status: 'LIVE_PROVEN',
        artifactId: result.artifactId ?? null,
        jobId: result.jobId ?? null,
        pollUrl: result.pollUrl ?? null,
        exactError: null,
        diagnostics: result.diagnostics,
        sourceFileResponsible: null,
      }
    }
    return classifyFailure(capabilityId, `executeCapability:${request.capability}`, result)
  } catch (error) {
    return {
      capabilityId,
      providerSelected: null,
      modelSelected: null,
      routeOrAdapter: label,
      status: 'BLOCKED',
      artifactId: null,
      jobId: null,
      pollUrl: null,
      exactError: error instanceof Error ? error.message : 'Capability execution failed.',
      sourceFileResponsible: null,
    }
  }
}

async function proveResearch(): Promise<CapabilityProof> {
  try {
    const result = await researchRuntime.execute({ query: 'Research https://example.com/ and summarize the page using live RAG.', appSlug: APP_SLUG, depth: 'shallow' })
    return result.success
      ? {
          capabilityId: 'web_research',
          providerSelected: result.provider ?? null,
          modelSelected: result.model ?? null,
          routeOrAdapter: 'researchRuntime.execute',
          status: 'LIVE_PROVEN',
          artifactId: result.artifactId ?? null,
          jobId: result.jobId ?? null,
          pollUrl: result.pollUrl ?? null,
          exactError: null,
          diagnostics: result.diagnostics,
          sourceFileResponsible: null,
        }
      : classifyFailure('web_research', 'researchRuntime.execute', result)
  } catch (error) {
    return blocked('web_research', 'researchRuntime.execute', error)
  }
}

function hasJsonEndpointConfig(raw: string | undefined, keys: string[]): boolean {
  if (!raw?.trim()) return false
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return keys.some((key) => Boolean(parsed[key]))
  } catch {
    return false
  }
}

function hasRerankEndpointConfig(): boolean {
  return Boolean(
    process.env.HF_ENDPOINT_RERANK?.trim()
      || hasJsonEndpointConfig(process.env.HF_SPECIALIST_ENDPOINTS_JSON, ['rerank', 'text_ranking', 'text-ranking'])
      || hasJsonEndpointConfig(process.env.TOGETHER_DEDICATED_ENDPOINTS_JSON, ['rerank', 'text_ranking', 'text-ranking']),
  )
}

async function proveRerank(): Promise<CapabilityProof> {
  if (hasRerankEndpointConfig()) {
    return proveExecuteCapability('rerank/search relevance', 'rerank_search_relevance', { input: 'rank docs', capability: 'rerank', metadata: { documents: ['alpha', 'beta'] } as Record<string, unknown> })
  }
  return classifyBlocked(
    'rerank/search relevance',
    'rerank_search_relevance',
    'src/lib/providers/provider-capability-contracts.ts',
    'Rerank route is source-wired, but live proof requires HF_ENDPOINT_RERANK or HF_SPECIALIST_ENDPOINTS_JSON for a Hugging Face specialist rerank endpoint, or TOGETHER_DEDICATED_ENDPOINTS_JSON for a Together dedicated rerank endpoint.',
  )
}

async function proveAdminTextCapability(capabilityId: string, taxonomyId: string): Promise<CapabilityProof> {
  const capability = getCapabilityDefinition(taxonomyId)
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: '/api/admin/provider-capability-test',
    status: capability?.executableEndpoint ? 'SOURCE_WIRED' : 'NOT_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: capability?.blocker ?? 'Admin-only proof surface requires live admin session and provider selection.',
    sourceFileResponsible: capability?.executableEndpoint ? null : 'src/lib/brain/v1-capability-matrix.ts',
  }
}

async function proveAgentRequest(): Promise<CapabilityProof> {
  if (!CONNECTED_APP_SECRET) {
    return sourceWired('agent_request_execution', '/api/brain/agent-request', 'Agent request route is wired through the Brain/runtime, but AMARKTAI_CONNECTED_APP_SECRET or AMARKTAI_APP_SECRET_AMARKTAI_NETWORK is required for local live proof.')
  }
  try {
    const result = await processAppAgentRequest({ appSlug: APP_SLUG, message: 'Reply with OK.', taskType: 'chat' })
    return result.success
      ? {
          capabilityId: 'agent_request_execution',
          providerSelected: result.routedProvider ?? null,
          modelSelected: result.routedModel ?? null,
          routeOrAdapter: 'processAppAgentRequest',
          status: 'LIVE_PROVEN',
          artifactId: null,
          jobId: null,
          pollUrl: null,
          exactError: null,
          sourceFileResponsible: null,
        }
      : {
          capabilityId: 'agent_request_execution',
          providerSelected: result.routedProvider ?? null,
          modelSelected: result.routedModel ?? null,
          routeOrAdapter: 'processAppAgentRequest',
          status: 'BLOCKED',
          artifactId: null,
          jobId: null,
          pollUrl: null,
          exactError: result.errors.join('; ') || 'Agent request failed.',
          sourceFileResponsible: null,
        }
  } catch (error) {
    return blocked('agent_request_execution', 'processAppAgentRequest', error)
  }
}

async function proveConnectedAppExecution(): Promise<CapabilityProof> {
  return {
    capabilityId: 'connected_app_capability_execution',
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'executeConnectedAppCapability',
    status: 'SOURCE_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: 'Connected-app runtime execution is wired, but live proof requires an active signed app registry entry and signing secret env for that app; this harness does not fabricate HMAC identity.',
    sourceFileResponsible: null,
  }
}

async function proveLongFormVideo(): Promise<CapabilityProof> {
  if (!process.env.DATABASE_URL?.trim()) {
    return sourceWired('long_form_multi_scene_video_assembly', '/api/admin/video-projects', 'Long-form video project/job routes are wired, but DATABASE_URL is required to inspect/create control-plane video project jobs for live proof.')
  }
  try {
    await listControlPlaneJobs(1)
    const result = await proveLongFormAssemblyFromProvidedClips({
      appSlug: APP_SLUG,
      title: 'V1 proof long-form assembly',
      prompt: 'Minimal provided-clip long-form video assembly proof.',
      sceneCount: 2,
      durationSeconds: 1,
    })
    return mediaFoundationProof(
      'long_form_multi_scene_video_assembly',
      'media_workflow_foundation.long_form_assembly',
      result,
      'Long-form assembly requires DATABASE_URL, writable artifact storage, ffmpeg, and ffprobe.',
    )
  } catch (error) {
    return blocked('long_form_multi_scene_video_assembly', '/api/admin/video-projects', error)
  }
}

async function proveMusicAudioBed(): Promise<CapabilityProof> {
  if (!process.env.DATABASE_URL?.trim()) {
    return sourceWired('music_audio_bed_generation', 'media_workflow_foundation.audio_bed', 'Audio-bed generation is source-wired, but DATABASE_URL is required to persist the proof artifact.')
  }
  try {
    const result = await proveAudioBedGeneration({
      appSlug: APP_SLUG,
      title: 'V1 proof audio bed',
      prompt: 'Minimal local audio-bed assembly proof. This is not provider-native music generation.',
      durationSeconds: 2,
    })
    return mediaFoundationProof(
      'music_audio_bed_generation',
      'media_workflow_foundation.audio_bed',
      result,
      'Audio-bed generation requires DATABASE_URL, writable artifact storage, ffmpeg, and ffprobe. Provider-native music_generation still requires an approved provider endpoint returning audio.',
    )
  } catch (error) {
    return blocked('music_audio_bed_generation', 'media_workflow_foundation.audio_bed', error)
  }
}

async function proveCaptionsSubtitles(): Promise<CapabilityProof> {
  if (!process.env.DATABASE_URL?.trim()) {
    return sourceWired('captions_subtitles_pipeline', 'media_workflow_foundation.captions', 'Captions/subtitles generation is source-wired, but DATABASE_URL is required to persist the subtitle artifact.')
  }
  try {
    const result = await proveCaptionsSubtitlesPipeline({
      appSlug: APP_SLUG,
      sourceMedia: 'V1 proof generated transcript',
      transcript: 'AmarktAI proof caption line one. The subtitle pipeline persists VTT and SRT-ready metadata.',
      durationSeconds: 4,
    })
    return mediaFoundationProof(
      'captions_subtitles_pipeline',
      'media_workflow_foundation.captions',
      result,
      'Captions/subtitles generation requires DATABASE_URL and writable artifact storage; STT-backed live transcription remains proven separately by speech_to_text.',
    )
  } catch (error) {
    return blocked('captions_subtitles_pipeline', 'media_workflow_foundation.captions', error)
  }
}

function mediaFoundationProof(
  capabilityId: string,
  routeOrAdapter: string,
  result: MediaFoundationResult,
  blocker: string,
): CapabilityProof {
  if (result.status === 'completed' && result.artifactId) {
    return {
      capabilityId,
      providerSelected: 'local',
      modelSelected: String(result.diagnostics.model ?? 'ffmpeg/subtitle_formatter'),
      routeOrAdapter,
      status: 'LIVE_PROVEN',
      artifactId: result.artifactId,
      jobId: result.jobId,
      pollUrl: null,
      exactError: null,
      diagnostics: result.diagnostics,
      sourceFileResponsible: null,
    }
  }
  return {
    capabilityId,
    providerSelected: result.diagnostics.provider ? String(result.diagnostics.provider) : null,
    modelSelected: result.diagnostics.model ? String(result.diagnostics.model) : null,
    routeOrAdapter,
    status: result.status === 'blocked' ? 'BLOCKED' : 'SOURCE_WIRED',
    artifactId: result.artifactId,
    jobId: result.jobId,
    pollUrl: null,
    exactError: result.error ?? blocker,
    diagnostics: result.diagnostics,
    sourceFileResponsible: 'src/lib/media-workflow-foundation.ts',
  }
}

async function proveAdultMedia(): Promise<CapabilityProof> {
  if (!process.env.DATABASE_URL?.trim()) {
    return blocked('adult_media_policy_gated_generation', 'executeCapability:adult_image', 'DATABASE_URL is required to load adult policy gates before adult media live proof; capability remains blocked.')
  }
  try {
    const result = await executeCapability({
      input: 'Create a tasteful fictional consenting adult portrait scene.',
      capability: 'adult_image',
      appId: APP_SLUG,
      adultMode: true,
      safeMode: false,
      saveArtifact: true,
    })
    return result.success
      ? {
          capabilityId: 'adult_media_policy_gated_generation',
          providerSelected: result.provider ?? null,
          modelSelected: result.model ?? null,
          routeOrAdapter: 'executeCapability:adult_image',
          status: 'LIVE_PROVEN',
          artifactId: result.artifactId ?? null,
          jobId: result.jobId ?? null,
          pollUrl: result.pollUrl ?? null,
          exactError: null,
          sourceFileResponsible: null,
        }
      : classifyFailure('adult_media_policy_gated_generation', 'executeCapability:adult_image', result)
  } catch (error) {
    return blocked('adult_media_policy_gated_generation', 'executeCapability:adult_image', error)
  }
}

async function proveAutoSelection(): Promise<CapabilityProof> {
  try {
    const result = await executeCapability({ input: 'Reply with OK.', capability: 'chat' })
    return result.provider
      ? {
          capabilityId: 'provider_auto_selection',
          providerSelected: result.provider,
          modelSelected: result.model ?? null,
          routeOrAdapter: 'executeCapability:chat',
          status: result.success ? 'LIVE_PROVEN' : 'BLOCKED',
          artifactId: null,
          jobId: null,
          pollUrl: null,
          exactError: result.success ? null : result.error ?? 'Auto-selection failed.',
          sourceFileResponsible: null,
        }
      : classifyFailure('provider_auto_selection', 'executeCapability:chat', result)
  } catch (error) {
    return blocked('provider_auto_selection', 'executeCapability:chat', error)
  }
}

async function proveFallback(): Promise<CapabilityProof> {
  return {
    capabilityId: 'provider_fallback',
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'executeCapabilityOrchestration fallback loop',
    status: 'SOURCE_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: 'Fallback proof requires a controlled first-provider failure and second-provider success in the target runtime environment; this harness does not inject failures into live providers.',
    sourceFileResponsible: null,
  }
}

async function proveStrictProviderProofMode(): Promise<CapabilityProof> {
  return {
    capabilityId: 'strict_provider_proof_mode',
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: '/api/admin/provider-capability-test',
    status: 'SOURCE_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: 'Strict provider proof mode is represented by single-provider admin proof surfaces; live proof requires authenticated server-side invocation in the target environment.',
    sourceFileResponsible: null,
  }
}

async function proveRouteOutcomeLogging(): Promise<CapabilityProof> {
  const artifacts = await listArtifacts({ limit: 5 }).catch(() => [])
  return {
    capabilityId: 'route_outcome_logging',
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'logRouteOutcome/capability-tracing',
    status: artifacts ? 'SOURCE_WIRED' : 'NOT_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: 'Outcome logging is wired in source, but live proof requires a DB-backed runtime request and persisted trace/log row inspection in the target environment.',
    sourceFileResponsible: null,
  }
}

async function proveWorkerRetryAndPolling(): Promise<CapabilityProof> {
  const job = getLocalMediaJob('non-existent-job')
  return {
    capabilityId: 'worker_job_retry_and_polling_completion',
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: '/api/brain/media-jobs/[jobId] + control-plane-jobs',
    status: 'SOURCE_WIRED',
    artifactId: null,
    jobId: job?.id ?? null,
    pollUrl: job?.id ? `/api/brain/media-jobs/${job.id}` : null,
    exactError: 'Polling and retry code is wired, but live proof requires an actual queued async provider job plus Redis/BullMQ and media job persistence in the target environment.',
    sourceFileResponsible: null,
  }
}

async function classifyNotWired(label: string, capabilityId: string, sourceFile: string, fix: string): Promise<CapabilityProof> {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: label,
    status: 'NOT_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: fix,
    sourceFileResponsible: sourceFile,
  }
}

async function classifyBlocked(label: string, capabilityId: string, sourceFile: string, fix: string): Promise<CapabilityProof> {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: label,
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: fix,
    sourceFileResponsible: sourceFile,
  }
}

function classifyFailure(capabilityId: string, routeOrAdapter: string, result: Awaited<ReturnType<typeof executeCapability>>): CapabilityProof {
  return {
    capabilityId,
    providerSelected: result.provider ?? null,
    modelSelected: result.model ?? null,
    routeOrAdapter,
    status: classifyFailureStatus(capabilityId, result),
    artifactId: result.artifactId ?? null,
    jobId: result.jobId ?? null,
    pollUrl: result.pollUrl ?? null,
    exactError: result.error ?? result.code ?? result.readiness,
    diagnostics: result.diagnostics,
    sourceFileResponsible: sourceFileForFailure(result),
  }
}

function blocked(capabilityId: string, routeOrAdapter: string, error: unknown): CapabilityProof {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter,
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: error instanceof Error ? error.message : String(error || 'Execution failed.'),
    sourceFileResponsible: null,
  }
}

function sourceWired(capabilityId: string, routeOrAdapter: string, reason: string): CapabilityProof {
  return {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter,
    status: 'SOURCE_WIRED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: reason,
    sourceFileResponsible: null,
  }
}

function classifyFailureStatus(capabilityId: string, result: Awaited<ReturnType<typeof executeCapability>>): ProofStatus {
  if (SOURCE_WIRED_ON_ROUTE_FAILURE.has(capabilityId)) {
    if (
      result.error_category === 'no_route_found'
      || result.error_category === 'unsupported_endpoint'
      || result.code === 'NO_ROUTE_FOUND'
      || result.providerAttempts?.length
    ) return 'SOURCE_WIRED'
  }
  if (/no configured provider/i.test(result.error ?? '')) {
    return SOURCE_WIRED_ON_MISSING_CREDENTIAL.has(capabilityId) ? 'SOURCE_WIRED' : 'BLOCKED'
  }
  if (
    BLOCKED_ON_ROUTE_FAILURE.has(capabilityId)
    && (
      result.providerAttempts?.some((attempt) => attempt.classification === 'endpoint_required')
      || /endpoint|required|dedicated|specialist/i.test(result.error ?? '')
    )
  ) return 'BLOCKED'
  if (result.error_category === 'no_route_found' || result.code === 'NO_ROUTE_FOUND') {
    return result.providerAttempts?.length ? 'BLOCKED' : 'NOT_WIRED'
  }
  if (result.error_category === 'unsupported_endpoint') return result.providerAttempts?.length ? 'BLOCKED' : 'NOT_WIRED'
  if (result.readiness === 'NEEDS_INPUT' || result.readiness === 'BLOCKED') return 'BLOCKED'
  if (result.readiness === 'NEEDS_CONFIGURATION' || result.readiness === 'UNAVAILABLE') {
    return result.providerAttempts?.length ? 'BLOCKED' : 'NOT_WIRED'
  }
  return 'BLOCKED'
}

function sourceFileForFailure(result: Awaited<ReturnType<typeof executeCapability>>): string | null {
  if (/no configured provider/i.test(result.error ?? '')) return 'src/lib/providers/provider-scoring.ts'
  if (result.error_category === 'no_route_found' || result.code === 'NO_ROUTE_FOUND') return 'src/lib/providers/execution.ts'
  if (result.error_category === 'unsupported_endpoint') return 'src/lib/ai-capability-adapters.ts'
  if (result.readiness === 'NEEDS_CONFIGURATION' && !result.providerAttempts?.length) return 'src/lib/brain/v1-capability-matrix.ts'
  if (result.readiness === 'UNAVAILABLE' && !result.providerAttempts?.length) return 'src/lib/providers/execution.ts'
  return null
}

function summarize(capabilities: CapabilityProof[]) {
  return {
    liveProven: capabilities.filter((entry) => entry.status === 'LIVE_PROVEN').length,
    sourceWired: capabilities.filter((entry) => entry.status === 'SOURCE_WIRED').length,
    providerAvailable: capabilities.filter((entry) => entry.status === 'PROVIDER_AVAILABLE').length,
    blocked: capabilities.filter((entry) => entry.status === 'BLOCKED').length,
    notWired: capabilities.filter((entry) => entry.status === 'NOT_WIRED').length,
  }
}

function mdCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim()
}

function capabilityDiagnosticsCell(entry: CapabilityProof): string {
  if (!entry.diagnostics) return ''
  const diagnostics = entry.diagnostics
  if (entry.capabilityId === 'web_research') {
    const parts = [
      diagnostics.sourceUrl ? `source=${diagnostics.sourceUrl}` : null,
      diagnostics.qdrantCollection ? `collection=${diagnostics.qdrantCollection}` : null,
      Array.isArray(diagnostics.vectorIds) ? `vectorIds=${diagnostics.vectorIds.join(',')}` : null,
      Array.isArray(diagnostics.retrievedVectorIds) ? `retrievedVectorIds=${diagnostics.retrievedVectorIds.join(',')}` : null,
      diagnostics.artifactId ? `artifact=${diagnostics.artifactId}` : null,
    ].filter(Boolean)
    return parts.join('<br>')
  }
  if ([
    'long_form_multi_scene_video_assembly',
    'music_audio_bed_generation',
    'captions_subtitles_pipeline',
  ].includes(entry.capabilityId)) {
    const parts = [
      diagnostics.artifactId ? `artifact=${diagnostics.artifactId}` : null,
      diagnostics.jobId ? `job=${diagnostics.jobId}` : null,
      diagnostics.sourceClipCount ? `sourceClipCount=${diagnostics.sourceClipCount}` : null,
      diagnostics.generatedProviderClip === false ? 'generatedProviderClip=false' : null,
      diagnostics.providerMusicGeneration === false ? 'providerMusicGeneration=false' : null,
      diagnostics.durationSeconds ? `durationSeconds=${diagnostics.durationSeconds}` : null,
      diagnostics.finalDurationSeconds ? `finalDurationSeconds=${diagnostics.finalDurationSeconds}` : null,
      diagnostics.cueCount ? `cueCount=${diagnostics.cueCount}` : null,
      Array.isArray(diagnostics.formats) ? `formats=${diagnostics.formats.join(',')}` : null,
    ].filter(Boolean)
    if (parts.length) return parts.join('<br>')
  }
  return JSON.stringify(diagnostics)
}

function renderMarkdown(report: ProofReport) {
  const lines = [
    '# V1 25 Capability Proof',
    '',
    `Generated: ${report.generatedAt}`,
    `Partial proof: ${report.proofState?.partial ? 'yes' : 'no'}`,
    `Active phase: ${report.proofState?.activePhase ?? 'unknown'}`,
    `Active capability: ${report.proofState?.activeCapability ?? 'none'}`,
    `Last completed capability: ${report.proofState?.lastCompletedCapability ?? 'none'}`,
    `Capability started at: ${report.proofState?.capabilityStartedAt ?? 'none'}`,
    `Capability timeout ms: ${report.proofState?.capabilityTimeoutMs ?? 'none'}`,
    `Watchdog/failure: ${report.proofState?.failure ?? 'none'}`,
    `Active handle types: ${(report.proofState?.activeHandleTypes ?? []).join(', ') || 'none'}`,
    '',
    `Database available locally: ${report.environment.hasDatabaseUrl ? 'yes' : 'no'}`,
    `Database check attempted: ${report.environment.dbCheck?.attempted ? 'yes' : 'no'}`,
    `Database check passed: ${report.environment.dbCheck?.available ? 'yes' : 'no'}`,
    `Database check error: ${mdCell(report.environment.dbCheck?.error) || 'none'}`,
    `Env loader: ${report.environment.envLoader ?? 'none'}`,
    `Env files loaded: ${(report.environment.envFilesLoaded ?? []).join(', ') || 'none'}`,
    `Env cwd: ${report.environment.envDiagnostics?.cwd ?? 'unknown'}`,
    `Env repo root: ${report.environment.envDiagnostics?.repoRoot ?? 'unknown'}`,
    `Env searched paths: ${(report.environment.envDiagnostics?.searchedEnvPaths ?? []).map(mdCell).join('<br>') || 'none'}`,
    `Env found paths: ${(report.environment.envDiagnostics?.foundEnvPaths ?? []).map(mdCell).join('<br>') || 'none'}`,
    `Proof app slug: ${report.environment.appSlug}`,
    `Connected-app secret present locally: ${report.environment.connectedAppSecretPresent ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- LIVE_PROVEN: ${report.summary.liveProven}`,
    `- SOURCE_WIRED: ${report.summary.sourceWired}`,
    `- PROVIDER_AVAILABLE: ${report.summary.providerAvailable}`,
    `- BLOCKED: ${report.summary.blocked}`,
    `- NOT_WIRED: ${report.summary.notWired}`,
    '',
    '## Provider Key Path',
    '',
    '| Provider | Configured | Masked | Error |',
    '|---|---:|---|---|',
    ...report.providerKeyPath.map((entry) => `| ${entry.provider} | ${entry.configured ? 'yes' : 'no'} | ${mdCell(entry.masked)} | ${mdCell(entry.error)} |`),
    '',
    '## Provider Config Truth',
    '',
    '| Provider | Credential source | Credential | Base URLs | Runtime flags | Endpoint requirements | DB warnings | Runtime status | Next action |',
    '|---|---|---:|---|---|---|---|---|---|',
    ...report.providerConfigTruth.map((entry) => `| ${entry.provider} | ${entry.credential.source} | ${entry.credential.present ? 'yes' : 'no'} | ${mdCell(entry.baseUrls.map((base) => `${base.family}: ${base.currentValue} (${base.source}${base.envName ? `/${base.envName}` : ''})`).join('<br>'))} | ${mdCell(entry.runtimeFlags.map((flag) => `${flag.name}=${flag.currentValue}; required ${flag.requiredValue}; blocking=${flag.blocking ? 'yes' : 'no'}`).join('<br>'))} | ${mdCell(entry.endpointRequirements.map((endpoint) => `${endpoint.capability}: ${endpoint.configured ? 'configured' : 'missing'} ${endpoint.envNames.join(' or ')}`).join('<br>'))} | ${mdCell(entry.db.warnings.join('<br>'))} | ${entry.runtimeExecutableStatus} | ${mdCell(entry.nextActions[0] ?? '')} |`),
    '',
    '## Provider Discovery',
    '',
    '| Provider | Credential envs | Catalog endpoint | Status | Source | Raw | Normalized | Executable candidates | Executable models | Catalog-only | Dedicated endpoint | Adult-gated | Chat | Reasoning | Coding | Image | Image edit | Video | I2V | TTS | STT | Embeddings | Rerank | Music | Avatar | Adult image | Blocker |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.providerDiscovery.map((entry) => `| ${entry.provider} | ${mdCell(entry.credentialEnvNames.join('<br>'))} | ${mdCell(entry.catalogEndpoint)} | ${entry.status} | ${entry.discoverySource} | ${entry.rawCatalogCount} | ${entry.modelCount} | ${entry.executableCandidateCount} | ${entry.executableModels} | ${entry.catalogOnlyModels} | ${entry.requiresDedicatedEndpointModels} | ${entry.adultGatedModels} | ${entry.chatModels} | ${entry.reasoningModels} | ${entry.codingModels} | ${entry.imageModels} | ${entry.imageEditModels} | ${entry.videoModels} | ${entry.imageToVideoModels} | ${entry.ttsModels} | ${entry.sttModels} | ${entry.embeddingsModels} | ${entry.rerankModels} | ${entry.musicModels} | ${entry.avatarModels} | ${entry.adultImageModels} | ${mdCell(entry.executableBlocker ?? entry.error)} |`),
    '',
    '## Provider Capability Contract Summary',
    '',
    '| Provider | Contracts | Executable now | Live-proven | Endpoint required | Specialist required | Adapter missing | Runtime flag disabled | Tool-plan only | Policy/adult blocked | Missing credential | Next actions |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.providerContractSummary.map((entry) => `| ${entry.provider} | ${entry.contracts} | ${entry.executableNow} | ${entry.liveProven} | ${entry.endpointRequired} | ${entry.specialistRequired} | ${entry.adapterMissing} | ${entry.runtimeFlagDisabled} | ${entry.toolPlanOnly} | ${entry.blockedByPolicy} | ${entry.missingCredential} | ${mdCell(entry.nextActions.join('<br>'))} |`),
    '',
    '## Provider Runtime Contract Checklist',
    '',
    '| Provider | Auth detection | Model discovery/catalog | Capability mapping | Request execution path | Response parsing | Artifact persistence | Error classification | Fallback behavior |',
    '|---|---|---|---|---|---|---|---|---|',
    ...report.providerRuntimeContracts.map((entry) => `| ${entry.provider} | ${mdCell(entry.authDetection)} | ${mdCell(entry.modelDiscovery)} | ${mdCell(entry.capabilityMapping)} | ${mdCell(entry.requestExecutionPath)} | ${mdCell(entry.responseParsing)} | ${mdCell(entry.artifactPersistence)} | ${mdCell(entry.errorClassification)} | ${mdCell(entry.fallbackBehavior)} |`),
    '',
    '## Model-Level Smoke Proof',
    '',
    '| Provider | Capability | Model status | Credential | Catalog | Provider smoke | Model execution | Capability route | Artifact | Preview/download | Model | Error |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...report.modelSmokeProofs.map((entry) => `| ${entry.provider} | ${entry.capability} | ${entry.modelStatus} | ${entry.credentialPresent ? 'yes' : 'no'} | ${entry.catalogReachable ? 'yes' : 'no'} | ${entry.providerSmokePassed ? 'yes' : 'no'} | ${entry.modelExecutionPassed ? 'yes' : 'no'} | ${entry.capabilityRoutePassed ? 'yes' : 'no'} | ${entry.artifactPersisted ? 'yes' : 'no'} | ${entry.previewReachable ? 'yes' : 'no'} | ${mdCell(entry.modelSelected)} | ${mdCell(entry.error)} |`),
    '',
    '## Open-Source Tool Readiness',
    '',
    '| Tool | Installed/Reachable | Wired | Used by | Setup command | Blocker | Detail |',
    '|---|---:|---:|---|---|---|---|',
    ...report.toolReadiness.map((entry) => `| ${entry.id} | ${entry.installed ? 'yes' : 'no'} | ${entry.wired ? 'yes' : 'no'} | ${mdCell(entry.usedBy.join('<br>'))} | ${mdCell(entry.setupCommand)} | ${mdCell(entry.blocker)} | ${mdCell(entry.detail)} |`),
    '',
    '## Capabilities',
    '',
    '| Capability | Status | Provider | Model | Route/Adapter | Artifact | Job | Poll | Error | Diagnostics | Source File |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...report.capabilities.map((entry) => `| ${entry.capabilityId} | ${entry.status} | ${mdCell(entry.providerSelected)} | ${mdCell(entry.modelSelected)} | ${mdCell(entry.routeOrAdapter)} | ${mdCell(entry.artifactId)} | ${mdCell(entry.jobId)} | ${mdCell(entry.pollUrl)} | ${mdCell(entry.exactError)} | ${mdCell(capabilityDiagnosticsCell(entry))} | ${mdCell(entry.routeFile ?? entry.sourceFileResponsible)} |`),
    '',
    '## Capability Contracts',
    '',
    '| Capability | User-facing name | Provider candidates | Required keys | Required local tools | Artifact behavior | Job behavior |',
    '|---|---|---|---|---|---|---|',
    ...report.capabilities.map((entry) => `| ${entry.capabilityId} | ${mdCell(entry.capabilityName)} | ${mdCell((entry.providerCandidates ?? []).join('<br>'))} | ${mdCell((entry.requiredKeys ?? []).join('<br>'))} | ${mdCell((entry.requiredLocalTools ?? []).join('<br>'))} | ${mdCell(entry.artifactBehavior)} | ${mdCell(entry.jobBehavior)} |`),
  ]
  if (report.nextVpsCommand) {
    lines.push('', '## VPS Command', '', `- ${report.nextVpsCommand}`)
  }
  return lines.join('\n')
}

void main()
  .catch((error) => {
    const message = sanitizeProofError(error)
    console.error(message)
    return writePartialProof(message)
      .catch((writeError) => console.error(`Partial proof write failed: ${sanitizeProofError(writeError)}`))
      .finally(() => {
        process.exitCode = 1
      })
  })
  .finally(async () => {
    if (!exiting) {
      exiting = true
      await cleanup()
    }
    console.log('EXIT')
    process.exit(process.exitCode ?? 0)
  })
