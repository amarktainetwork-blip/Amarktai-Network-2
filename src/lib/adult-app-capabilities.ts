import { prisma } from '@/lib/prisma'
import { getGlobalAdultMode, loadGlobalAdultModeFromDB } from '@/lib/content-filter'
import { APPROVED_DIRECT_PROVIDER_IDS } from '@/lib/provider-mesh'

export const ADULT_CAPABILITY_IDS = [
  'adult_text',
  'adult_image',
  'adult_voice',
  'adult_avatar',
  'adult_short_video',
  'adult_long_video',
] as const

export type AdultCapabilityId = typeof ADULT_CAPABILITY_IDS[number]

export const ALWAYS_BLOCKED_ADULT_CATEGORIES = [
  'minors',
  'age_ambiguous',
  'non_consensual',
  'real_person_sexual_deepfake',
  'illegal_sexual_content',
] as const

export const DEFAULT_ADULT_SAFETY_RULES = [
  'All depicted people and personas must be explicitly fictional adults aged 18 or older.',
  'Consent must be explicit in the request context.',
  'Real-person sexual deepfakes and lookalikes are prohibited.',
  'Minors, age ambiguity, coercion, and illegal sexual content are prohibited.',
] as const

export interface AdultAppCapabilityProfile {
  appSlug: string
  globalAvailable: boolean
  safeMode: boolean
  adultModeEnabled: boolean
  categoriesAllowed: string[]
  capabilities: Record<AdultCapabilityId, boolean>
  approvedProviders: string[]
  approvedModels: string[]
  safetyRules: string[]
  auditLogging: boolean
}

export async function getAdultAppCapabilityProfile(appSlug: string): Promise<AdultAppCapabilityProfile> {
  await loadGlobalAdultModeFromDB()
  const row = await prisma.appAiProfile.findUnique({ where: { appSlug } })
  const globalAvailable = getGlobalAdultMode()
  return {
    appSlug,
    globalAvailable,
    safeMode: row?.safeMode ?? true,
    adultModeEnabled: Boolean(globalAvailable && row?.adultMode && !row.safeMode),
    categoriesAllowed: parseStringArray(row?.adultCategories),
    capabilities: {
      adult_text: row?.adultTextEnabled ?? false,
      adult_image: row?.adultImageEnabled ?? false,
      adult_voice: row?.adultVoiceEnabled ?? false,
      adult_avatar: row?.adultAvatarEnabled ?? false,
      adult_short_video: row?.adultShortVideoEnabled ?? false,
      adult_long_video: row?.adultLongVideoEnabled ?? false,
    },
    approvedProviders: parseStringArray(row?.adultApprovedProviders)
      .filter((provider) => APPROVED_DIRECT_PROVIDER_IDS.includes(provider as never)),
    approvedModels: parseStringArray(row?.adultApprovedModels),
    safetyRules: parseStringArray(row?.adultSafetyRules).length
      ? parseStringArray(row?.adultSafetyRules)
      : [...DEFAULT_ADULT_SAFETY_RULES],
    auditLogging: row?.adultAuditLogging ?? true,
  }
}

export async function updateAdultAppCapabilityProfile(
  appSlug: string,
  input: Partial<{
    adultModeEnabled: boolean
    categoriesAllowed: string[]
    capabilities: Partial<Record<AdultCapabilityId, boolean>>
    approvedProviders: string[]
    approvedModels: string[]
    safetyRules: string[]
    auditLogging: boolean
  }>,
) {
  await loadGlobalAdultModeFromDB()
  if (input.adultModeEnabled && !getGlobalAdultMode()) {
    throw new Error('Global adult mode availability must be enabled before an app can opt in.')
  }
  const providers = (input.approvedProviders ?? [])
    .filter((provider) => APPROVED_DIRECT_PROVIDER_IDS.includes(provider as never))
  const capabilities = input.capabilities ?? {}
  return prisma.appAiProfile.upsert({
    where: { appSlug },
    update: {
      ...(input.adultModeEnabled !== undefined
        ? { safeMode: !input.adultModeEnabled, adultMode: input.adultModeEnabled }
        : {}),
      ...(input.categoriesAllowed ? { adultCategories: JSON.stringify(input.categoriesAllowed) } : {}),
      ...(capabilities.adult_text !== undefined ? { adultTextEnabled: capabilities.adult_text } : {}),
      ...(capabilities.adult_image !== undefined ? { adultImageEnabled: capabilities.adult_image } : {}),
      ...(capabilities.adult_voice !== undefined ? { adultVoiceEnabled: capabilities.adult_voice } : {}),
      ...(capabilities.adult_avatar !== undefined ? { adultAvatarEnabled: capabilities.adult_avatar } : {}),
      ...(capabilities.adult_short_video !== undefined ? { adultShortVideoEnabled: capabilities.adult_short_video } : {}),
      ...(capabilities.adult_long_video !== undefined ? { adultLongVideoEnabled: capabilities.adult_long_video } : {}),
      ...(input.approvedProviders ? { adultApprovedProviders: JSON.stringify(providers) } : {}),
      ...(input.approvedModels ? { adultApprovedModels: JSON.stringify(input.approvedModels) } : {}),
      ...(input.safetyRules ? { adultSafetyRules: JSON.stringify(input.safetyRules) } : {}),
      ...(input.auditLogging !== undefined ? { adultAuditLogging: input.auditLogging } : {}),
    },
    create: {
      appSlug,
      appName: appSlug,
      safeMode: !input.adultModeEnabled,
      adultMode: input.adultModeEnabled ?? false,
      adultCategories: JSON.stringify(input.categoriesAllowed ?? []),
      adultTextEnabled: capabilities.adult_text ?? false,
      adultImageEnabled: capabilities.adult_image ?? false,
      adultVoiceEnabled: capabilities.adult_voice ?? false,
      adultAvatarEnabled: capabilities.adult_avatar ?? false,
      adultShortVideoEnabled: capabilities.adult_short_video ?? false,
      adultLongVideoEnabled: capabilities.adult_long_video ?? false,
      adultApprovedProviders: JSON.stringify(providers),
      adultApprovedModels: JSON.stringify(input.approvedModels ?? []),
      adultSafetyRules: JSON.stringify(input.safetyRules ?? DEFAULT_ADULT_SAFETY_RULES),
      adultAuditLogging: input.auditLogging ?? true,
    },
  })
}

export function validateAdultCapabilityRequest(
  profile: AdultAppCapabilityProfile,
  capability: AdultCapabilityId,
  prompt: string,
): { allowed: true } | { allowed: false; blocker: string } {
  if (!profile.globalAvailable) return { allowed: false, blocker: 'Global adult mode availability is disabled.' }
  if (!profile.adultModeEnabled || profile.safeMode) {
    return { allowed: false, blocker: 'This app has not explicitly enabled adult mode with safe mode disabled.' }
  }
  if (!profile.capabilities[capability]) {
    return { allowed: false, blocker: `${capability} is disabled for this app.` }
  }
  const normalized = prompt.toLowerCase()
  const blockedPatterns = [
    /\b(child|minor|underage|schoolgirl|schoolboy|teenager|young-looking)\b/,
    /\b(non[- ]?consensual|rape|forced|drugged|unconscious)\b/,
    /\b(deepfake|lookalike|celebrity|real person)\b/,
  ]
  if (blockedPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      allowed: false,
      blocker: `Request violates adult safety policy: ${ALWAYS_BLOCKED_ADULT_CATEGORIES.join(', ')}.`,
    }
  }
  if (!/\b(18\+|adult|aged\s+(?:1[89]|[2-9]\d)|fictional)\b/i.test(prompt)) {
    return {
      allowed: false,
      blocker: 'Adult requests must explicitly establish fictional, consenting adults aged 18 or older.',
    }
  }
  return { allowed: true }
}

function parseStringArray(value?: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
  } catch {
    return []
  }
}
