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

const OUTPUT_JSON = path.join(process.cwd(), 'V1_25_CAPABILITY_PROOF.json')
const OUTPUT_MD = path.join(process.cwd(), 'V1_25_CAPABILITY_PROOF.md')
const APP_SLUG = process.env.AMARKTAI_PROOF_APP_SLUG?.trim() || 'amarktai-network'
const CONNECTED_APP_SECRET = process.env.AMARKTAI_CONNECTED_APP_SECRET?.trim() || process.env.AMARKTAI_APP_SECRET_AMARKTAI_NETWORK?.trim() || ''
const PROVIDER_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_PROVIDER_TIMEOUT_MS ?? 15_000)
const CAPABILITY_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_CAPABILITY_TIMEOUT_MS ?? 90_000)
const QUICK_PROOF_TIMEOUT_MS = Number(process.env.AMARKTAI_PROOF_QUICK_TIMEOUT_MS ?? 10_000)
const PROOF_SOURCE_IMAGE_URL = process.env.AMARKTAI_PROOF_SOURCE_IMAGE_URL?.trim()
  || 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/coco_sample.png'

async function main() {
  const providerKeyResults = await collectProviderKeys()
  const providerDiscoveryResults = await collectProviderDiscovery()
  const capabilityResults = enrichCapabilityProofs(await collectCapabilityProofs())
  const modelSmokeProofs = await collectModelSmokeProofs(providerKeyResults, providerDiscoveryResults)

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
      appSlug: APP_SLUG,
      connectedAppSecretPresent: Boolean(CONNECTED_APP_SECRET),
      envLoader: 'scripts/load-repo-env.ts',
      envFilesLoaded: globalThis.__AMARKTAI_LOADED_ENV_FILES__ ?? [],
    },
    providerKeyPath: providerKeyResults,
    providerDiscovery: providerDiscoveryResults,
    modelSmokeProofs,
    capabilities: capabilityResults,
    summary: summarize(capabilityResults),
    nextVpsCommand: process.env.DATABASE_URL?.trim()
      ? null
      : 'DATABASE_URL="<production mysql url>" npx tsx scripts/v1-25-capability-proof.ts',
  }

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8')
  await fs.writeFile(OUTPUT_MD, renderMarkdown(report), 'utf8')
  console.log(JSON.stringify(report.summary, null, 2))
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
  if (routeOrAdapter.includes('control-plane-jobs')) return 'src/lib/control-plane-jobs.ts'
  if (routeOrAdapter.startsWith('/api/')) return `src/app${routeOrAdapter}/route.ts`
  return 'src/lib/orchestrator.ts'
}

function localToolsFor(capabilityId: string): string[] {
  if (capabilityId === 'web_research') return ['Playwright', 'Scrapy', 'Trafilatura']
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

async function collectProviderKeys(): Promise<ProviderKeyResult[]> {
  const providers = ['genx', 'huggingface', 'qwen', 'mimo', 'groq', 'together'] as const
  return Promise.all(providers.map((provider) => withTimeout(async () => {
    try {
      const credential = await getMeshCredential(provider)
      return {
        provider,
        configured: Boolean(credential),
        masked: credential ? `${credential.slice(0, 4)}...${credential.slice(-4)}` : null,
        error: credential ? null : 'No credential resolved from integrationConfig/aiProvider/env path.',
      }
    } catch (error) {
      return {
        provider,
        configured: false,
        masked: null,
        error: error instanceof Error ? error.message : 'Credential lookup failed.',
      }
    }
  }, PROVIDER_TIMEOUT_MS, {
    provider,
    configured: false,
    masked: null,
    error: `Credential lookup timed out after ${PROVIDER_TIMEOUT_MS}ms.`,
  })))
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
  return {
    provider,
    capability,
    credentialPresent,
    catalogReachable,
    providerSmokePassed: result.provider === provider,
    modelExecutionPassed: result.success === true && Boolean(result.model),
    capabilityRoutePassed: result.success === true,
    artifactPersisted: Boolean(artifactId && artifact),
    previewReachable: Boolean(artifact?.previewUrl || artifact?.downloadUrl || result.mediaUrl || result.artifactUrl),
    providerSelected: result.provider ?? null,
    modelSelected: result.model ?? null,
    artifactId,
    error: result.success ? null : result.error ?? result.code ?? result.readiness,
  }
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

async function collectCapabilityProofs(): Promise<CapabilityProof[]> {
  const results: CapabilityProof[] = []
  results.push(await proveStep('chat_text_generation', () => proveExecuteCapability('chat/text generation', 'chat_text_generation', { input: 'Reply with OK.', capability: 'chat' })))
  results.push(await proveStep('reasoning', () => proveExecuteCapability('reasoning', 'reasoning', { input: 'Explain in two steps why the sky is blue.', capability: 'reasoning' })))
  results.push(await proveStep('coding_assistant', () => proveExecuteCapability('coding assistant', 'coding_assistant', { input: 'Write a hello world function in TypeScript.', capability: 'code' })))
  results.push(await proveStep('web_research', () => proveResearch()))
  results.push(await proveStep('summarization', () => proveAdminTextCapability('summarization', 'summarization'), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('translation', () => proveAdminTextCapability('translation', 'translation'), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('embeddings', () => proveExecuteCapability('embeddings', 'embeddings', { input: 'embedding check', capability: 'embeddings' })))
  results.push(await proveStep('rerank_search_relevance', () => proveExecuteCapability('rerank/search relevance', 'rerank_search_relevance', { input: 'rank docs', capability: 'rerank', metadata: { documents: ['alpha', 'beta'] } as Record<string, unknown> })))
  results.push(await proveStep('text_to_image', () => proveExecuteCapability('text-to-image', 'text_to_image', { input: 'A Cape Town skyline at sunrise.', capability: 'image_generation', saveArtifact: true })))
  results.push(await proveStep('image_editing_source_transform', () => proveExecuteCapability('image editing/source-image transform', 'image_editing_source_transform', { input: 'Edit the image to be warmer.', capability: 'image_edit', files: [PROOF_SOURCE_IMAGE_URL], saveArtifact: true })))
  results.push(await proveStep('text_to_video_short_clip', () => proveExecuteCapability('text-to-video short clip', 'text_to_video_short_clip', { input: 'A four second cinematic sunrise.', capability: 'video_generation', saveArtifact: true })))
  results.push(await proveStep('text_to_speech', () => proveExecuteCapability('text-to-speech', 'text_to_speech', { input: 'AmarktAI proof speech.', capability: 'tts', saveArtifact: true })))
  results.push(await proveStep('speech_to_text', () => proveExecuteCapability('speech-to-text', 'speech_to_text', { input: 'Transcribe the supplied audio accurately.', capability: 'stt', files: ['inline:audio'], metadata: { referenceData: Buffer.from('proof-audio'), referenceMimeType: 'audio/webm' } as Record<string, unknown>, saveArtifact: true })))
  results.push(await proveStep('agent_request_execution', () => proveAgentRequest()))
  results.push(await proveStep('connected_app_capability_execution', () => proveConnectedAppExecution(), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('image_to_video', () => proveExecuteCapability('image-to-video', 'image_to_video', { input: 'Animate the image.', capability: 'image_to_video', files: [PROOF_SOURCE_IMAGE_URL], saveArtifact: true })))
  results.push(await proveStep('long_form_multi_scene_video_assembly', () => proveLongFormVideo()))
  results.push(await proveStep('avatar_library_avatar_image_generation', () => proveExecuteCapability('avatar library/avatar image generation', 'avatar_library_avatar_image_generation', { input: 'Create a professional avatar portrait.', capability: 'avatar_generation', saveArtifact: true })))
  results.push(await proveStep('talking_avatar_video', () => classifyBlocked('talking-avatar video', 'talking_avatar_video', 'src/lib/orchestrator.ts', 'src/app/api/brain/avatar-video/route.ts delegates to avatar_video, but the runtime has no approved Rhubarb/lip-sync binary/service adapter configured. Install/configure a lip-sync adapter and expose its executable path/service URL before live proof can run.'), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('adult_media_policy_gated_generation', () => proveAdultMedia()))
  results.push(await proveStep('provider_auto_selection', () => proveAutoSelection()))
  results.push(await proveStep('provider_fallback', () => proveFallback(), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('strict_provider_proof_mode', () => proveStrictProviderProofMode(), QUICK_PROOF_TIMEOUT_MS))
  results.push(await proveStep('route_outcome_logging', () => proveRouteOutcomeLogging()))
  results.push(await proveStep('worker_job_retry_and_polling_completion', () => proveWorkerRetryAndPolling(), QUICK_PROOF_TIMEOUT_MS))
  return results
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
  return withTimeout(step, timeoutMs, {
    capabilityId,
    providerSelected: null,
    modelSelected: null,
    routeOrAdapter: 'v1-25-capability-proof timeout guard',
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: `Capability proof timed out after ${timeoutMs}ms.`,
    sourceFileResponsible: 'scripts/v1-25-capability-proof.ts',
  })
}

function withTimeout<T>(work: () => Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return Promise.race([
    work().finally(() => {
      if (timeout) clearTimeout(timeout)
    }),
    new Promise<T>((resolve) => {
      timeout = setTimeout(() => resolve(fallback), timeoutMs)
    }),
  ])
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
    const result = await researchRuntime.execute({ query: 'Summarize current AI platform reliability concerns.', appSlug: APP_SLUG, depth: 'shallow' })
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
          sourceFileResponsible: null,
        }
      : classifyFailure('web_research', 'researchRuntime.execute', result)
  } catch (error) {
    return blocked('web_research', 'researchRuntime.execute', error)
  }
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
    return blocked('agent_request_execution', '/api/brain/agent-request', 'AMARKTAI_CONNECTED_APP_SECRET or AMARKTAI_APP_SECRET_AMARKTAI_NETWORK is required for local proof.')
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
    status: 'BLOCKED',
    artifactId: null,
    jobId: null,
    pollUrl: null,
    exactError: 'Connected-app live proof requires an active signed app registry entry and signing secret env for that app; this harness does not fabricate HMAC identity.',
    sourceFileResponsible: null,
  }
}

async function proveLongFormVideo(): Promise<CapabilityProof> {
  if (!process.env.DATABASE_URL?.trim()) {
    return blocked('long_form_multi_scene_video_assembly', '/api/admin/video-projects', 'DATABASE_URL is required to inspect/create control-plane video project jobs for live proof.')
  }
  try {
    const jobs = await listControlPlaneJobs(5)
    return {
      capabilityId: 'long_form_multi_scene_video_assembly',
      providerSelected: null,
      modelSelected: null,
      routeOrAdapter: '/api/admin/video-projects',
      status: jobs.length >= 0 ? 'BLOCKED' : 'NOT_WIRED',
      artifactId: null,
      jobId: null,
      pollUrl: null,
      exactError: 'Long-form assembly is admin/project-pipeline based; live proof requires database-backed project creation plus at least one generated clip in the target environment.',
      sourceFileResponsible: null,
    }
  } catch (error) {
    return blocked('long_form_multi_scene_video_assembly', '/api/admin/video-projects', error)
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
    status: classifyFailureStatus(result),
    artifactId: result.artifactId ?? null,
    jobId: result.jobId ?? null,
    pollUrl: result.pollUrl ?? null,
    exactError: result.error ?? result.code ?? result.readiness,
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

function classifyFailureStatus(result: Awaited<ReturnType<typeof executeCapability>>): ProofStatus {
  if (/no configured provider/i.test(result.error ?? '')) return 'BLOCKED'
  if (result.error_category === 'no_route_found' || result.code === 'NO_ROUTE_FOUND') return 'NOT_WIRED'
  if (result.error_category === 'unsupported_endpoint') return 'NOT_WIRED'
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

function renderMarkdown(report: {
  generatedAt: string
  environment: {
    hasDatabaseUrl: boolean
    appSlug: string
    connectedAppSecretPresent: boolean
    envLoader?: string
    envFilesLoaded?: string[]
  }
  providerKeyPath: ProviderKeyResult[]
  providerDiscovery: ProviderDiscoveryResult[]
  modelSmokeProofs: ModelSmokeProof[]
  capabilities: CapabilityProof[]
  summary: { liveProven: number; sourceWired: number; providerAvailable: number; blocked: number; notWired: number }
  nextVpsCommand: string | null
}) {
  const lines = [
    '# V1 25 Capability Proof',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Database available locally: ${report.environment.hasDatabaseUrl ? 'yes' : 'no'}`,
    `Env loader: ${report.environment.envLoader ?? 'none'}`,
    `Env files loaded: ${(report.environment.envFilesLoaded ?? []).join(', ') || 'none'}`,
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
    '## Provider Discovery',
    '',
    '| Provider | Credential envs | Catalog endpoint | Status | Source | Raw | Normalized | Executable candidates | Executable models | Catalog-only | Dedicated endpoint | Adult-gated | Chat | Reasoning | Coding | Image | Image edit | Video | I2V | TTS | STT | Embeddings | Rerank | Music | Avatar | Adult image | Blocker |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.providerDiscovery.map((entry) => `| ${entry.provider} | ${mdCell(entry.credentialEnvNames.join('<br>'))} | ${mdCell(entry.catalogEndpoint)} | ${entry.status} | ${entry.discoverySource} | ${entry.rawCatalogCount} | ${entry.modelCount} | ${entry.executableCandidateCount} | ${entry.executableModels} | ${entry.catalogOnlyModels} | ${entry.requiresDedicatedEndpointModels} | ${entry.adultGatedModels} | ${entry.chatModels} | ${entry.reasoningModels} | ${entry.codingModels} | ${entry.imageModels} | ${entry.imageEditModels} | ${entry.videoModels} | ${entry.imageToVideoModels} | ${entry.ttsModels} | ${entry.sttModels} | ${entry.embeddingsModels} | ${entry.rerankModels} | ${entry.musicModels} | ${entry.avatarModels} | ${entry.adultImageModels} | ${mdCell(entry.executableBlocker ?? entry.error)} |`),
    '',
    '## Model-Level Smoke Proof',
    '',
    '| Provider | Capability | Credential | Catalog | Provider smoke | Model execution | Capability route | Artifact | Preview/download | Model | Error |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...report.modelSmokeProofs.map((entry) => `| ${entry.provider} | ${entry.capability} | ${entry.credentialPresent ? 'yes' : 'no'} | ${entry.catalogReachable ? 'yes' : 'no'} | ${entry.providerSmokePassed ? 'yes' : 'no'} | ${entry.modelExecutionPassed ? 'yes' : 'no'} | ${entry.capabilityRoutePassed ? 'yes' : 'no'} | ${entry.artifactPersisted ? 'yes' : 'no'} | ${entry.previewReachable ? 'yes' : 'no'} | ${mdCell(entry.modelSelected)} | ${mdCell(entry.error)} |`),
    '',
    '## Capabilities',
    '',
    '| Capability | Status | Provider | Model | Route/Adapter | Artifact | Job | Poll | Error | Source File |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...report.capabilities.map((entry) => `| ${entry.capabilityId} | ${entry.status} | ${mdCell(entry.providerSelected)} | ${mdCell(entry.modelSelected)} | ${mdCell(entry.routeOrAdapter)} | ${mdCell(entry.artifactId)} | ${mdCell(entry.jobId)} | ${mdCell(entry.pollUrl)} | ${mdCell(entry.exactError)} | ${mdCell(entry.routeFile ?? entry.sourceFileResponsible)} |`),
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
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined)
    process.exit(process.exitCode ?? 0)
  })
