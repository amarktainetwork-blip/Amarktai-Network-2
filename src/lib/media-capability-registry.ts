import {
  GENX_DEFAULT_IMAGE_MODEL,
  GENX_DEFAULT_STT_MODEL,
  GENX_DEFAULT_TTS_MODEL,
  GENX_DEFAULT_VIDEO_MODEL,
  getConfiguredGenXMusicModel,
} from '@/lib/genx-client'
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
  providers: ReadonlyArray<{
    provider: ProviderMeshId
    model: string
  }>
}

export const MEDIA_CAPABILITY_ROUTES: Record<FirstClassMediaCapability, MediaCapabilityRoute> = {
  adult_text: {
    capability: 'adult_text',
    route: '/api/brain/adult-text',
    execution: 'sync',
    artifactType: 'document',
    providers: [],
  },
  adult_image: {
    capability: 'adult_image',
    route: '/api/brain/adult-image',
    execution: 'sync',
    artifactType: 'image',
    providers: [],
  },
  adult_video: {
    capability: 'adult_video',
    route: '',
    execution: 'async_job',
    artifactType: 'video',
    providers: [],
  },
  adult_voice: {
    capability: 'adult_voice',
    route: '/api/brain/tts',
    execution: 'sync',
    artifactType: 'audio',
    providers: [],
  },
  image_generation: {
    capability: 'image_generation',
    route: '/api/brain/image',
    execution: 'sync',
    artifactType: 'image',
    providers: [
      { provider: 'together', model: process.env.TOGETHER_IMAGE_MODEL?.trim() || 'black-forest-labs/FLUX.2-dev' },
      { provider: 'genx', model: GENX_DEFAULT_IMAGE_MODEL },
    ],
  },
  video_generation: {
    capability: 'video_generation',
    route: '/api/brain/video-generate',
    execution: 'async_job',
    artifactType: 'video',
    providers: [
      { provider: 'together', model: process.env.TOGETHER_VIDEO_MODEL?.trim() || 'TOGETHER_VIDEO_MODEL' },
      { provider: 'genx', model: GENX_DEFAULT_VIDEO_MODEL },
    ],
  },
  music_generation: {
    capability: 'music_generation',
    route: '/api/admin/music-studio',
    execution: 'async_job',
    artifactType: 'music',
    providers: [
      { provider: 'genx', model: getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL' },
    ],
  },
  tts: {
    capability: 'tts',
    route: '/api/brain/tts',
    execution: 'sync',
    artifactType: 'audio',
    providers: [
      { provider: 'genx', model: GENX_DEFAULT_TTS_MODEL },
      { provider: 'groq', model: 'playai-tts' },
    ],
  },
  stt: {
    capability: 'stt',
    route: '/api/brain/stt',
    execution: 'upload',
    artifactType: 'transcript',
    providers: [
      { provider: 'genx', model: GENX_DEFAULT_STT_MODEL },
      { provider: 'groq', model: 'whisper-large-v3' },
    ],
  },
  audio: {
    capability: 'audio',
    route: '/api/admin/music-studio',
    execution: 'async_job',
    artifactType: 'audio',
    providers: [
      { provider: 'genx', model: getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL' },
    ],
  },
}

export function getMediaCapabilityRoute(capability: string): MediaCapabilityRoute | null {
  return MEDIA_CAPABILITY_ROUTES[capability as FirstClassMediaCapability] ?? null
}
