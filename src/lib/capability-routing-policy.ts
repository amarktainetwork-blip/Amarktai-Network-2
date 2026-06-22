import {
  getCapabilityDefinition,
  type AiCapabilityDefinition,
  type AiCapabilityProviderRoute,
} from '@/lib/ai-capability-taxonomy'
import { prisma } from '@/lib/prisma'
import { getProviderReadiness } from '@/lib/provider-registry'
import { rankProvidersForCapability } from '@/lib/provider-performance'
import {
  UNIVERSAL_MODEL_ROUTES,
  type UniversalCostTier,
} from '@/lib/universal-model-catalog'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export const ROUTING_QUALITY_TIERS = ['cheap', 'balanced', 'premium', 'auto', 'mixed'] as const
export type RoutingQualityTier = typeof ROUTING_QUALITY_TIERS[number]
export type StoredRoutingQualityTier = Exclude<RoutingQualityTier, 'mixed'>
export type RoutingSurface = 'studio' | 'connected_apps'

export interface CapabilityRouteCandidate {
  route: AiCapabilityProviderRoute
  model: string
  configured: boolean
  rank: number
}

export interface CapabilityRouteRejection {
  provider: ApprovedDirectProviderId
  model: string
  configured: boolean
  rank: number
  code: 'PROVIDER_NOT_CONFIGURED' | 'RUNTIME_FALLBACK_SELECTED'
  reason: string
}

export interface CapabilityRoutePlan {
  capability: string
  qualityTier: StoredRoutingQualityTier
  selected: CapabilityRouteCandidate | null
  candidates: CapabilityRouteCandidate[]
  fallback: CapabilityRouteCandidate[]
  rejectedCandidates: CapabilityRouteRejection[]
  setupRequired: boolean
  reason: string
}

const SURFACE_PROFILE: Record<RoutingSurface, string> = {
  studio: '__studio__',
  connected_apps: '__connected_apps__',
}

const PROVIDER_ORDER: Record<StoredRoutingQualityTier, Record<string, ApprovedDirectProviderId[]>> = {
  cheap: {
    text: ['groq', 'together', 'huggingface', 'mimo', 'genx'],
    image: ['huggingface', 'together', 'genx', 'mimo', 'groq'],
    video: ['genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['groq', 'huggingface', 'mimo', 'genx', 'together'],
    music: ['huggingface', 'genx', 'together', 'mimo', 'groq'],
    data: ['huggingface', 'together', 'genx', 'mimo', 'groq'],
  },
  balanced: {
    text: ['mimo', 'groq', 'together', 'genx', 'huggingface'],
    image: ['together', 'genx', 'huggingface', 'mimo', 'groq'],
    video: ['genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['groq', 'genx', 'huggingface', 'mimo', 'together'],
    music: ['genx', 'huggingface', 'together', 'mimo', 'groq'],
    data: ['huggingface', 'together', 'genx', 'mimo', 'groq'],
  },
  premium: {
    text: ['genx', 'mimo', 'together', 'groq', 'huggingface'],
    image: ['genx', 'together', 'huggingface', 'mimo', 'groq'],
    video: ['genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['genx', 'huggingface', 'groq', 'mimo', 'together'],
    music: ['genx', 'huggingface', 'together', 'mimo', 'groq'],
    data: ['genx', 'huggingface', 'together', 'mimo', 'groq'],
  },
  auto: {
    text: ['groq', 'mimo', 'together', 'genx', 'huggingface'],
    image: ['together', 'huggingface', 'genx', 'mimo', 'groq'],
    video: ['genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['groq', 'huggingface', 'genx', 'mimo', 'together'],
    music: ['huggingface', 'genx', 'together', 'mimo', 'groq'],
    data: ['huggingface', 'together', 'genx', 'mimo', 'groq'],
  },
}

const COST_RANK: Record<StoredRoutingQualityTier, UniversalCostTier[]> = {
  cheap: ['free', 'very_low', 'low', 'medium', 'high', 'premium', 'unknown'],
  balanced: ['low', 'medium', 'very_low', 'high', 'free', 'premium', 'unknown'],
  premium: ['premium', 'high', 'medium', 'low', 'very_low', 'free', 'unknown'],
  auto: ['low', 'very_low', 'medium', 'free', 'high', 'premium', 'unknown'],
}

export function normalizeRoutingQuality(value?: string | null): StoredRoutingQualityTier {
  if (value === 'mixed') return 'auto'
  return value === 'cheap' || value === 'balanced' || value === 'premium' || value === 'auto'
    ? value
    : 'auto'
}

export async function resolveRoutingQuality(input: {
  requested?: string | null
  appSlug?: string | null
  surface: RoutingSurface
}): Promise<StoredRoutingQualityTier> {
  if (input.requested) return normalizeRoutingQuality(input.requested)
  const appSlug = input.appSlug?.trim()
  const profileSlugs = [appSlug, SURFACE_PROFILE[input.surface]].filter(Boolean) as string[]
  for (const profileSlug of profileSlugs) {
    const row = await prisma.appAiProfile.findUnique({
      where: { appSlug: profileSlug },
      select: { costMode: true },
    }).catch(() => null)
    if (row?.costMode) return normalizeRoutingQuality(row.costMode)
  }
  return normalizeRoutingQuality(process.env.AMARKTAI_ROUTING_POLICY)
}

export async function saveRoutingDefaults(input: {
  studio: RoutingQualityTier
  connectedApps: RoutingQualityTier
}) {
  const values = [
    { appSlug: SURFACE_PROFILE.studio, appName: 'Studio routing default', costMode: normalizeRoutingQuality(input.studio) },
    { appSlug: SURFACE_PROFILE.connected_apps, appName: 'Connected app routing default', costMode: normalizeRoutingQuality(input.connectedApps) },
  ]
  for (const value of values) {
    await prisma.appAiProfile.upsert({
      where: { appSlug: value.appSlug },
      update: { costMode: value.costMode },
      create: value,
    })
  }
  return {
    studio: values[0].costMode,
    connectedApps: values[1].costMode,
  }
}

export async function selectCapabilityRoutePlan(input: {
  capability: AiCapabilityDefinition | string
  qualityTier?: RoutingQualityTier | string | null
  requestedProvider?: ApprovedDirectProviderId
  requestedModel?: string
  configuredProviderIds?: readonly ApprovedDirectProviderId[]
  allowedProviderIds?: readonly ApprovedDirectProviderId[]
}): Promise<CapabilityRoutePlan> {
  const capability = typeof input.capability === 'string'
    ? getCapabilityDefinition(input.capability)
    : input.capability
  const qualityTier = normalizeRoutingQuality(input.qualityTier)
  if (!capability) {
    return {
      capability: String(input.capability),
      qualityTier,
      selected: null,
      candidates: [],
      fallback: [],
      rejectedCandidates: [],
      setupRequired: false,
      reason: 'Capability is not present in the canonical taxonomy.',
    }
  }

  const configured = input.configuredProviderIds
    ? new Set(input.configuredProviderIds)
    : new Set(await configuredProviders(capability))
  const policyRankedCandidates = capability.providerRoutes
    .filter((route) => route.executable)
    .filter((route) => !input.allowedProviderIds || input.allowedProviderIds.includes(route.provider))
    .map((route) => {
      const model = selectModel(
        capability,
        route,
        qualityTier,
        route.provider === input.requestedProvider ? input.requestedModel : undefined,
      )
      return {
        route,
        model,
        configured: configured.has(route.provider),
        rank: routeRank(capability, route, model, qualityTier)
          + (route.provider === input.requestedProvider ? -100_000 : 0),
      }
    })
    .sort((left, right) => left.rank - right.rank)
  const candidates = await rankProvidersForCapability(capability.id, policyRankedCandidates)

  const selected = candidates.find((candidate) => candidate.configured) ?? null
  const fallback = selected
    ? candidates.filter((candidate) => candidate.configured && candidate !== selected).slice(0, 4)
    : []
  const policyPreferred = policyRankedCandidates.find((candidate) => candidate.configured) ?? null
  const rejectedCandidates = buildRejectedCandidates({
    capabilityId: capability.id,
    candidates,
    selected,
  })
  return {
    capability: capability.id,
    qualityTier,
    selected,
    candidates,
    fallback,
    rejectedCandidates,
    setupRequired: candidates.length > 0 && !selected,
    reason: selected
      ? policyPreferred && policyPreferred !== selected
        ? `${qualityTier} policy considered ${policyPreferred.route.provider} first for ${capability.id}; runtime proof/performance selected ${selected.route.provider} as the executable fallback.`
        : `${qualityTier} policy selected an available ${capability.group} route.`
      : candidates.length > 0
        ? `No configured provider credential can execute ${capability.id}.`
        : `No executable approved provider route exists for ${capability.id}.`,
  }
}

function buildRejectedCandidates(input: {
  capabilityId: string
  candidates: CapabilityRouteCandidate[]
  selected: CapabilityRouteCandidate | null
}): CapabilityRouteRejection[] {
  return input.candidates
    .filter((candidate) => candidate !== input.selected)
    .map((candidate) => {
      if (!candidate.configured) {
        return {
          provider: candidate.route.provider,
          model: candidate.model,
          configured: candidate.configured,
          rank: candidate.rank,
          code: 'PROVIDER_NOT_CONFIGURED',
          reason: `${candidate.route.provider} has an executable ${input.capabilityId} route, but no configured credential is available.`,
        }
      }
      return {
        provider: candidate.route.provider,
        model: candidate.model,
        configured: candidate.configured,
        rank: candidate.rank,
        code: 'RUNTIME_FALLBACK_SELECTED',
        reason: input.selected
          ? `${candidate.route.provider} was considered for ${input.capabilityId}, but runtime proof/performance selected ${input.selected.route.provider}.`
          : `${candidate.route.provider} was considered for ${input.capabilityId}, but no configured executable provider was selected.`,
      }
    })
}

async function configuredProviders(
  capability: AiCapabilityDefinition,
): Promise<ApprovedDirectProviderId[]> {
  const providers = [...new Set(capability.providerRoutes.map((route) => route.provider))]
  const checks = await Promise.all(providers.map(async (provider) => ({
    provider,
    configured: ['ready', 'configured_untested'].includes(
      (await getProviderReadiness(provider)).state,
    ),
  })))
  return checks.filter((entry) => entry.configured).map((entry) => entry.provider)
}

function routeRank(
  capability: AiCapabilityDefinition,
  route: AiCapabilityProviderRoute,
  model: string,
  qualityTier: StoredRoutingQualityTier,
): number {
  const category = routingCategory(capability)
  const providers = PROVIDER_ORDER[qualityTier][category] ?? PROVIDER_ORDER[qualityTier].text
  const providerRank = providers.indexOf(route.provider)
  const modelRoute = UNIVERSAL_MODEL_ROUTES.find(
    (entry) => entry.provider === route.provider && entry.modelId === model,
  )
  const costRank = COST_RANK[qualityTier].indexOf(modelRoute?.costTier ?? 'unknown')
  return (providerRank < 0 ? 99 : providerRank) * 100 + (costRank < 0 ? 99 : costRank)
}

function selectModel(
  capability: AiCapabilityDefinition,
  route: AiCapabilityProviderRoute,
  qualityTier: StoredRoutingQualityTier,
  requestedModel?: string,
): string {
  if (requestedModel) return requestedModel
  return [...route.modelIds].sort((left, right) => {
    const leftCost = UNIVERSAL_MODEL_ROUTES.find(
      (entry) => entry.provider === route.provider && entry.modelId === left,
    )?.costTier ?? 'unknown'
    const rightCost = UNIVERSAL_MODEL_ROUTES.find(
      (entry) => entry.provider === route.provider && entry.modelId === right,
    )?.costTier ?? 'unknown'
    return COST_RANK[qualityTier].indexOf(leftCost) - COST_RANK[qualityTier].indexOf(rightCost)
  })[0] ?? ''
}

function routingCategory(capability: AiCapabilityDefinition): string {
  if (capability.group === 'music') return 'music'
  if (capability.group === 'video' || capability.outputTypes.includes('video')) return 'video'
  if (
    capability.group === 'computer_vision'
    || capability.group === 'multimodal'
    || capability.outputTypes.includes('image')
  ) return 'image'
  if (capability.group === 'audio' || capability.group === 'avatar_voice') return 'audio'
  if (capability.group === 'tabular' || capability.group === 'experimental') return 'data'
  return 'text'
}

export function productCapabilityToTaxonomyId(capability: string): string | null {
  const map: Record<string, string> = {
    chat: 'chat',
    code: 'text_generation',
    file_analysis: 'document_question_answering',
    image_generation: 'text_to_image',
    image_edit: 'image_text_to_image',
    video_generation: 'text_to_video',
    image_to_video: 'image_to_video',
    music_generation: 'music_generation',
    lyrics_generation: 'lyrics_generation',
    tts: 'text_to_speech',
    stt: 'automatic_speech_recognition',
    voice_response: 'text_to_speech',
    adult_text: 'text_generation',
    adult_image: 'text_to_image',
    adult_video: 'text_to_video',
    adult_voice: 'text_to_speech',
    adult_avatar: 'avatar_generation',
    avatar_generation: 'avatar_generation',
    avatar_video: 'avatar_video',
    suggestive_image: 'text_to_image',
    suggestive_video: 'text_to_video',
    research: 'research',
  }
  return map[capability] ?? null
}
