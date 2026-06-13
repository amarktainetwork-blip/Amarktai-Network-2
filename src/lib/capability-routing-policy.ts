import {
  getCapabilityDefinition,
  type AiCapabilityDefinition,
  type AiCapabilityProviderRoute,
} from '@/lib/ai-capability-taxonomy'
import { getMeshCredential } from '@/lib/provider-mesh-status'
import { prisma } from '@/lib/prisma'
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

export interface CapabilityRoutePlan {
  capability: string
  qualityTier: StoredRoutingQualityTier
  selected: CapabilityRouteCandidate | null
  candidates: CapabilityRouteCandidate[]
  fallback: CapabilityRouteCandidate[]
  setupRequired: boolean
  reason: string
}

const SURFACE_PROFILE: Record<RoutingSurface, string> = {
  studio: '__studio__',
  connected_apps: '__connected_apps__',
}

const PROVIDER_ORDER: Record<StoredRoutingQualityTier, Record<string, ApprovedDirectProviderId[]>> = {
  cheap: {
    text: ['groq', 'qwen', 'together', 'huggingface', 'mimo', 'genx'],
    image: ['huggingface', 'together', 'qwen', 'genx', 'mimo', 'groq'],
    video: ['qwen', 'together', 'huggingface', 'genx', 'mimo', 'groq'],
    audio: ['groq', 'huggingface', 'qwen', 'mimo', 'genx', 'together'],
    music: ['huggingface', 'genx', 'qwen', 'together', 'mimo', 'groq'],
    data: ['huggingface', 'qwen', 'together', 'genx', 'mimo', 'groq'],
  },
  balanced: {
    text: ['qwen', 'mimo', 'groq', 'together', 'genx', 'huggingface'],
    image: ['qwen', 'together', 'genx', 'huggingface', 'mimo', 'groq'],
    video: ['qwen', 'genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['groq', 'genx', 'huggingface', 'qwen', 'mimo', 'together'],
    music: ['genx', 'huggingface', 'qwen', 'together', 'mimo', 'groq'],
    data: ['qwen', 'huggingface', 'together', 'genx', 'mimo', 'groq'],
  },
  premium: {
    text: ['genx', 'mimo', 'qwen', 'together', 'groq', 'huggingface'],
    image: ['genx', 'qwen', 'together', 'huggingface', 'mimo', 'groq'],
    video: ['genx', 'qwen', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['genx', 'huggingface', 'groq', 'qwen', 'mimo', 'together'],
    music: ['genx', 'huggingface', 'qwen', 'together', 'mimo', 'groq'],
    data: ['genx', 'qwen', 'huggingface', 'together', 'mimo', 'groq'],
  },
  auto: {
    text: ['qwen', 'groq', 'mimo', 'together', 'genx', 'huggingface'],
    image: ['qwen', 'together', 'huggingface', 'genx', 'mimo', 'groq'],
    video: ['qwen', 'genx', 'together', 'huggingface', 'mimo', 'groq'],
    audio: ['groq', 'huggingface', 'genx', 'qwen', 'mimo', 'together'],
    music: ['huggingface', 'genx', 'qwen', 'together', 'mimo', 'groq'],
    data: ['huggingface', 'qwen', 'together', 'genx', 'mimo', 'groq'],
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
      setupRequired: false,
      reason: 'Capability is not present in the canonical taxonomy.',
    }
  }

  const configured = input.configuredProviderIds
    ? new Set(input.configuredProviderIds)
    : new Set(await configuredProviders(capability))
  const candidates = capability.providerRoutes
    .filter((route) => route.executable)
    .filter((route) => !input.allowedProviderIds || input.allowedProviderIds.includes(route.provider))
    .filter((route) => !input.requestedProvider || route.provider === input.requestedProvider)
    .map((route) => {
      const model = selectModel(route, qualityTier, input.requestedModel)
      return {
        route,
        model,
        configured: configured.has(route.provider),
        rank: routeRank(capability, route, model, qualityTier),
      }
    })
    .sort((left, right) => left.rank - right.rank)

  const selected = candidates.find((candidate) => candidate.configured) ?? null
  const fallback = selected
    ? candidates.filter((candidate) => candidate.configured && candidate !== selected).slice(0, 4)
    : []
  return {
    capability: capability.id,
    qualityTier,
    selected,
    candidates,
    fallback,
    setupRequired: candidates.length > 0 && !selected,
    reason: selected
      ? `${qualityTier} policy selected an available ${capability.group} route.`
      : candidates.length > 0
        ? `No configured provider credential can execute ${capability.id}.`
        : `No executable approved provider route exists for ${capability.id}.`,
  }
}

async function configuredProviders(
  capability: AiCapabilityDefinition,
): Promise<ApprovedDirectProviderId[]> {
  const providers = [...new Set(capability.providerRoutes.map((route) => route.provider))]
  const checks = await Promise.all(providers.map(async (provider) => ({
    provider,
    configured: Boolean(await getMeshCredential(provider)),
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
  route: AiCapabilityProviderRoute,
  qualityTier: StoredRoutingQualityTier,
  requestedModel?: string,
): string {
  if (requestedModel && route.modelIds.includes(requestedModel)) return requestedModel
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
    avatar_video: 'avatar_video',
    suggestive_image: 'text_to_image',
    suggestive_video: 'text_to_video',
    research: 'research',
  }
  return map[capability] ?? null
}
