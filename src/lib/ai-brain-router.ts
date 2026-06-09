import {
  getUniversalModelCatalog,
  type UniversalModelRoute,
} from '@/lib/universal-model-catalog'
import {
  getCapabilityGovernanceMatrix,
  normalizeGovernedCapability,
  type GovernedCapability,
  type GovernedModel,
} from '@/lib/provider-capability-governance'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export type ModelTruthLayer = 'discovered' | 'tested' | 'approved' | 'routed'
export type ModelRouteStatus = 'available' | 'degraded' | 'blocked' | 'untested'

export interface BrainModelRoute {
  provider: string
  modelId: string
  displayName: string
  capabilities: string[]
  costTier: string
  source: string
  configured: boolean
  connected: boolean
  tested: boolean
  approved: boolean
  routed: boolean
  routePresent: boolean
  artifacts: boolean
  polling: boolean
  execution: string
  status: ModelRouteStatus
  blocker: string
  truthLayer: ModelTruthLayer
}

export interface BrainFallbackChain {
  capability: GovernedCapability
  primary: BrainModelRoute | null
  fallbacks: BrainModelRoute[]
  status: 'available' | 'degraded' | 'blocked'
  blocker: string
}

export interface ModelBrainTruth {
  generatedAt: string
  counts: {
    discovered: number
    tested: number
    approved: number
    routed: number
    byProvider: Record<string, {
      discovered: number
      tested: number
      approved: number
      routed: number
    }>
  }
  providers: Array<{
    key: string
    label: string
    connected: boolean
    configured: boolean
    status: string
    capabilities: string[]
  }>
  discoveredModels: BrainModelRoute[]
  testedModels: BrainModelRoute[]
  approvedModels: BrainModelRoute[]
  routedModels: BrainModelRoute[]
  fallbackChains: BrainFallbackChain[]
  notes: string[]
}

export interface SelectBestModelInput {
  taskType?: string
  capability?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  qualityMode?: 'fast' | 'balanced' | 'best'
  adultMode?: boolean
  requiresArtifact?: boolean
  requiresTools?: boolean
  requiresVision?: boolean
  requiresCode?: boolean
  providerPreference?: string
  excludedProviders?: string[]
}

export interface SelectBestModelResult {
  ok: boolean
  capability: GovernedCapability | null
  selected: BrainModelRoute | null
  fallbackChain: BrainModelRoute[]
  blocker: string
  reason: string
}

function key(provider: string, modelId: string) {
  return `${provider}:${modelId}`
}

function universalToBrain(
  model: UniversalModelRoute,
  runtimeProvider: Map<string, { connected?: boolean; configured?: boolean; status?: string; capabilities?: string[] }>,
  governed: Map<string, GovernedModel>,
): BrainModelRoute {
  const runtime = runtimeProvider.get(model.provider)
  const governedModel = governed.get(key(model.provider, model.modelId))
  const configured = Boolean(model.configured || runtime?.configured)
  const connected = Boolean(runtime?.connected)
  const tested = connected && configured
  const approved = Boolean(governedModel?.approved)
  const routed = Boolean(governedModel?.approved && governedModel.routePresent)
  const truthLayer: ModelTruthLayer = routed ? 'routed' : approved ? 'approved' : tested ? 'tested' : 'discovered'
  const blocker = routed
    ? ''
    : approved
      ? 'Model is approved but not route-present for live execution.'
      : tested
        ? 'Model/provider is tested but not approved for live routing.'
        : 'Model is discovered only and cannot be used for live execution.'

  return {
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.displayName,
    capabilities: model.capabilities,
    costTier: model.costTier,
    source: model.source,
    configured,
    connected,
    tested,
    approved,
    routed,
    routePresent: Boolean(governedModel?.routePresent),
    artifacts: Boolean(governedModel?.artifacts),
    polling: Boolean(governedModel?.polling),
    execution: governedModel?.execution ?? 'unknown',
    status: routed ? 'available' : tested ? 'degraded' : 'untested',
    blocker,
    truthLayer,
  }
}

function governedToBrain(
  model: GovernedModel,
  runtimeProvider: Map<string, { connected?: boolean; configured?: boolean; status?: string; capabilities?: string[] }>,
): BrainModelRoute {
  const runtime = runtimeProvider.get(model.provider)
  const configured = Boolean(runtime?.configured)
  const connected = Boolean(runtime?.connected)
  const tested = connected && configured
  const routed = Boolean(model.approved && model.routePresent)
  const truthLayer: ModelTruthLayer = routed ? 'routed' : model.approved ? 'approved' : tested ? 'tested' : 'discovered'
  const blocker = routed
    ? ''
    : model.approved
      ? 'Approved model is missing a route-present execution path.'
      : 'Governance model is not approved for live execution.'

  return {
    provider: model.provider,
    modelId: model.modelId,
    displayName: model.label,
    capabilities: model.capabilities,
    costTier: 'unknown',
    source: 'governance',
    configured,
    connected,
    tested,
    approved: model.approved,
    routed,
    routePresent: model.routePresent,
    artifacts: model.artifacts,
    polling: model.polling,
    execution: model.execution,
    status: routed ? 'available' : model.approved ? 'degraded' : 'blocked',
    blocker,
    truthLayer,
  }
}

function incrementProvider(
  byProvider: ModelBrainTruth['counts']['byProvider'],
  model: BrainModelRoute,
) {
  byProvider[model.provider] ??= { discovered: 0, tested: 0, approved: 0, routed: 0 }
  byProvider[model.provider].discovered += 1
  if (model.tested) byProvider[model.provider].tested += 1
  if (model.approved) byProvider[model.provider].approved += 1
  if (model.routed) byProvider[model.provider].routed += 1
}

function uniqueModels(models: BrainModelRoute[]) {
  const byKey = new Map<string, BrainModelRoute>()

  for (const raw of models) {
    const model: BrainModelRoute = {
      ...raw,
      capabilities: sanitizeCapabilities(raw),
    }
    const id = key(model.provider, model.modelId)
    const existing = byKey.get(id)

    if (!existing) {
      byKey.set(id, model)
      continue
    }

    const merged: BrainModelRoute = {
      ...existing,
      capabilities: sanitizeCapabilities({
        ...existing,
        capabilities: [...new Set([...existing.capabilities, ...model.capabilities])],
      }),
      configured: existing.configured || model.configured,
      connected: existing.connected || model.connected,
      tested: existing.tested || model.tested,
      approved: existing.approved || model.approved,
      routed: existing.routed || model.routed,
      routePresent: existing.routePresent || model.routePresent,
      artifacts: existing.artifacts || model.artifacts,
      polling: existing.polling || model.polling,
      execution: existing.execution !== 'unknown' ? existing.execution : model.execution,
      status: existing.routed || model.routed
        ? 'available'
        : existing.approved || model.approved
          ? 'degraded'
          : existing.tested || model.tested
            ? 'degraded'
            : 'untested',
      blocker: existing.routed || model.routed ? '' : existing.blocker || model.blocker,
      truthLayer: existing.routed || model.routed
        ? 'routed'
        : existing.approved || model.approved
          ? 'approved'
          : existing.tested || model.tested
            ? 'tested'
            : 'discovered',
    }

    byKey.set(id, merged)
  }

  return [...byKey.values()]
}

function sortModels(models: BrainModelRoute[]) {
  return [...models].sort((a, b) => {
    const statusScore = Number(b.routed) - Number(a.routed)
      || Number(b.approved) - Number(a.approved)
      || Number(b.tested) - Number(a.tested)
    if (statusScore) return statusScore
    const providerScore = (a.provider === 'genx' ? 1 : 0) - (b.provider === 'genx' ? 1 : 0)
    if (providerScore) return providerScore
    return `${a.provider}:${a.modelId}`.localeCompare(`${b.provider}:${b.modelId}`)
  })
}

function isNonChatTaskRoute(model: Pick<BrainModelRoute, 'modelId' | 'provider'>): boolean {
  const id = model.modelId.toLowerCase()
  if (!id.startsWith('task:')) return false
  if (id === 'task:text') return false
  return /image|speech-to-text|text-to-speech|embedding|voice|tts|stt/.test(id)
}

function sanitizeCapabilities(model: BrainModelRoute): string[] {
  const capabilities = new Set(model.capabilities)

  // Task routes are not generic chat routes unless they are explicitly text.
  if (isNonChatTaskRoute(model)) capabilities.delete('chat')

  // Voice/media/embedding task IDs must not leak into chat selection.
  const id = model.modelId.toLowerCase()
  if (/speech-to-text|stt/.test(id)) {
    capabilities.delete('chat')
    capabilities.add('stt')
    capabilities.add('STT')
  }
  if (/text-to-speech|tts/.test(id)) {
    capabilities.delete('chat')
    capabilities.add('tts')
    capabilities.add('voice/TTS')
  }
  if (/embedding/.test(id)) {
    capabilities.delete('chat')
    capabilities.add('embeddings')
    capabilities.add('embeddings/moderation')
  }
  if (/task:image/.test(id)) {
    capabilities.delete('chat')
    capabilities.add('image')
    capabilities.add('image_generation')
  }
  if (/task:video/.test(id)) {
    capabilities.delete('chat')
    capabilities.add('video')
    capabilities.add('video_generation')
  }

  return [...capabilities]
}

const CAPABILITY_MATCHES: Record<string, string[]> = {
  chat: ['chat'],
  reasoning: ['reasoning'],
  coding: ['coding', 'code', 'repo_audit', 'repo_patch'],
  repo_audit: ['repo_audit', 'coding', 'code'],
  image_generation: ['image_generation', 'image'],
  image_editing: ['image_editing', 'image'],
  image_to_video: ['image_to_video', 'video', 'video_generation'],
  video_generation: ['video_generation', 'video'],
  music_generation: ['music_generation', 'song_generation', 'instrumental_music', 'music/audio', 'audio'],
  song_generation: ['song_generation', 'music_generation', 'music/audio', 'audio'],
  lyrics_generation: ['lyrics_generation', 'chat'],
  instrumental_music: ['instrumental_music', 'music_generation', 'music/audio', 'audio'],
  tts: ['tts', 'voice/TTS'],
  stt: ['stt', 'STT'],
  voice_selection: ['voice_selection', 'tts', 'voice/TTS'],
  voice_cloning: ['voice_cloning', 'tts', 'voice/TTS'],
  avatar_video: ['avatar_video', 'video_generation', 'video'],
  embeddings: ['embeddings', 'embeddings/moderation'],
  rag: ['rag', 'embeddings', 'embeddings/moderation'],
  moderation: ['moderation', 'embeddings/moderation'],
  adult_text: ['adult_text', 'chat'],
  adult_image: ['adult_image', 'image_generation', 'image'],
  adult_video: ['adult_video', 'video_generation', 'video'],
  adult_voice: ['adult_voice', 'tts', 'voice/TTS'],
  audio: ['audio', 'music/audio', 'tts', 'stt'],
  app_memory: ['app_memory', 'rag', 'embeddings'],
  artifacts: ['artifacts'],
  operations: ['operations'],
  research: ['research', 'chat', 'reasoning'],
  crawling: ['crawling'],
  browser_qa: ['browser_qa'],
}

function modelSupportsCapability(model: BrainModelRoute, capability: string): boolean {
  const caps = new Set(sanitizeCapabilities(model))
  const allowed = CAPABILITY_MATCHES[capability] ?? [capability]

  // Chat is strict: only real text/chat models may be selected.
  if (capability === 'chat') {
    if (isNonChatTaskRoute(model)) return false
    return caps.has('chat')
  }

  return allowed.some((candidate) => caps.has(candidate))
}

function toGovernedCapability(input: SelectBestModelInput): GovernedCapability | null {
  if (input.capability) return normalizeGovernedCapability(input.capability)
  const task = (input.taskType || '').toLowerCase()
  if (/repo|patch|code|frontend|backend/.test(task)) return 'coding'
  if (/image/.test(task)) return input.adultMode ? 'adult_image' : 'image_generation'
  if (/video/.test(task)) return input.adultMode ? 'adult_video' : 'video_generation'
  if (/music|song|audio/.test(task)) return 'music_generation'
  if (/tts|voice/.test(task)) return input.adultMode ? 'adult_voice' : 'tts'
  if (/stt|transcri/.test(task)) return 'stt'
  if (/adult/.test(task)) return 'adult_text'
  if (/reason/.test(task)) return 'reasoning'
  return 'chat'
}

export async function getModelBrainTruth(): Promise<ModelBrainTruth> {
  const [universal, governance, runtime] = await Promise.all([
    getUniversalModelCatalog(),
    Promise.resolve(getCapabilityGovernanceMatrix()),
    getDashboardRuntimeTruth(),
  ])

  const runtimeProvider = new Map(runtime.providers.map((provider) => [provider.key, provider]))
  const governed = new Map(governance.models.map((model) => [key(model.provider, model.modelId), model]))

  const discoveredFromUniversal = universal.models.map((model) => universalToBrain(model, runtimeProvider, governed))
  const governedRoutes = governance.models.map((model) => governedToBrain(model, runtimeProvider))
  const discoveredModels = uniqueModels([...discoveredFromUniversal, ...governedRoutes])
  const testedModels = discoveredModels.filter((model) => model.tested)
  const approvedModels = discoveredModels.filter((model) => model.approved)
  const routedModels = discoveredModels.filter((model) => model.routed)

  const byProvider: ModelBrainTruth['counts']['byProvider'] = {}
  for (const model of discoveredModels) incrementProvider(byProvider, model)

  const fallbackChains: BrainFallbackChain[] = governance.capabilities.map((capability) => {
    const routed = sortModels(routedModels.filter((model) =>
      modelSupportsCapability(model, capability.capability),
    ))
    return {
      capability: capability.capability,
      primary: routed[0] ?? null,
      fallbacks: routed.slice(1),
      status: routed.length ? 'available' : approvedModels.some((model) => modelSupportsCapability(model, capability.capability)) ? 'degraded' : 'blocked',
      blocker: routed.length ? '' : capability.blocker ?? 'No approved routed model is available for this capability.',
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      discovered: discoveredModels.length,
      tested: testedModels.length,
      approved: approvedModels.length,
      routed: routedModels.length,
      byProvider,
    },
    providers: runtime.providers.map((provider) => ({
      key: provider.key,
      label: provider.displayName,
      connected: Boolean(provider.connected),
      configured: provider.configured,
      status: provider.status,
      capabilities: provider.capabilities ?? [],
    })),
    discoveredModels,
    testedModels,
    approvedModels,
    routedModels,
    fallbackChains,
    notes: [
      'Discovered means known from live/static/task catalog.',
      'Tested means the provider is configured and connected.',
      'Approved means governance allows the model.',
      'Routed means the model has an approved route-present execution path.',
      'Discovered-only models are never used for live execution.',
    ],
  }
}

export async function selectBestModelForTask(input: SelectBestModelInput): Promise<SelectBestModelResult> {
  const truth = await getModelBrainTruth()
  const capability = toGovernedCapability(input)
  if (!capability) {
    return {
      ok: false,
      capability: null,
      selected: null,
      fallbackChain: [],
      blocker: 'Unknown capability.',
      reason: 'The request could not be mapped to a governed capability.',
    }
  }

  const chain = truth.fallbackChains.find((entry) => entry.capability === capability)
  const candidates = sortModels(
    truth.routedModels.filter((model) =>
      modelSupportsCapability(model, capability)
      && (!input.providerPreference || model.provider === input.providerPreference)
      && !(input.excludedProviders ?? []).includes(model.provider)
      && (!input.requiresArtifact || model.artifacts)
      && (!input.requiresVision || model.capabilities.some((cap) => /vision|image|video/.test(cap)))
      && (!input.requiresCode || model.capabilities.some((cap) => /coding|code|repo/.test(cap)))
    ),
  )

  const selected = candidates[0] ?? chain?.primary ?? null
  if (!selected) {
    return {
      ok: false,
      capability,
      selected: null,
      fallbackChain: chain?.fallbacks ?? [],
      blocker: chain?.blocker || `No approved routed model is available for ${capability}.`,
      reason: `No routed model could satisfy ${capability}.`,
    }
  }

  return {
    ok: true,
    capability,
    selected,
    fallbackChain: [selected, ...candidates.filter((model) => key(model.provider, model.modelId) !== key(selected.provider, selected.modelId))],
    blocker: '',
    reason: `${selected.provider}:${selected.modelId} selected for ${capability}.`,
  }
}
