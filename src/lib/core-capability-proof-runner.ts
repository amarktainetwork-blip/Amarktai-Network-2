import { getCapabilityRuntimeTruth, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'

export type CoreProofStatus = 'proven' | 'needs_proof' | 'blocked' | 'failed' | 'not_configured' | 'processing'

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
  ranAt: string
  capabilities: CoreProofCapabilityResult[]
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
  const processing = Boolean(jobId || pollUrl) && !Boolean(artifactId && storageUrl)
  const missingConfig = /missing|not configured|needs_setup|requires_endpoint|no connected provider/i.test(blocker ?? String(jobStatus ?? ''))
  const status: CoreProofStatus =
    executed && completed && Boolean(artifactId && storageUrl) ? 'proven' :
    processing ? 'needs_proof' :
    missingConfig ? 'not_configured' :
    blocker ? 'failed' :
    'needs_proof'

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
    proofStatus: firstString(data.proofStatus, proof.proofStatus, result.proofStatus),
    blocker,
    nextAction: firstString(data.nextAction, result.nextAction),
    attempts,
  }
}

export async function runCoreCapabilityProofPack(): Promise<CoreProofPackResult> {
  const truth = await getCapabilityRuntimeTruth()
  const truthByCapability = new Map(truth.map((entry) => [entry.capabilityId, entry]))
  const capabilities = CORE_PROOF_CAPABILITIES.map((spec): CoreProofCapabilityResult => {
    const entry = truthByCapability.get(spec.capability)
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
  })

  return {
    success: capabilities.every((entry) => entry.status === 'proven'),
    ranAt: new Date().toISOString(),
    capabilities,
  }
}
