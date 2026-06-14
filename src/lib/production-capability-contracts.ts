import {
  AI_CAPABILITY_TAXONOMY,
  type AiCapabilityDefinition,
} from '@/lib/brain/v1-capability-matrix'
import {
  ADULT_CAPABILITY_IDS,
  type AdultCapabilityId,
} from '@/lib/adult-app-capabilities'

export type ProductCapabilityAction =
  | 'run'
  | 'queue'
  | 'required_input'
  | 'configure'
  | 'blocked'

export interface ProductionCapabilityContract {
  id: string
  canonicalCapability: string
  label: string
  family: string
  governedAdultCapability: boolean
  inputContract: string[]
  outputContract: string[]
  artifactType: string | null
  providerRoutes: Array<{ provider: string; models: string[]; executable: boolean }>
  fallbackChain: string[]
  endpoint: string
  action: ProductCapabilityAction
  dashboardTask: 'chat' | 'image' | 'video' | 'music' | 'voice' | 'avatar' | 'data'
  liveProof: {
    method: 'POST'
    route: string
    expected: 'result' | 'artifact' | 'job' | 'needs_input' | 'setup' | 'policy'
  }
}

const ADULT_CANONICAL_MAP: Record<AdultCapabilityId, string> = {
  adult_text: 'text_generation',
  adult_image: 'text_to_image',
  adult_voice: 'text_to_speech',
  adult_avatar: 'avatar_generation',
  adult_short_video: 'text_to_video',
  adult_long_video: 'text_to_video',
}

export const PRODUCTION_CAPABILITY_CONTRACTS: readonly ProductionCapabilityContract[] = [
  ...AI_CAPABILITY_TAXONOMY.map(projectCanonicalContract),
  ...ADULT_CAPABILITY_IDS.map(projectAdultContract),
]

export function getProductionCapabilityContract(id: string) {
  return PRODUCTION_CAPABILITY_CONTRACTS.find((contract) => contract.id === id) ?? null
}

function projectCanonicalContract(capability: AiCapabilityDefinition): ProductionCapabilityContract {
  const executableRoutes = capability.providerRoutes.filter((route) => route.executable)
  const action: ProductCapabilityAction = capability.id === 'reinforcement_learning' || capability.id === 'robotics'
    ? 'blocked'
    : executableRoutes.length
      ? capability.requiredSourceInput
        ? 'required_input'
        : capability.longRunning ? 'queue' : 'run'
      : 'configure'
  return {
    id: capability.id,
    canonicalCapability: capability.id,
    label: capability.label,
    family: capability.group,
    governedAdultCapability: false,
    inputContract: capability.requiredInputs,
    outputContract: capability.outputTypes,
    artifactType: capability.createsArtifact ? artifactType(capability) : null,
    providerRoutes: capability.providerRoutes.map((route) => ({
      provider: route.provider,
      models: route.modelIds,
      executable: route.executable,
    })),
    fallbackChain: executableRoutes.map((route) => route.provider),
    endpoint: capability.executableEndpoint ?? '/admin/dashboard/providers',
    action,
    dashboardTask: dashboardTask(capability),
    liveProof: {
      method: 'POST',
      route: capability.executableEndpoint ?? '/api/admin/settings/test-provider',
      expected: action === 'blocked'
        ? 'policy'
        : action === 'required_input'
          ? 'needs_input'
          : action === 'configure'
            ? 'setup'
            : capability.longRunning
              ? 'job'
              : capability.createsArtifact
                ? 'artifact'
                : 'result',
    },
  }
}

function projectAdultContract(id: AdultCapabilityId): ProductionCapabilityContract {
  const canonical = AI_CAPABILITY_TAXONOMY.find((entry) => entry.id === ADULT_CANONICAL_MAP[id])!
  const isLong = id === 'adult_long_video'
  return {
    ...projectCanonicalContract(canonical),
    id,
    canonicalCapability: canonical.id,
    label: id.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    governedAdultCapability: true,
    inputContract: [...canonical.requiredInputs, 'app_adult_profile', 'fictional_adult_consent_context'],
    endpoint: id === 'adult_text'
      ? '/api/brain/adult-text'
      : id === 'adult_image'
        ? '/api/brain/adult-image'
        : id === 'adult_voice'
          ? '/api/brain/tts'
          : id === 'adult_avatar'
            ? '/api/brain/avatar'
            : '/api/brain/video-generate',
    action: isLong ? 'queue' : 'run',
    dashboardTask: id === 'adult_text'
      ? 'chat'
      : id === 'adult_image'
        ? 'image'
        : id === 'adult_voice'
          ? 'voice'
          : id === 'adult_avatar'
            ? 'avatar'
            : 'video',
    liveProof: {
      method: 'POST',
      route: id === 'adult_text'
        ? '/api/brain/adult-text'
        : id === 'adult_image'
          ? '/api/brain/adult-image'
          : id === 'adult_voice'
            ? '/api/brain/tts'
            : id === 'adult_avatar'
              ? '/api/brain/avatar'
              : '/api/brain/video-generate',
      expected: isLong || id === 'adult_short_video' ? 'job' : 'artifact',
    },
  }
}

function artifactType(capability: AiCapabilityDefinition) {
  if (capability.id === 'avatar_generation') return 'avatar'
  if (capability.id === 'automatic_speech_recognition') return 'transcript'
  if (capability.outputTypes.includes('image')) return 'image'
  if (capability.outputTypes.includes('video')) return 'video'
  if (capability.outputTypes.includes('music')) return 'music'
  if (capability.outputTypes.includes('audio')) return 'audio'
  if (capability.outputTypes.includes('3d_asset')) return 'document'
  return 'report'
}

function dashboardTask(capability: AiCapabilityDefinition): ProductionCapabilityContract['dashboardTask'] {
  if (capability.group === 'video') return 'video'
  if (capability.group === 'music') return 'music'
  if (capability.group === 'audio') return 'voice'
  if (capability.group === 'avatar_voice') return 'avatar'
  if (capability.outputTypes.includes('image')) return 'image'
  if (['text', 'agents_or_planning'].includes(capability.group)) return 'chat'
  return 'data'
}
