/**
 * Canonical capability runtime truth.
 *
 * Each capability is evaluated against live provider state from
 * provider-runtime-truth.ts. No capability is marked "working" from
 * metadata or route existence alone.
 *
 * Status rules:
 *   working        — connected provider + route + proof state ≠ route_only
 *   wired_unproven — provider has key + route exists, but no live proof yet
 *   blocked        — provider present but missing key/endpoint/storage/permission
 *   missing        — no provider candidate is connected or configured
 */

import { getProviderRuntimeTruth, type ProviderRuntimeTruthEntry } from '@/lib/provider-runtime-truth'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

// ── Public types ──────────────────────────────────────────────────────────────

export type CapabilityStatus = 'working' | 'wired_unproven' | 'blocked' | 'missing'
export type ProofStatus = 'passed' | 'failed' | 'not_tested' | 'route_only'

export interface CapabilityRuntimeTruthEntry {
  capabilityId: string
  label: string
  category: 'text' | 'image' | 'video' | 'audio' | 'system'
  status: CapabilityStatus
  providerCandidates: string[]
  connectedProviderCandidates: string[]
  hasRequiredKey: boolean
  hasRequiredEndpoint: boolean
  hasExecutionRoute: boolean
  hasStorage: boolean
  hasPermission: boolean
  proofStatus: ProofStatus
  blocker: string
  nextAction: string
}

// ── Capability definitions (static metadata only) ─────────────────────────────

interface CapabilitySpec {
  capabilityId: string
  label: string
  category: CapabilityRuntimeTruthEntry['category']
  providerCandidates: string[]
  /** Execution route path, or null if not yet wired */
  executionRoute: string | null
  /** Whether artifact storage is required to complete the capability */
  requiresStorage: boolean
  /** Whether an adult permission gate is required */
  requiresAdultGate: boolean
  /** Whether a dedicated external endpoint (beyond the API key) is required */
  requiresDedicatedEndpoint: boolean
  /** Env var names for required dedicated endpoints (any one non-empty = satisfied) */
  dedicatedEndpointEnvs?: string[]
  /** When true this capability is purely a storage/system operation — no provider key needed */
  storageOnly?: boolean
}

const CAPABILITY_SPECS: CapabilitySpec[] = [
  // ── Text / Chat ──────────────────────────────────────────────────────────
  {
    capabilityId: 'chat',
    label: 'Text / Chat',
    category: 'text',
    providerCandidates: ['groq', 'together', 'genx', 'huggingface'],
    executionRoute: '/api/brain/request',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'streaming_chat',
    label: 'Streaming Chat',
    category: 'text',
    providerCandidates: ['groq', 'together', 'genx'],
    executionRoute: '/api/brain/stream',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'reasoning_code',
    label: 'Reasoning / Code',
    category: 'text',
    providerCandidates: ['groq', 'together', 'genx'],
    executionRoute: '/api/brain/execute',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'embeddings',
    label: 'Embeddings',
    category: 'text',
    providerCandidates: ['huggingface', 'together', 'genx'],
    executionRoute: '/api/brain/embeddings',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'rag',
    label: 'RAG / Knowledge Base',
    category: 'system',
    providerCandidates: ['huggingface', 'together', 'genx'],
    executionRoute: '/api/admin/rag/query',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'rerank',
    label: 'Rerank',
    category: 'text',
    providerCandidates: ['huggingface', 'together'],
    executionRoute: '/api/brain/rerank',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  // ── Image ────────────────────────────────────────────────────────────────
  {
    capabilityId: 'image_generation',
    label: 'Image Generation',
    category: 'image',
    providerCandidates: ['together', 'genx'],
    executionRoute: '/api/brain/image',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'image_edit',
    label: 'Image Edit',
    category: 'image',
    providerCandidates: ['huggingface'],
    executionRoute: '/api/brain/image-edit',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  // ── Video ────────────────────────────────────────────────────────────────
  {
    capabilityId: 'video_generation',
    label: 'Video Generation',
    category: 'video',
    providerCandidates: ['genx'],
    executionRoute: '/api/brain/video-generate',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'image_to_video',
    label: 'Image to Video',
    category: 'video',
    providerCandidates: ['genx'],
    executionRoute: '/api/brain/video-generate',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'long_form_video',
    label: 'Long-form Video',
    category: 'video',
    providerCandidates: ['genx'],
    executionRoute: '/api/brain/long-form-video',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  // ── Audio ────────────────────────────────────────────────────────────────
  {
    capabilityId: 'tts',
    label: 'Text-to-Speech',
    category: 'audio',
    providerCandidates: ['genx', 'groq', 'huggingface'],
    executionRoute: '/api/brain/tts',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'stt',
    label: 'Speech-to-Text',
    category: 'audio',
    providerCandidates: ['genx', 'groq', 'huggingface'],
    executionRoute: '/api/brain/stt',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'music_generation',
    label: 'Music / Audio Generation',
    category: 'audio',
    providerCandidates: ['genx'],
    executionRoute: '/api/admin/music-studio',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'voice_clone',
    label: 'Voice Clone',
    category: 'audio',
    providerCandidates: ['huggingface'],
    executionRoute: null,
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_AVATAR_VOICE_ENDPOINT'],
  },
  // ── Avatars ──────────────────────────────────────────────────────────────
  {
    capabilityId: 'memory',
    label: 'Memory',
    category: 'system',
    providerCandidates: [],
    executionRoute: '/api/admin/memory',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
    storageOnly: true,
  },
  {
    capabilityId: 'brand_memory',
    label: 'Brand Memory',
    category: 'system',
    providerCandidates: [],
    executionRoute: '/api/admin/brand-memory',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
    storageOnly: true,
  },
  {
    capabilityId: 'avatar_generation',
    label: 'Avatar Generation',
    category: 'image',
    providerCandidates: ['huggingface'],
    executionRoute: null,
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_AVATAR_IMAGE_ENDPOINT'],
  },
  {
    capabilityId: 'avatar_lipsync',
    label: 'Avatar Lip-sync / Talking Video',
    category: 'video',
    providerCandidates: ['genx'],
    executionRoute: '/api/brain/avatar-video',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['GENX_AVATAR_VIDEO_MODEL', 'GENX_LIPSYNC_MODEL', 'KLING_AVATAR_MODEL'],
  },
  // ── Adult-gated ───────────────────────────────────────────────────────────
  {
    capabilityId: 'adult_avatar',
    label: 'Adult Avatar (Gated)',
    category: 'image',
    providerCandidates: ['huggingface'],
    executionRoute: null,
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_ADULT_IMAGE_ENDPOINT', 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK'],
  },
  {
    capabilityId: 'adult_text',
    label: 'Adult Text (Gated)',
    category: 'text',
    providerCandidates: ['huggingface', 'together'],
    executionRoute: '/api/brain/adult-text',
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_ADULT_TEXT_ENDPOINT', 'HF_ADULT_TEXT_ENDPOINT_FALLBACK', 'TOGETHER_ADULT_TEXT_MODEL'],
  },
  {
    capabilityId: 'adult_image',
    label: 'Adult Image (Gated)',
    category: 'image',
    providerCandidates: ['huggingface', 'together'],
    executionRoute: '/api/brain/adult-image',
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_ADULT_IMAGE_ENDPOINT', 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK', 'TOGETHER_ADULT_IMAGE_MODEL'],
  },
  {
    capabilityId: 'adult_video',
    label: 'Adult Video (Gated)',
    category: 'video',
    providerCandidates: ['huggingface'],
    executionRoute: null,
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_ADULT_VIDEO_ENDPOINT', 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK'],
  },
  {
    capabilityId: 'adult_voice',
    label: 'Adult Voice (Gated)',
    category: 'audio',
    providerCandidates: ['huggingface'],
    executionRoute: '/api/brain/tts',
    requiresStorage: true,
    requiresAdultGate: true,
    requiresDedicatedEndpoint: true,
    dedicatedEndpointEnvs: ['HF_ADULT_VOICE_ENDPOINT', 'HF_ADULT_VOICE_ENDPOINT_FALLBACK'],
  },
  // ── System ───────────────────────────────────────────────────────────────
  {
    capabilityId: 'website_scraping',
    label: 'Website Scraping',
    category: 'system',
    providerCandidates: ['local-crawler', 'playwright'],
    executionRoute: '/api/brain/research',
    requiresStorage: false,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'campaigns',
    label: 'Campaigns',
    category: 'system',
    providerCandidates: ['genx', 'groq', 'together'],
    executionRoute: '/api/admin/campaigns',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
  },
  {
    capabilityId: 'assets',
    label: 'Assets / Artifacts',
    category: 'system',
    providerCandidates: [],
    executionRoute: '/api/admin/artifacts',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
    storageOnly: true,
  },
  {
    capabilityId: 'approvals',
    label: 'Approvals',
    category: 'system',
    providerCandidates: [],
    executionRoute: '/api/admin/approvals',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
    storageOnly: true,
  },
  {
    capabilityId: 'scheduler',
    label: 'Scheduler / Publishing',
    category: 'system',
    providerCandidates: [],
    executionRoute: '/api/admin/scheduler',
    requiresStorage: true,
    requiresAdultGate: false,
    requiresDedicatedEndpoint: false,
    storageOnly: true,
  },
]

// ── Evaluation ─────────────────────────────────────────────────────────────

function evalEndpoint(spec: CapabilitySpec): boolean {
  if (!spec.requiresDedicatedEndpoint) return true
  const envs = spec.dedicatedEndpointEnvs ?? []
  return envs.some((name) => {
    if (!process.env[name]?.trim()) return false
    if (name.startsWith('TOGETHER_ADULT_')) return process.env.TOGETHER_ADULT_FALLBACK_ENABLED === 'true'
    return true
  })
}

function evalStorage(): boolean {
  return checkWritable(LOCAL_STORE_FILES.artifacts).writable
}

function evalAdultGate(): boolean {
  // Gate: ADULT_MODE_ENABLED env or HF_ADULT_TEXT_ENDPOINT configured.
  // We do not re-test the full adult-capability live here — that is the
  // responsibility of /api/admin/settings/test-adult.
  // We only verify a permissive structural check.
  return Boolean(
    process.env.ADULT_MODE_ENABLED === 'true' ||
    process.env.HF_ADULT_TEXT_ENDPOINT?.trim()
  )
}

function buildEntry(
  spec: CapabilitySpec,
  providers: ProviderRuntimeTruthEntry[],
  storageOk: boolean,
  adultGateOk: boolean,
): CapabilityRuntimeTruthEntry {
  const providerMap = new Map(providers.map((p) => [p.providerId, p]))

  const candidates = spec.providerCandidates
  const connectedCandidates = candidates.filter((id) => providerMap.get(id as never)?.connected)
  const configuredCandidates = candidates.filter((id) => providerMap.get(id as never)?.configured)

  const hasRoute = Boolean(spec.executionRoute)
  const hasEndpoint = evalEndpoint(spec)
  const hasStorage = !spec.requiresStorage || storageOk
  const hasPermission = !spec.requiresAdultGate || adultGateOk

  // For storage-only capabilities (no provider key needed)
  const hasRequiredKey = spec.storageOnly
    ? true
    : connectedCandidates.length > 0 || configuredCandidates.length > 0

  let status: CapabilityStatus
  let proofStatus: ProofStatus
  let blocker = ''
  let nextAction = ''

  if (spec.storageOnly) {
    // Storage/system-only: no provider key required
    if (!hasStorage) {
      status = 'blocked'
      proofStatus = 'not_tested'
      blocker = 'Storage not writable'
      nextAction = 'Check storage configuration in Settings'
    } else if (!hasPermission) {
      status = 'blocked'
      proofStatus = 'not_tested'
      blocker = 'Adult permission gate not configured'
      nextAction = 'Enable adult mode in Settings'
    } else if (!hasRoute) {
      status = 'missing'
      proofStatus = 'route_only'
      blocker = 'No execution route wired'
      nextAction = 'Wire execution route'
    } else {
      // Storage ops are self-proven when storage is writable
      status = 'working'
      proofStatus = 'passed'
    }
    return {
      capabilityId: spec.capabilityId,
      label: spec.label,
      category: spec.category,
      status,
      providerCandidates: candidates,
      connectedProviderCandidates: connectedCandidates,
      hasRequiredKey: true,
      hasRequiredEndpoint: hasEndpoint,
      hasExecutionRoute: hasRoute,
      hasStorage,
      hasPermission,
      proofStatus,
      blocker,
      nextAction,
    }
  }

  // Evaluate hard blockers in priority order
  if (connectedCandidates.length === 0 && configuredCandidates.length === 0 && candidates.length > 0) {
    status = 'missing'
    proofStatus = 'not_tested'
    blocker = `No configured provider for: ${candidates.join(', ')}`
    nextAction = `Add and test a key for ${candidates[0]} in Settings`
  } else if (connectedCandidates.length === 0 && configuredCandidates.length > 0) {
    // Has key but test not passed
    const firstConfigured = configuredCandidates[0]
    const pEntry = providerMap.get(firstConfigured as never)
    if (pEntry?.lastTestStatus === 'failed') {
      status = 'blocked'
      proofStatus = 'failed'
      blocker = `${firstConfigured} last test failed`
      nextAction = `Re-run the ${firstConfigured} live test in Settings`
    } else {
      status = 'wired_unproven'
      proofStatus = 'not_tested'
      blocker = `${firstConfigured} key saved but live test not yet passed`
      nextAction = `Run the ${firstConfigured} live test in Settings`
    }
  } else if (!hasEndpoint) {
    status = 'blocked'
    proofStatus = 'not_tested'
    blocker = `requires_endpoint: set ${(spec.dedicatedEndpointEnvs ?? []).join(' or ')}`
    nextAction = `Configure the dedicated endpoint in Settings`
  } else if (!hasStorage) {
    status = 'blocked'
    proofStatus = 'not_tested'
    blocker = 'Storage not writable'
    nextAction = 'Check storage configuration in Settings'
  } else if (!hasPermission) {
    status = 'blocked'
    proofStatus = 'not_tested'
    blocker = 'Adult permission gate not configured'
    nextAction = 'Enable adult mode and configure HF adult endpoint in Settings'
  } else if (!hasRoute) {
    status = 'wired_unproven'
    proofStatus = 'route_only'
    blocker = 'No execution route wired'
    nextAction = 'Wire execution route'
  } else if (connectedCandidates.length > 0) {
    // Connected provider + route — check if any provider has actually passed a media/execution test
    // For text providers: chat test passing = sufficient proof
    // For media providers: we conservatively mark wired_unproven until a live media test passes
    const mediaCategory = spec.category === 'image' || spec.category === 'video' || spec.category === 'audio'
    if (mediaCategory) {
      // Media capabilities require more than a chat test
      // Check if any connected provider has a lastTestStatus of 'passed' and the spec
      // doesn't require extra verification (no dedicated endpoint needed)
      const hasMediaProof = connectedCandidates.some((id) => {
        const p = providerMap.get(id as never)
        return p?.connected && !spec.requiresDedicatedEndpoint
      })
      if (hasMediaProof && !spec.requiresDedicatedEndpoint) {
        status = 'wired_unproven'
        proofStatus = 'not_tested'
        blocker = ''
        nextAction = `Run a live ${spec.label} generation to prove end-to-end`
      } else {
        status = 'wired_unproven'
        proofStatus = 'not_tested'
        blocker = spec.requiresDedicatedEndpoint ? `requires_endpoint: set ${(spec.dedicatedEndpointEnvs ?? []).join(' or ')}` : ''
        nextAction = `Configure dedicated endpoint and run live test`
      }
    } else {
      // Text/system: connected provider + route = working
      status = 'working'
      proofStatus = 'passed'
      blocker = ''
      nextAction = ''
    }
  } else {
    status = 'missing'
    proofStatus = 'not_tested'
    blocker = candidates.length === 0 ? 'No provider candidates defined' : `No provider configured for ${candidates.join(', ')}`
    nextAction = candidates.length > 0 ? `Add a key for ${candidates[0]} in Settings` : ''
  }

  return {
    capabilityId: spec.capabilityId,
    label: spec.label,
    category: spec.category,
    status,
    providerCandidates: candidates,
    connectedProviderCandidates: connectedCandidates,
    hasRequiredKey,
    hasRequiredEndpoint: hasEndpoint,
    hasExecutionRoute: hasRoute,
    hasStorage,
    hasPermission,
    proofStatus,
    blocker,
    nextAction,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getCapabilityRuntimeTruth(): Promise<CapabilityRuntimeTruthEntry[]> {
  const [providers, storageOk, adultGateOk] = await Promise.all([
    getProviderRuntimeTruth(),
    Promise.resolve(evalStorage()),
    Promise.resolve(evalAdultGate()),
  ])
  return CAPABILITY_SPECS.map((spec) => buildEntry(spec, providers, storageOk, adultGateOk))
}

export async function getCapabilityRuntimeTruthEntry(
  capabilityId: string,
): Promise<CapabilityRuntimeTruthEntry | null> {
  const spec = CAPABILITY_SPECS.find((s) => s.capabilityId === capabilityId)
  if (!spec) return null
  const [providers, storageOk, adultGateOk] = await Promise.all([
    getProviderRuntimeTruth(),
    Promise.resolve(evalStorage()),
    Promise.resolve(evalAdultGate()),
  ])
  return buildEntry(spec, providers, storageOk, adultGateOk)
}
