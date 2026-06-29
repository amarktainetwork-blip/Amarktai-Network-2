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
  capabilities: CoreProofCapabilityResult[]
}

export interface CoreProofPackOptions {
  live?: boolean
  capabilities?: readonly string[]
  maxDurationSeconds?: number
  costMode?: CoreProofCostMode
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
  const storageUrl = firstString(data.storageUrl, data.imageUrl, data.videoUrl, data.audioUrl, artifact.storageUrl, result.storageUrl)
  const jobId = firstString(data.jobId, job.jobId, result.jobId)
  const pollUrl = firstString(data.pollUrl, job.pollUrl, result.pollUrl)
  const blocker = firstString(data.blocker, data.error, result.blocker, result.error)
  const attempts = Array.isArray(data.attempts) ? data.attempts : Array.isArray(result.attempts) ? result.attempts : []
  const executed = data.executed === true || data.success === true
  const completed = ['completed', 'succeeded', 'success', 'generated'].includes(String(jobStatus ?? '').toLowerCase())
  const artifactReady = Boolean((artifactId || storageUrl) && isCompletedArtifactUrl(storageUrl))
  const processing = Boolean(jobId || pollUrl) && !Boolean(artifactId && storageUrl)
  const missingConfig = /missing|not configured|needs_setup|requires_endpoint|no connected provider/i.test(blocker ?? String(jobStatus ?? ''))
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

async function runLiveTtsProof(): Promise<{ result: CoreProofCapabilityResult; audioBase64: string | null }> {
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
    const result = normalizeCoreProofRouteResult('tts', route, data)
    return { result, audioBase64: typeof data.audioBase64 === 'string' ? data.audioBase64 : null }
  } catch (error) {
    return {
      result: normalizeCoreProofRouteResult('tts', '/api/brain/tts', {
        success: false,
        executed: false,
        status: 'failed',
        blocker: error instanceof Error ? error.message : 'TTS proof execution failed.',
      }),
      audioBase64: null,
    }
  }
}

function decodeDataUri(dataUri: string): { bytes: Buffer; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,([\s\S]+)$/)
  if (!match) return null
  return { bytes: Buffer.from(match[2], 'base64'), mimeType: match[1] }
}

async function runLiveSttProof(ttsAudioBase64: string | null): Promise<CoreProofCapabilityResult> {
  if (!ttsAudioBase64) {
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

  const decoded = decodeDataUri(ttsAudioBase64)
  if (!decoded?.bytes.length) {
    return normalizeCoreProofRouteResult('stt', '/api/brain/stt', {
      success: false,
      executed: false,
      status: 'failed',
      blocker: 'TTS proof audio could not be decoded for STT.',
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
  try {
    const { createMusic } = await import('@/lib/music-studio')
    const result = await createMusic({
      appSlug: 'amarktai-network',
      title: 'Core proof music',
      theme: PACK_A_PROMPTS.music_generation,
      prompt: PACK_A_PROMPTS.music_generation,
      genre: 'ambient',
      genres: ['ambient'],
      moods: ['calm'],
      vocalStyle: 'instrumental_only',
      instrumental: true,
      durationSeconds: Math.min(options.maxDurationSeconds ?? 10, 10),
      coverArtChoice: 'none',
      productionNotes: 'Core live media proof pack A.',
      qualityTier: 'standard',
    })
    const completed = result.status === 'generated' && Boolean(result.artifact.audioUrl)
    return normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
      success: completed,
      executed: completed,
      status: completed ? 'completed' : 'needs_setup',
      provider: result.artifact.musicProvider,
      model: result.artifact.lyricsModel,
      artifactId: completed ? result.artifact.id : null,
      storageUrl: completed ? result.artifact.audioUrl : null,
      audioUrl: completed ? result.artifact.audioUrl : null,
      blocker: completed ? null : result.message,
    })
  } catch (error) {
    return normalizeCoreProofRouteResult('music_generation', '/api/admin/music-studio', {
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
  context: { ttsAudioBase64: string | null },
): Promise<CoreProofCapabilityResult> {
  if (spec.capability === 'image_generation') return runLiveImageProof(options)
  if (spec.capability === 'music_generation') return runLiveMusicProof(options)
  if (spec.capability === 'tts') {
    const tts = await runLiveTtsProof()
    context.ttsAudioBase64 = tts.result.status === 'proven' ? tts.audioBase64 : null
    return tts.result
  }
  if (spec.capability === 'stt') return runLiveSttProof(context.ttsAudioBase64)
  return blockedLiveCapability(spec.capability, `Live proof pack A does not run ${spec.capability}.`)
}

export async function runCoreCapabilityProofPack(options: CoreProofPackOptions = {}): Promise<CoreProofPackResult> {
  const truth = await getCapabilityRuntimeTruth()
  const truthByCapability = new Map(truth.map((entry) => [entry.capabilityId, entry]))
  const mode: CoreProofMode = options.live ? 'live' : 'status'

  if (!options.live) {
    const capabilities = CORE_PROOF_CAPABILITIES.map((spec) => statusOnlyCapabilityResult(spec, truthByCapability.get(spec.capability)))
    return {
      success: capabilities.every((entry) => entry.status === 'proven'),
      mode,
      ranAt: new Date().toISOString(),
      capabilities,
    }
  }

  const { selected, rejected } = resolveLiveCoreProofCapabilities(options.capabilities)
  const context = { ttsAudioBase64: null as string | null }
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
    capabilities,
  }
}
