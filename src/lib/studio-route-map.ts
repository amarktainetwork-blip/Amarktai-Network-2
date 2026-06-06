export const STUDIO_TABS = [
  'Chat',
  'Coding',
  'Research',
  'Image',
  'Video',
  'Music / Audio',
  'Voice / TTS',
  'STT / Transcription',
  'Avatar / Talking Video',
  'Adult',
  'Artifacts',
] as const

export type StudioTab = (typeof STUDIO_TABS)[number]

export type StudioRouteStatus = 'stream' | 'execute' | 'upload' | 'list' | 'handoff' | 'missing'

export interface StudioRouteConfig {
  tab: StudioTab
  capability: string
  route: string | null
  status: StudioRouteStatus
  artifactType?: 'document' | 'image' | 'video' | 'audio' | 'music' | 'transcript' | 'code'
  detail: string
}

export const STUDIO_ROUTE_MAP: Record<StudioTab, StudioRouteConfig> = {
  Chat: {
    tab: 'Chat',
    capability: 'chat',
    route: '/api/admin/amarktai-assistant/stream',
    status: 'stream',
    artifactType: 'document',
    detail: 'Protected GenX streaming route with dashboard context and memory handoff.',
  },
  Coding: {
    tab: 'Coding',
    capability: 'coding',
    route: '/api/admin/studio/workbench-handoff',
    status: 'handoff',
    artifactType: 'code',
    detail: 'Coding prompts are persisted as Workbench handoff artifacts and opened in Workbench.',
  },
  Research: {
    tab: 'Research',
    capability: 'research',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'document',
    detail: 'Protected Studio wrapper calls the Research Agent route and stores the result as a research artifact.',
  },
  Image: {
    tab: 'Image',
    capability: 'image_generation',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'image',
    detail: 'Protected Studio wrapper calls the real image generation route and stores returned image metadata/file as an artifact.',
  },
  Video: {
    tab: 'Video',
    capability: 'video_generation',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'video',
    detail: 'Protected Studio wrapper creates a real video job when a supported provider is configured.',
  },
  'Music / Audio': {
    tab: 'Music / Audio',
    capability: 'music_generation',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'music',
    detail: 'Protected Studio wrapper calls the existing music studio route and returns the stored job/artifact.',
  },
  'Voice / TTS': {
    tab: 'Voice / TTS',
    capability: 'tts',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'audio',
    detail: 'Protected Studio wrapper calls the real TTS route and stores returned audio bytes as an artifact.',
  },
  'STT / Transcription': {
    tab: 'STT / Transcription',
    capability: 'stt',
    route: '/api/admin/studio/stt',
    status: 'upload',
    artifactType: 'transcript',
    detail: 'Protected upload route calls the real STT route and stores transcripts as artifacts.',
  },
  'Avatar / Talking Video': {
    tab: 'Avatar / Talking Video',
    capability: 'avatar_video',
    route: null,
    status: 'missing',
    artifactType: 'video',
    detail: 'Backend missing - Phase 3/provider-specific implementation required.',
  },
  Adult: {
    tab: 'Adult',
    capability: 'adult_text',
    route: '/api/admin/studio/execute',
    status: 'execute',
    artifactType: 'document',
    detail: 'Adult text, image, video, and voice use the same policy-gated provider capability registry and report live provider readiness truthfully.',
  },
  Artifacts: {
    tab: 'Artifacts',
    capability: 'artifacts',
    route: '/api/admin/artifacts',
    status: 'list',
    artifactType: 'document',
    detail: 'Protected artifact browser lists persisted Studio, research, media, and Workbench outputs.',
  },
}

export function getStudioRouteConfig(tab: StudioTab): StudioRouteConfig {
  return STUDIO_ROUTE_MAP[tab]
}
