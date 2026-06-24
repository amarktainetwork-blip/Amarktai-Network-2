import {
  CANONICAL_CAPABILITY_IDS,
  type CapabilityDefinition,
  type CapabilityId,
} from './provider-types'

const ARTIFACT_CAPABILITIES = new Set<CapabilityId>([
  'research', 'image', 'image_edit', 'video', 'image_to_video', 'avatar',
  'music', 'tts', 'stt', 'voice_clone', 'documents', 'adult_image', 'adult_video',
])
const LONG_RUNNING_CAPABILITIES = new Set<CapabilityId>([
  'research', 'video', 'image_to_video', 'avatar', 'music', 'voice_clone',
  'documents', 'agents', 'adult_video',
])
const ADULT_CAPABILITIES = new Set<CapabilityId>([
  'adult_text', 'adult_image', 'adult_video',
])

function categoryFor(id: CapabilityId): CapabilityDefinition['category'] {
  if (ADULT_CAPABILITIES.has(id)) return 'adult'
  if (id === 'research') return 'research'
  if (['image', 'image_edit', 'avatar', 'ocr', 'vision'].includes(id)) return 'image'
  if (['video', 'image_to_video'].includes(id)) return 'video'
  if (['music', 'tts', 'stt', 'voice_clone'].includes(id)) return 'audio'
  if (['embeddings', 'rerank', 'translation', 'documents'].includes(id)) return 'data'
  if (id === 'agents') return 'agents'
  return 'text'
}

function requiredInputs(id: CapabilityId): string[] {
  if (id === 'image_edit' || id === 'image_to_video') return ['prompt', 'image']
  if (id === 'stt') return ['audio']
  if (id === 'voice_clone') return ['audio', 'consent']
  if (id === 'ocr' || id === 'vision') return ['image']
  if (id === 'rerank') return ['query', 'documents']
  if (id === 'documents') return ['document']
  return ['prompt']
}

export const CAPABILITY_REGISTRY: readonly CapabilityDefinition[] =
  CANONICAL_CAPABILITY_IDS.map((id) => ({
    id,
    label: id.split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' '),
    category: categoryFor(id),
    createsArtifact: ARTIFACT_CAPABILITIES.has(id),
    longRunning: LONG_RUNNING_CAPABILITIES.has(id),
    requiresAdultPermission: ADULT_CAPABILITIES.has(id),
    requiredInputs: requiredInputs(id),
  }))

export function getCapability(id: string): CapabilityDefinition | null {
  return CAPABILITY_REGISTRY.find((entry) => entry.id === id) ?? null
}

export function isCanonicalCapability(id: string): id is CapabilityId {
  return CANONICAL_CAPABILITY_IDS.includes(id as CapabilityId)
}

const PRODUCT_CAPABILITY_ALIASES: Readonly<Record<string, CapabilityId>> = {
  chat: 'chat',
  reasoning: 'reasoning',
  code: 'coding',
  coding: 'coding',
  repo_edit: 'coding',
  app_build: 'coding',
  deploy_plan: 'reasoning',
  research: 'research',
  scrape_website: 'research',
  image: 'image',
  'text_to_image': 'image',
  'text-to-image': 'image',
  image_generation: 'image',
  suggestive_image: 'image',
  image_edit: 'image_edit',
  image_to_image: 'image_edit',
  'image-to-image': 'image_edit',
  image_text_to_image: 'image_edit',
  video: 'video',
  text_to_video: 'video',
  'text-to-video': 'video',
  video_generation: 'video',
  suggestive_video: 'video',
  image_to_video: 'image_to_video',
  'image-to-video': 'image_to_video',
  image_text_to_video: 'image_to_video',
  avatar_generation: 'avatar',
  adult_avatar: 'avatar',
  avatar_video: 'avatar',
  music_generation: 'music',
  lyrics_generation: 'chat',
  tts: 'tts',
  text_to_speech: 'tts',
  'text-to-speech': 'tts',
  voice_response: 'tts',
  adult_voice: 'tts',
  stt: 'stt',
  speech_to_text: 'stt',
  'speech-to-text': 'stt',
  automatic_speech_recognition: 'stt',
  voice_clone: 'voice_clone',
  voice_design: 'voice_clone',
  ocr: 'ocr',
  vision: 'vision',
  embeddings: 'embeddings',
  feature_extraction: 'embeddings',
  rerank: 'rerank',
  text_ranking: 'rerank',
  translation: 'translation',
  documents: 'documents',
  file_analysis: 'documents',
  agents: 'agents',
  adult_text: 'adult_text',
  adult_image: 'adult_image',
  adult_video: 'adult_video',
}

export function resolveCanonicalCapability(id: string): CapabilityId | null {
  return PRODUCT_CAPABILITY_ALIASES[id] ?? (isCanonicalCapability(id) ? id : null)
}
