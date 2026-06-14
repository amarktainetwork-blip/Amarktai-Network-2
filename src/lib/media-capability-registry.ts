/**
 * Legacy media-route projection.
 *
 * No provider, model, adapter, or readiness truth is declared here. All values
 * are projected from the canonical V1 brain capability matrix.
 */
import {
  getCapabilityDefinition,
  type AiCapabilityDefinition,
} from '@/lib/brain/v1-capability-matrix'
import type { ProviderMeshId } from '@/lib/provider-mesh'

export type FirstClassMediaCapability =
  | 'adult_text'
  | 'adult_image'
  | 'adult_video'
  | 'adult_voice'
  | 'image_generation'
  | 'video_generation'
  | 'music_generation'
  | 'tts'
  | 'stt'
  | 'audio'

export type MediaCapabilityRoute = {
  capability: FirstClassMediaCapability
  route: string
  execution: 'sync' | 'async_job' | 'upload'
  artifactType: 'document' | 'image' | 'video' | 'audio' | 'music' | 'transcript'
  providers: ReadonlyArray<{ provider: ProviderMeshId; model: string }>
}

const CAPABILITY_MAP: Record<FirstClassMediaCapability, string> = {
  adult_text: 'text_generation',
  adult_image: 'text_to_image',
  adult_video: 'text_to_video',
  adult_voice: 'text_to_speech',
  image_generation: 'text_to_image',
  video_generation: 'text_to_video',
  music_generation: 'music_generation',
  tts: 'text_to_speech',
  stt: 'automatic_speech_recognition',
  audio: 'text_to_audio',
}

export const MEDIA_CAPABILITY_ROUTES = Object.fromEntries(
  (Object.keys(CAPABILITY_MAP) as FirstClassMediaCapability[]).map((capability) => [
    capability,
    projectMediaRoute(capability, getCapabilityDefinition(CAPABILITY_MAP[capability])!),
  ]),
) as Record<FirstClassMediaCapability, MediaCapabilityRoute>

export function getMediaCapabilityRoute(capability: string): MediaCapabilityRoute | null {
  return MEDIA_CAPABILITY_ROUTES[capability as FirstClassMediaCapability] ?? null
}

function projectMediaRoute(
  capability: FirstClassMediaCapability,
  definition: AiCapabilityDefinition,
): MediaCapabilityRoute {
  const providers = definition.providerRoutes
    .filter((route) => route.executable)
    .filter((route) => {
      if (capability === 'adult_text' || capability === 'adult_image') {
        return route.provider === 'together' || route.provider === 'huggingface'
      }
      return capability !== 'adult_video'
    })
    .map((route) => ({
      provider: route.provider,
      model: route.modelIds[0] ?? '',
    }))
    .filter((route) => Boolean(route.model))
  return {
    capability,
    route: definition.executableEndpoint ?? '/api/connected-apps/capabilities/execute',
    execution: capability === 'stt'
      ? 'upload'
      : definition.longRunning ? 'async_job' : 'sync',
    artifactType: artifactType(definition),
    providers,
  }
}

function artifactType(
  definition: AiCapabilityDefinition,
): MediaCapabilityRoute['artifactType'] {
  if (definition.id === 'automatic_speech_recognition') return 'transcript'
  if (definition.id === 'music_generation') return 'music'
  if (definition.outputTypes.includes('image')) return 'image'
  if (definition.outputTypes.includes('video')) return 'video'
  if (definition.outputTypes.includes('audio')) return 'audio'
  return 'document'
}
