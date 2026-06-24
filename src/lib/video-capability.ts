/**
 * @module video-capability
 * @description Video generation capability with structured controls.
 *
 * Supports:
 * - Video types (marketing, cinematic, product, social, educational, storytelling)
 * - Formats (short_form, long_form)
 * - Ratios (16:9, 9:16, 1:1)
 * - Quality (draft, standard, premium)
 * - Long-form video workflow (script → storyboard → scenes → assets → final video)
 *
 * ACTIVE PROVIDERS: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VideoType = 'marketing' | 'cinematic' | 'product' | 'social' | 'educational' | 'storytelling'
export type VideoFormat = 'short_form' | 'long_form'
export type VideoRatio = '16:9' | '9:16' | '1:1'
export type VideoQuality = 'draft' | 'standard' | 'premium'

export interface VideoCapabilityPayload {
  /** Video prompt */
  prompt: string
  /** Video type */
  videoType: VideoType
  /** Video format */
  format: VideoFormat
  /** Aspect ratio */
  ratio: VideoRatio
  /** Duration in seconds */
  duration: number
  /** Quality level */
  quality: VideoQuality
  /** Style */
  style?: string
  /** Camera style */
  cameraStyle?: string
  /** Scene count (for long-form) */
  sceneCount?: number
  /** Voiceover enabled */
  voiceover?: boolean
  /** Captions enabled */
  captions?: boolean
  /** Background music */
  music?: boolean
  /** Image input for image_to_video */
  imageInput?: string
  /** App slug */
  appSlug?: string
}

export interface VideoExecutionResult {
  success: boolean
  provider: string
  model: string
  artifactId?: string
  videoUrl?: string
  jobId?: string
  storyboard?: VideoStoryboard
  error?: string
}

export interface VideoStoryboard {
  scenes: VideoScene[]
  totalDuration: number
  style: string
  narration?: string
}

export interface VideoScene {
  id: string
  description: string
  duration: number
  cameraAngle: string
  visualNotes: string
  narration?: string
  music?: string
}

// ── Long-Form Video Structures ────────────────────────────────────────────────

export interface LongFormVideoPlan {
  script: string
  storyboard: VideoStoryboard
  scenes: VideoScene[]
  assets: VideoAsset[]
  assemblyPlan: AssemblyPlan
}

export interface VideoAsset {
  id: string
  type: 'image' | 'video' | 'audio' | 'text'
  source: 'generated' | 'provided' | 'stock'
  url?: string
  description: string
}

export interface AssemblyPlan {
  scenes: Array<{
    sceneId: string
    assetIds: string[]
    transitions: string[]
    duration: number
  }>
  totalDuration: number
  outputFormat: string
  resolution: string
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateVideoPayload(payload: VideoCapabilityPayload): string | null {
  if (!payload.prompt || payload.prompt.trim().length === 0) {
    return 'Prompt is required'
  }
  if (payload.duration < 1 || payload.duration > 600) {
    return 'Duration must be between 1 and 600 seconds'
  }
  if (payload.sceneCount && (payload.sceneCount < 1 || payload.sceneCount > 50)) {
    return 'Scene count must be between 1 and 50'
  }
  return null
}

// ── Storyboard Generation ─────────────────────────────────────────────────────

export function generateVideoStoryboard(payload: VideoCapabilityPayload): VideoStoryboard {
  const sceneCount = payload.sceneCount || Math.max(1, Math.floor(payload.duration / 10))
  const scenes: VideoScene[] = []

  for (let i = 0; i < sceneCount; i++) {
    scenes.push({
      id: `scene-${i + 1}`,
      description: `Scene ${i + 1}: ${payload.prompt}`,
      duration: Math.floor(payload.duration / sceneCount),
      cameraAngle: payload.cameraStyle || 'medium_shot',
      visualNotes: `${payload.style || 'cinematic'} style`,
      narration: payload.voiceover ? `Narration for scene ${i + 1}` : undefined,
    })
  }

  return {
    scenes,
    totalDuration: payload.duration,
    style: payload.style || 'cinematic',
    narration: payload.voiceover ? `Full narration for: ${payload.prompt}` : undefined,
  }
}

// ── Long-Form Video Plan ──────────────────────────────────────────────────────

export function generateLongFormVideoPlan(payload: VideoCapabilityPayload): LongFormVideoPlan {
  const storyboard = generateVideoStoryboard(payload)
  const assets: VideoAsset[] = []
  const assemblyPlan: AssemblyPlan = {
    scenes: [],
    totalDuration: payload.duration,
    outputFormat: 'mp4',
    resolution: getResolution(payload.ratio, payload.quality),
  }

  // Generate assets for each scene
  storyboard.scenes.forEach((scene, index) => {
    assets.push({
      id: `asset-${index + 1}`,
      type: 'video',
      source: 'generated',
      description: scene.description,
    })

    assemblyPlan.scenes.push({
      sceneId: scene.id,
      assetIds: [`asset-${index + 1}`],
      transitions: ['cut'],
      duration: scene.duration,
    })
  })

  return {
    script: generateScript(payload.prompt, payload.videoType),
    storyboard,
    scenes: storyboard.scenes,
    assets,
    assemblyPlan,
  }
}

function getResolution(ratio: VideoRatio, quality: VideoQuality): string {
  const resolutions: Record<VideoRatio, Record<VideoQuality, string>> = {
    '16:9': { draft: '854x480', standard: '1920x1080', premium: '3840x2160' },
    '9:16': { draft: '480x854', standard: '1080x1920', premium: '2160x3840' },
    '1:1': { draft: '480x480', standard: '1080x1080', premium: '2160x2160' },
  }
  return resolutions[ratio][quality]
}

function generateScript(prompt: string, videoType: VideoType): string {
  const templates: Record<VideoType, string> = {
    marketing: `Marketing Video Script\n\nProduct: ${prompt}\n\n[Opening Hook]\nAttention-grabbing opening...\n\n[Problem Statement]\nIdentify the problem...\n\n[Solution]\nPresent the solution...\n\n[Call to Action]\nClear CTA...`,
    cinematic: `Cinematic Video Script\n\nConcept: ${prompt}\n\n[Act 1]\nEstablishing shots...\n\n[Act 2]\nRising action...\n\n[Act 3]\nClimax and resolution...`,
    product: `Product Video Script\n\nProduct: ${prompt}\n\n[Intro]\nProduct overview...\n\n[Features]\nKey features...\n\n[Benefits]\nUser benefits...\n\n[Demo]\nProduct demonstration...`,
    social: `Social Media Video Script\n\nTopic: ${prompt}\n\n[Hook]\nFirst 3 seconds...\n\n[Content]\nMain content...\n\n[CTA]\nCall to action...`,
    educational: `Educational Video Script\n\nTopic: ${prompt}\n\n[Intro]\nLearning objectives...\n\n[Content]\nMain content...\n\n[Summary]\nKey takeaways...`,
    storytelling: `Storytelling Video Script\n\nStory: ${prompt}\n\n[Setup]\nCharacters and setting...\n\n[Conflict]\nMain conflict...\n\n[Resolution]\nResolution...`,
  }
  return templates[videoType]
}
