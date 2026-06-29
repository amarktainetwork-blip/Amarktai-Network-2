import { getCapabilityRuntimeTruth, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'

export type CoreProofStatus = 'proven' | 'needs_proof' | 'blocked' | 'failed' | 'not_configured' | 'processing'
export type CoreProofMode = 'status' | 'live'
export type CoreProofCostMode = 'cheap' | 'balanced' | 'premium'

export interface CoreProofCapabilitySpec {
  capability: string
  mode: string
  route: string
}

export interface CoreProofCapabilityResult {
  capability: string
  status: CoreProofStatus
  route: string
  provider: string | null
  model: string | null
  artifactId: string | null
  storageUrl: string | null
  jobId: string | null
  pollUrl: string | null
  proofStatus: string | null
  blocker: string | null
  nextAction: string | null
  attempts: unknown[]
}

export interface CoreProofPackResult {
  success: boolean
  mode: CoreProofMode
  ranAt: string
  requestedCapabilities: string[]
  selectedCapabilities: string[]
  rejectedCapabilities: string[]
  liveExecutionAttempted: boolean
  capabilities: CoreProofCapabilityResult[]
}

export interface CoreProofPackOptions {
  live?: boolean
  capabilities?: readonly string[]
  maxDurationSeconds?: number
  costMode?: CoreProofCostMode
  pollSeconds?: number
  pollIntervalMs?: number
}

export interface CoreProofAudioSource {
  audioBase64: string | null
  artifactId: string | null
  storageUrl: string | null
  audioUrl: string | null
}

export const CORE_PROOF_CAPABILITIES: readonly CoreProofCapabilitySpec[] = [
  { capability: 'chat', mode: 'chat', route: '/api/admin/studio/execute' },
  { capability: 'image_generation', mode: 'image', route: '/api/admin/studio/execute' },
  { capability: 'video_generation', mode: 'video', route: '/api/admin/studio/execute' },
  { capability: 'long_form_video', mode: 'long_form_video', route: '/api/admin/studio/execute' },
  { capability: 'music_generation', mode: 'music', route: '/api/admin/studio/execute' },
  { capability: 'tts', mode: 'tts', route: '/api/admin/studio/execute' },
  { capability: 'stt', mode: 'stt', route: '/api/admin/studio/stt' },
  { capability: 'avatar_generation', mode: 'avatar', route: '/api/admin/studio/execute' },
] as const

export const LIVE_MEDIA_PROOF_CAPABILITIES = [
  'image_generation',
  'tts',
  'music_generation',
  'stt',
] as const

export const LIVE_MEDIA_PROOF_EXCLUDED_CAPABILITIES = [
  'video_generation',
  'long_form_video',
  'avatar_generation',
  'adult_text',
  'adult_image',
  'adult_voice',
  'adult_avatar',
  'adult_video',
] as const

const LIVE_MEDIA_PROOF_SET = new Set<string>(LIVE_MEDIA_PROOF_CAPABILITIES)
const CORE_PROOF_BY_CAPABILITY = new Map(CORE_PROOF_CAPABILITIES.map((spec) => [spec.capability, spec]))

const PACK_A_PROMPTS = {
  image_generation: 'A small clean AmarktAI proof image: blue circle on dark background, simple icon, no text.',
  tts: 'AmarktAI proof test. This confirms text to speech execution.',
  music_generation: 'A very short instrumental proof loop, calm electronic pulse, no vocals.',
} as const

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? null
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function proofStatusFromTruth(entry: CapabilityRuntimeTruthEntry): CoreProofStatus {
  if (entry.status === 'missing') return 'not_configured'
  if (entry.status === 'blocked') return 'blocked'
  if (entry.status === 'wired_unproven') return 'needs_proof'
  return entry.proofStatus === 'passed' ? 'proven' : 'needs_proof'
}

function isCompletedArtifactUrl(storageUrl: string | null) {
  if (!storageUrl) return false
  return storageUrl.startsWith('/api/artifacts/file/') || storageUrl.startsWith('https://') || storageUrl.startsWith('http://')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function boundedPollSeconds(value: number | undefined) {
  return Number.isFinite(value) && value !== undefined ? Math.max(1, Math.min(value, 300)) : 60
}

function boundedPollIntervalMs(value: number | undefined) {
  return Number.isFinite(value) && value !== undefined ? Math.max(250, Math.min(value, 30_000)) : 3_000
}

export function extractCoreProofAudioSource(data: Record<string, unknown>): CoreProofAudioSource {
  const result = toRecord(data.result)
  const artifact = toRecord(data.artifact)
  return {
    audioBase64: firstString(data.audioBase64, result.audioBase64),
    artifactId: firstString(data.artifactId, artifact.id, result.artifactId),
    storageUrl: firstString(data.storageUrl, data.mediaUrl, data.audioUrl, artifact.storageUrl, result.storageUrl),
    audioUrl: firstString(data.audioUrl, data.mediaUrl, result.audioUrl, result.mediaUrl),
  }
}

export function hasCoreProofAudioSource(source: CoreProofAudioSource | null): source is CoreProofAudioSource {
  if (!source) return false
  return Boolean(source.audioBase64 || source.audioUrl || (source.artifactId && source.storageUrl))
}

export function normalizeCoreProofRouteResult(
  capability: string,
  route: string,
  data: Record<string, unknown>,
): CoreProofCapabilityResult {
  const result = toRecord(data.result)
  const proof = toRecord(data.proof)
  const artifact = toRecord(data.artifact)
  const job = toRecord(data.job)
  const jobStatus = firstString(data.jobStatus, data.status, job.status, result.jobStatus, result.status)
  const artifactId = firstString(data.artifactId, artifact.id, result.artifactId)
  const storageUrl = firstString(data.storageUrl, data.imageUrl, data.videoUrl, data.audioUrl, data.musicUrl, data.mediaUrl, artifact.storageUrl, result.storageUrl)
  const jobId = firstString(data.jobId, job.jobId, result.jobId)
  const pollUrl = firstString(data.pollUrl, job.pollUrl, result.pollUrl)
  const blocker = firstString(data.blocker, data.error, result.blocker, result.error)
  const attempts = Array.isArray(data.attempts) ? data.attempts : Array.isArray(result.attempts) ? result.attempts : []
  const executed = data.executed === true || data.success === true
  const completed = ['completed', 'succeeded', 'success', 'generated'].includes(String(jobStatus ?? '').toLowerCase())
  const artifactReady = Boolean((artifactId || storageUrl) && isCompletedArtifactUrl(storageUrl))
  const processing = Boolean(jobId || pollUrl) && !Boolean(artifactId && storageUrl)
  const missingConfig = /missing|not configured|needs_setup|requires_endpoint|no connected provider/i.test(`${blocker ?? ''} ${jobStatus ?? ''}`)
  const persistenceFailure = /artifact|persist|persistence|storage|ingestion/i.test(blocker ?? '')
  const status: CoreProofStatus =
    executed && completed && artifactReady && !persistenceFailure ? 'proven' :
    processing ? 'processing' :
    missingConfig ? 'not_configured' :
    blocker ? 'failed' :
    'needs_proof'
  const explicitProofStatus = firstString(data.proofStatus, proof.proofStatus, result.proofStatus)

  return {
    capability,
    status,
    route,
    provider: firstString(data.provider, data.selectedProvider, result.provider, proof.provider),
    model: firstString(data.model, data.selectedModel, result.model, proof.model),
    artifactId,
    storageUrl,
    jobId,
    pollUrl,
    proofStatus: explicitProofStatus ?? (
      status === 'proven' ? 'passed' :
      status === 'processing' ? 'processing' :
      status === 'failed' ? 'failed' :
      'not_tested'
    ),
    blocker,
    nextAction: firstString(data.nextAction, result.nextAction),
    attempts,
  }
}

function blockedLiveCapability(capability: string, blocker: string, nextAction: string | null = null): CoreProofCapabilityResult {
  const spec = CORE_PROOF_BY_CAPABILITY.get(capability)
  return {
    capability,
    status: 'blocked',
    route: spec?.route ?? 'Not in Pack A',
    provider: null,
    model: null,
    artifactId: null,
    storageUrl: null,
    jobId: null,
    pollUrl: null,
    proofStatus: 'not_tested',
    blocker,
    nextAction,
    attempts: [],
  }
}

export function resolveLiveCoreProofCapabilities(requested?: readonly string[]): {
  selected: CoreProofCapabilitySpec[]
  rejected: CoreProofCapabilityResult[]
} {
  const requestedCapabilities = requested?.length ? Array.from(new Set(requested)) : [...LIVE_MEDIA_PROOF_CAPABILITIES]
  const selected: CoreProofCapabilitySpec[] = []
  const rejected: CoreProofCapabilityResult[] = []

  for (const capability of requestedCapabilities) {
    const spec = CORE_PROOF_BY_CAPABILITY.get(capability)
    if (!spec || !LIVE_MEDIA_PROOF_SET.has(capability)) {
      rejected.push(blockedLiveCapability(
        capability,
        `Live proof pack A does not run ${capability}.`,
        'Use a later live proof pack for video, long-form video, avatar, or adult capabilities.',
      ))
      continue
    }
    selected.push(spec)
  }

  return { selected, rejected }
}

function statusOnlyCapabilityResult(spec: CoreProofCapabilitySpec, entry?: CapabilityRuntimeTruthEntry): CoreProofCapabilityResult {
  if (!entry) {
    return {
      capability: spec.capability,
      status: 'blocked',
      route: spec.route,
      provider: null,
      model: null,
      artifactId: null,
      storageUrl: null,
      jobId: null,
      pollUrl: null,
      proofStatus: 'not_tested',
      blocker: `Capability ${spec.capability} is not registered in runtime truth.`,
      nextAction: 'Register this capability before launch proof execution.',
      attempts: [],
    }
  }

  return {
    capability: spec.capability,
    status: proofStatusFromTruth(entry),
    route: entry.executionRoute ?? spec.route,
    provider: entry.connectedProviderCandidates[0] ?? null,
    model: null,
    artifactId: null,
    storageUrl: null,
    jobId: null,
    pollUrl: null,
    proofStatus: entry.proofStatus,
    blocker: entry.blocker || null,
    nextAction: entry.nextAction || (entry.status === 'wired_unproven' ? `Run a real ${entry.label} Studio execution and persist proof.` : null),
    attempts: [],
  }
}

async function jsonFromResponse(response: Response): Promise<Record<string, unknown>> {
  const value = await response.json().catch(() => ({}))
  return toRecord(value)
}

async function postJsonRoute(route: string, body: Record<string, unknown>) {
  const { NextRequest } = await import('next/server')
  const request = new NextRequest(`http://localhost${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return request
}

async function pollMediaJobProof(
  capability: string,
  route: string,
  initialData: Record<string, unknown>,
  options: CoreProofPackOptions,
): Promise<{ result: CoreProofCapabilityResult; data: Record<string, unknown> }> {
  let currentData = initialData
  let currentResult = normalizeCoreProofRouteResult(capability, route, currentData)
  const jobId = currentResult.jobId
  if (!jobId || currentResult.status !== 'processing') return { result: currentResult, data: currentData }

  const { pollLocalMediaJob, localMediaJobResponse } = await import('@/lib/media-job-store')
  const deadline = Date.now() + boundedPollSeconds(options.pollSeconds) * 1000
  const intervalMs = boundedPollIntervalMs(options.pollIntervalMs)

  while (Date.now() <= deadline) {
    const job = await pollLocalMediaJob(jobId)
    if (!job) {
      currentData = {
        ...currentData,
        success: false,
        executed: false,
        status: 'failed',
        jobStatus: 'failed',
        blocker: `Media job ${jobId} was not found during proof polling.`,
      }
      currentResult = normalizeCoreProofRouteResult(capability, route, currentData)
      return { result: currentResult, data: currentData }
    }

    currentData = localMediaJobResponse(job) as Record<string, unknown>
    currentResult = normalizeCoreProofRouteResult(capability, route, currentData)
    if (currentResult.status !== 'processing') return { result: currentResult, data: currentData }
    if (Date.now() + intervalMs > deadline) break
    await sleep(intervalMs)
  }

  return {
    result: {
      ...currentResult,
      blocker: currentResult.blocker ?? `Media job ${jobId} did not complete within ${boundedPollSeconds(options.pollSeconds)} seconds.`,
      nextAction: currentResult.nextAction ?? 'Poll the returned media job again or increase --pollSeconds for live proof.',
    },
    data: currentData,
  }
}

async function readAudioSourceBytes(source: CoreProofAudioSource): Promise<{ bytes: Buffer; mimeType: string } | null> {
  if (source.audioBase64) {
    const decoded = decodeDataUri(source.audioBase64)
    if (decoded?.bytes.length) return decoded
  }

  const directUrl = source.audioUrl ?? source.storageUrl
  if (directUrl?.startsWith('http://') || directUrl?.startsWith('https://')) {
    const response = await fetch(directUrl, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`TTS artifact fetch failed with HTTP ${response.status}.`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!bytes.length) return null
    return { bytes, mimeType: response.headers.get('content-type') ?? 'audio/mpeg' }
  }

  if (source.artifactId) {
    const { getArtifact } = await import('@/lib/artifact-store')
    const { getStorageDriver } = await import('@/lib/storage-driver')
    const artifact = await getArtifact(source.artifactId)
    if (artifact?.storagePath) {
      const bytes = await getStorageDriver().get(artifact.storagePath)
      if (bytes?.length) return { bytes, mimeType: artifact.mimeType || 'audio/mpeg' }
    }
  }

  return null
}

async function runLiveImageProof(options: CoreProofPackOptions): Promise<CoreProofCapabilityResult> {
  try {
    const { POST } = await import('@/app/api/brain/image/route')
    const { persistCanonicalMediaResult } = await import('@/lib/canonical-media-artifact')
    const route = '/api/brain/image'
    const response = await POST(await postJsonRoute(route, {
      prompt: PACK_A_PROMPTS.image_generation,
      size: '1024x1024',
      costMode: options.costMode ?? 'cheap',
      capability: 'image_generation',
    }))
    const data = await jsonFromResponse(response)
    if (!data.executed) return normalizeCoreProofRouteResult('image_generation', route, data)

    const provider = firstString(data.provider) ?? 'unknown'
    const model = firstString(data.model) ?? 'unknown'
    const persisted = await persistCanonicalMediaResult({
      result: data,
      appSlug: 'amarktai-network',
      type: 'image',
      subType: 'core_proof_image',
      title: 'Core proof image',
      description: PACK_A_PROMPTS.image_generation,
      provider,
      model,
      metadata: { source: 'core_proof_cli', capability: 'image_generation' },
    })
    return normalizeCoreProofRouteResult('image_generation', route, { ...data, ...persisted, status: persisted.status })
  } catch (error) {
    return normalizeCoreProofRouteResult('image_generation', '/api/brain/image', {
      success: false,
      executed: false,
      status: 'failed',
      blocker: error instanceof Error ? error.message : 'Image proof execution failed.',
    })
  }
}

async function runLiveTtsProof(options: CoreProofPackOptions): Promise<{ result: CoreProofCapabilityResult; audioSource: CoreProofAudioSource | null }> {
  try {
    const { POST } = await import('@/app/api/brain/tts/route')
    const route = '/api/brain/tts'
    const response = await POST(await postJsonRoute(route, {
      text: PACK_A_PROMPTS.tts,
      capability: 'tts',
      appSlug: 'amarktai-network',
      responseFormat: 'json',
    }))
    const data = await jsonFromResponse(response)
    const polled = await pollMediaJobProof('tts', route, data, options)
    const audioSource = extractCoreProofAudioSource(polled.data)
    return { result: polled.result, audioSource: hasCoreProofAudioSource(audioSource) ? audioSource : null }
  } catch (error) {
    return {
      result: normalizeCoreProofRouteResult('tts', '/api/brain/tts', {
        success: false,
        executed: false,
        status: 'failed',
        blocker: error instanceof Error ? error.message : 'TTS proof execution failed.',
      }),
      audioSource: null,
    }
  }
}

function decodeDataUri(dataUri: string): { bytes: Buffer; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) return null
  return { bytes: Buffer.from(match[2], 'base64'), mimeType: match[1] }
}

async function runLiveSttProof(ttsAudioSource: CoreProofAudioSource | null): Promise<CoreProofCapabilityResult> {
  if (!hasCoreProofAudioSource(ttsAudioSource)) {
    return {
      capability: 'stt',
      status: 'needs_proof',
      route: '/api/brain/stt',
      provider: null,
      model: null,
      artifactId: null,
      storageUrl: null,
      jobId: null,
      pollUrl: null,
      proofStatus: 'not_tested',
      blocker: null,
      nextAction: 'Run STT after a valid audio artifact exists.',
      attempts: [],
    }
  }

  const decoded = await readAudioSourceBytes(ttsAudioSource)
  if (!decoded?.bytes.length) {
    return normalizeCoreProofRouteResult('stt', '/api/brain/stt', {
      success: false,
      executed: false,
      status: 'needs_proof',
      blocker: 'TTS proof audio could not be read from the same-run artifact for STT.',
    })
  }

  try {
    const { NextRequest } = await import('next/server')
    const { POST } = await import('@/app/api/brain/stt/route')
    const { createArtifact } = await import('@/lib/artifact-store')
    const route = '/api/brain/stt'
    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(decoded.bytes)], { type: decoded.mimeType }), 'core-proof-tts.mp3')
    formData.append('language', 'en')
    const response = await POST(new NextRequest(`http://localhost${route}`, {
      method: 'POST',
      body: formData,
    }))
    if (!response) {
      return normalizeCoreProofRouteResult('stt', route, {
        success: false,
        executed: false,
        status: 'failed',
        blocker: 'STT route returned no response.',
      })
    }
    const data = await jsonFromResponse(response)
    if (!data.executed || typeof data.transcript !== 'string' || !data.transcript.trim()) {
      return normalizeCoreProofRouteResult('stt', route, data)
    }
    const artifact = await createArtifact({
      appSlug: 'amarktai-network',
      type: 'transcript',
      subType: 'stt',
      title: 'Core proof STT transcript',
      provider: firstString(data.provider) ?? '',
      model: firstString(data.model) ?? '',
      content: Buffer.from(data.transcript),
      mimeType: 'text/plain',
      metadata: { source: 'core_proof_cli', capability: 'stt' },
    })
    return normalizeCoreProofRouteResult('stt', route, {
      ...data,
      success: true,
      status: 'completed',
      artifactId: artifact.id,
      storageUrl: artifact.storageUrl,
    })
  } catch (error) {
    return normalizeCoreProofRouteResult('stt', '/api/brain/stt', {
      success: false,
      executed: false,
      status: 'failed',
      blocker: error instanceof Error ? error.message : 'STT proof execution failed.',
    })
  }
}

async function runLiveMusicProof(options: CoreProofPackOptions): Promise<CoreProofCapabilityResult> {
  const route = '/api/admin/music-studio'
  try {
    const { callGenXMedia, getConfiguredGenXMusicModel } = await import('@/lib/genx-client')
    const { persistCanonicalMediaResult } = await import('@/lib/canonical-media-artifact')
    const { createLocalMediaJob, localMediaJobResponse } = await import('@/lib/media-job-store')
    const model = getConfiguredGenXMusicModel()
    if (!model) {
      return normalizeCoreProofRouteResult('music_generation', route, {
        success: false,
        executed: false,
        status: 'needs_setup',
        jobStatus: 'needs_setup',
        provider: 'genx',
        model: null,
        blocker: 'GenX music audio requires GENX_MUSIC_MODEL. Set GENX_MUSIC_MODEL to a GenX audio/music model.',
      })
    }

    const durationSeconds = Math.min(Math.max(options.maxDurationSeconds ?? 8, 5), 10)
    const generated = await callGenXMedia({
      model,
      prompt: PACK_A_PROMPTS.music_generation,
      type: 'audio',
      duration: durationSeconds,
      params: {
        style: 'ambient',
        instrumental: true,
      },
      metadata: {
        source: 'core_proof_cli',
        capability: 'music_generation',
        durationSeconds,
      },
    })

    if (!generated.success || (!generated.url && !generated.jobId)) {
      return normalizeCoreProofRouteResult('music_generation', route, {
        success: false,
        executed: true,
        status: 'failed',
        provider: 'genx',
        model: generated.model,
        blocker: generated.error ?? 'GenX music generation returned no playable audio or trackable provider job.',
      })
    }

    if (generated.url) {
      const persisted = await persistCanonicalMediaResult({
        result: generated,
        appSlug: 'amarktai-network',
        type: 'music',
        subType: 'core_proof_music',
        title: 'Core proof music',
        description: PACK_A_PROMPTS.music_generation,
        provider: 'genx',
        model: generated.model,
        metadata: { source: 'core_proof_cli', capability: 'music_generation', durationSeconds },
      })
      return normalizeCoreProofRouteResult('music_generation', route, {
        success: Boolean(persisted.artifactId),
        executed: true,
        status: persisted.status,
        provider: 'genx',
        model: generated.model,
        artifactId: persisted.artifactId,
        storageUrl: persisted.storageUrl,
        audioUrl: persisted.mediaUrl,
        blocker: persisted.artifactId ? null : 'Music generation completed but artifact persistence failed.',
      })
    }

    const job = createLocalMediaJob({
      capability: 'music_generation',
      appSlug: 'amarktai-network',
      type: 'music',
      subType: 'core_proof_music',
      title: 'Core proof music',
      description: PACK_A_PROMPTS.music_generation,
      prompt: PACK_A_PROMPTS.music_generation,
      provider: 'genx',
      model: generated.model,
      providerJobId: generated.jobId!,
      metadata: { source: 'core_proof_cli', capability: 'music_generation', durationSeconds },
    })
    const polled = await pollMediaJobProof('music_generation', route, localMediaJobResponse(job) as Record<string, unknown>, options)
    return polled.result
  } catch (error) {
    return normalizeCoreProofRouteResult('music_generation', route, {
      success: false,
      executed: false,
      status: 'failed',
      blocker: error instanceof Error ? error.message : 'Music proof execution failed.',
    })
  }
}

async function runLiveCapabilityProof(
  spec: CoreProofCapabilitySpec,
  options: CoreProofPackOptions,
  context: { ttsAudioSource: CoreProofAudioSource | null },
): Promise<CoreProofCapabilityResult> {
  if (spec.capability === 'image_generation') return runLiveImageProof(options)
  if (spec.capability === 'music_generation') return runLiveMusicProof(options)
  if (spec.capability === 'tts') {
    const tts = await runLiveTtsProof(options)
    context.ttsAudioSource = tts.result.status === 'proven' ? tts.audioSource : null
    return tts.result
  }
  if (spec.capability === 'stt') return runLiveSttProof(context.ttsAudioSource)
  return blockedLiveCapability(spec.capability, `Live proof pack A does not run ${spec.capability}.`)
}

export async function runCoreCapabilityProofPack(options: CoreProofPackOptions = {}): Promise<CoreProofPackResult> {
  const truth = await getCapabilityRuntimeTruth()
  const truthByCapability = new Map(truth.map((entry) => [entry.capabilityId, entry]))
  const mode: CoreProofMode = options.live ? 'live' : 'status'
  const requestedCapabilities = options.capabilities?.length
    ? Array.from(new Set(options.capabilities))
    : (options.live ? [...LIVE_MEDIA_PROOF_CAPABILITIES] : CORE_PROOF_CAPABILITIES.map((spec) => spec.capability))

  if (!options.live) {
    const capabilities = CORE_PROOF_CAPABILITIES.map((spec) => statusOnlyCapabilityResult(spec, truthByCapability.get(spec.capability)))
    return {
      success: capabilities.every((entry) => entry.status === 'proven'),
      mode,
      ranAt: new Date().toISOString(),
      requestedCapabilities,
      selectedCapabilities: capabilities.map((entry) => entry.capability),
      rejectedCapabilities: [],
      liveExecutionAttempted: false,
      capabilities,
    }
  }

  const { selected, rejected } = resolveLiveCoreProofCapabilities(options.capabilities)
  const context = { ttsAudioSource: null as CoreProofAudioSource | null }
  const capabilities: CoreProofCapabilityResult[] = [...rejected]

  for (const spec of selected) {
    const entry = truthByCapability.get(spec.capability)
    if (entry?.status === 'missing' || entry?.status === 'blocked') {
      capabilities.push(statusOnlyCapabilityResult(spec, entry))
      continue
    }
    capabilities.push(await runLiveCapabilityProof(spec, options, context))
  }

  return {
    success: capabilities.every((entry) => entry.status === 'proven'),
    mode,
    ranAt: new Date().toISOString(),
    requestedCapabilities,
    selectedCapabilities: selected.map((entry) => entry.capability),
    rejectedCapabilities: rejected.map((entry) => entry.capability),
    liveExecutionAttempted: selected.length > 0,
    capabilities,
  }
}
