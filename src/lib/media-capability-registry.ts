import {
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_STT_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
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
    providers: [
      { provider: 'together', model: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO' },
      { provider: 'huggingface', model: 'private-adult-text-endpoint' },
    ],
  },
  adult_image: {
    capability: 'adult_image',
    route: '/api/brain/adult-image',
    execution: 'sync',
    artifactType: 'image',
    providers: [
      { provider: 'together', model: 'black-forest-labs/FLUX.1-schnell-Free' },
      { provider: 'huggingface', model: 'SG161222/RealVisXL_V4.0' },
    ],
  },
  adult_video: {
    capability: 'adult_video',
    route: '/api/brain/video-generate',
    execution: 'async_job',
    artifactType: 'video',
    providers: [
      { provider: 'genx', model: GENX_VIDEO_MODELS[0] },
      { provider: 'qwen', model: 'wanx2.1-t2v-turbo' },
    ],
  },
  adult_voice: {
    capability: 'adult_voice',
    route: '/api/brain/tts',
    execution: 'sync',
    artifactType: 'audio',
    providers: [
      { provider: 'genx', model: GENX_TTS_MODELS[0] },
      { provider: 'groq', model: 'playai-tts' },
      { provider: 'huggingface', model: 'facebook/mms-tts-eng' },
    ],
  },
  image_generation: {
    capability: 'image_generation',
    route: '/api/brain/image',
    execution: 'sync',
    artifactType: 'image',
    providers: [
      { provider: 'genx', model: GENX_IMAGE_MODELS[0] },
      { provider: 'qwen', model: 'wanx-v1' },
      { provider: 'together', model: 'black-forest-labs/FLUX.1-schnell-Free' },
      { provider: 'huggingface', model: 'task:text-to-image' },
    ],
  },
  video_generation: {
    capability: 'video_generation',
    route: '/api/brain/video-generate',
    execution: 'async_job',
    artifactType: 'video',
    providers: [
      { provider: 'genx', model: GENX_VIDEO_MODELS[0] },
      { provider: 'qwen', model: 'wanx2.1-t2v-turbo' },
    ],
  },
  music_generation: {
    capability: 'music_generation',
    route: '/api/admin/music-studio',
    execution: 'async_job',
    artifactType: 'music',
    providers: [
      { provider: 'genx', model: GENX_AUDIO_MODELS[0] },
    ],
  },
  tts: {
    capability: 'tts',
    route: '/api/brain/tts',
    execution: 'sync',
    artifactType: 'audio',
    providers: [
      { provider: 'genx', model: GENX_TTS_MODELS[0] },
      { provider: 'groq', model: 'playai-tts' },
      { provider: 'huggingface', model: 'facebook/mms-tts-eng' },
    ],
  },
  stt: {
    capability: 'stt',
    route: '/api/brain/stt',
    execution: 'upload',
    artifactType: 'transcript',
    providers: [
      { provider: 'genx', model: GENX_STT_MODELS[0] },
      { provider: 'groq', model: 'whisper-large-v3-turbo' },
      { provider: 'huggingface', model: 'openai/whisper-large-v3' },
    ],
  },
  audio: {
    capability: 'audio',
    route: '/api/admin/music-studio',
    execution: 'async_job',
    artifactType: 'audio',
    providers: [
      { provider: 'genx', model: GENX_AUDIO_MODELS[0] },
    ],
  },
}

export function getMediaCapabilityRoute(capability: string): MediaCapabilityRoute | null {
  return MEDIA_CAPABILITY_ROUTES[capability as FirstClassMediaCapability] ?? null
}
