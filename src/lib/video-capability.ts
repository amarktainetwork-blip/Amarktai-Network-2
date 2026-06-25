/**
 * @module video-capability
 * @description Video generation capability — real multi-provider orchestration.
 *
 * Providers:
 *   genx        — Premium async video jobs (veo-3.1, kling, seedance, pixverse)
 *   together    — disabled for video until a current async video endpoint is proven
 *   huggingface — HunyuanVideo, LTX-Video, Wan2.x, CogVideoX, AnimateDiff
 *                 (endpoint-based full-length; serverless for short clips)
 *
 * Groq/MiMo contribute to planning/script only via existing text routing.
 * Never claimed as real video generators.
 *
 * Server-side only.
 */

// ── Video modes ───────────────────────────────────────────────────────────────

export type VideoMode =
  | 'text_to_video'
  | 'image_to_video'
  | 'video_to_video'
  | 'short_form'
  | 'long_form'
  | 'cartoon_episode'

// ── Video styles ──────────────────────────────────────────────────────────────

export const ALLOWED_VIDEO_STYLES = [
  'realistic', 'cinematic', 'animation', 'cartoon', 'anime',
  '3d_animation', 'children_cartoon', 'explainer', 'product_demo',
  'documentary', 'music_video', 'social_reel', 'vertical_short', 'widescreen',
] as const

export type VideoStyle = (typeof ALLOWED_VIDEO_STYLES)[number]

// ── Aspect ratios ─────────────────────────────────────────────────────────────

export const ALLOWED_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '21:9'] as const
export type AspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number]

// ── Budget modes ──────────────────────────────────────────────────────────────

export type BudgetMode = 'cheap' | 'balanced' | 'premium'

// ── Generation modes (returned in metadata) ───────────────────────────────────

export type VideoGenerationMode =
  | 'clip'
  | 'short_form'
  | 'image_to_video'
  | 'video_to_video'
  | 'cartoon_episode_clip'
  | 'long_form_plan'
  | 'orchestration_plan'
  | 'assembled_video'

// ── Payload ───────────────────────────────────────────────────────────────────

export interface VideoCapabilityPayload {
  prompt: string
  mode: VideoMode
  style?: VideoStyle
  aspectRatio?: AspectRatio
  /** Duration in seconds — range 3–600, default 10 */
  duration?: number
  fps?: 24 | 30 | 60
  resolution?: '480p' | '720p' | '1080p' | '4k'
  budget?: BudgetMode
  /** Image URL for image_to_video */
  imageInput?: string
  /** Source video URL for video_to_video */
  videoInput?: string
  mood?: string
  targetAudience?: string
  voiceover?: boolean
  captions?: boolean
  music?: boolean
  /** Character definitions for cartoon/story workflows */
  characters?: CharacterDefinition[]
  /** Explicit scene list for long-form */
  scenes?: SceneDefinition[]
  narration?: string
  /** Recurring series metadata */
  series?: SeriesMetadata
  brandMetadata?: Record<string, unknown>
}

export interface CharacterDefinition {
  id: string
  name: string
  description: string
  visualStyle?: string
}

export interface SceneDefinition {
  id: string
  description: string
  durationSeconds: number
  dialogue?: string
  action?: string
}

export interface SeriesMetadata {
  seriesName: string
  episodeNumber: number
  totalEpisodes?: number
  recurringCharacters?: string[]
  previousEpisodeSummary?: string
  styleConsistencyNotes?: string
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateVideoPayload(payload: VideoCapabilityPayload): string | null {
  if (!payload.prompt || payload.prompt.trim().length === 0) {
    return 'Prompt is required'
  }
  const duration = payload.duration ?? 10
  if (duration < 3 || duration > 600) {
    return 'Duration must be between 3 and 600 seconds'
  }
  if (payload.style && !(ALLOWED_VIDEO_STYLES as readonly string[]).includes(payload.style)) {
    return `Unsupported style: "${payload.style}". Allowed: ${ALLOWED_VIDEO_STYLES.join(', ')}`
  }
  if (payload.aspectRatio && !(ALLOWED_ASPECT_RATIOS as readonly string[]).includes(payload.aspectRatio)) {
    return `Unsupported aspect ratio: "${payload.aspectRatio}". Allowed: ${ALLOWED_ASPECT_RATIOS.join(', ')}`
  }
  if (payload.mode === 'image_to_video' && !payload.imageInput) {
    return 'imageInput URL is required for image_to_video mode'
  }
  if (payload.mode === 'video_to_video' && !payload.videoInput) {
    return 'videoInput URL is required for video_to_video mode'
  }
  if (payload.scenes && payload.scenes.length > 50) {
    return 'Maximum 50 scenes allowed'
  }
  return null
}

// ── HF Video Provider Catalog ─────────────────────────────────────────────────

export interface HFVideoProviderEntry {
  key: string
  label: string
  modelId: string | null
  endpointEnvKey: string | null
  modesSupported: VideoMode[]
  generationMode: VideoGenerationMode
  supportsImageInput: boolean
  supportsVideoInput: boolean
  supportsCartoon: boolean
  supportsRealistic: boolean
  maxDurationSeconds: number | null
  requiresEndpoint: boolean
  costTier: 'free' | 'low' | 'medium'
  qualityTier: 'basic' | 'standard' | 'high'
  priority: number
  notes: string
}

export const HF_VIDEO_CATALOG: HFVideoProviderEntry[] = [
  {
    key: 'hunyuan_video',
    label: 'HunyuanVideo',
    modelId: 'tencent/HunyuanVideo',
    endpointEnvKey: 'HF_ENDPOINT_HUNYUAN_VIDEO',
    modesSupported: ['text_to_video', 'short_form'],
    generationMode: 'clip',
    supportsImageInput: false,
    supportsVideoInput: false,
    supportsCartoon: false,
    supportsRealistic: true,
    maxDurationSeconds: 10,
    requiresEndpoint: true,
    costTier: 'medium',
    qualityTier: 'high',
    priority: 90,
    notes: 'High-quality text-to-video. Requires HF Inference Endpoint.',
  },
  {
    key: 'ltx_video',
    label: 'LTX-Video',
    modelId: 'Lightricks/LTX-Video',
    endpointEnvKey: 'HF_ENDPOINT_LTX_VIDEO',
    modesSupported: ['text_to_video', 'image_to_video', 'short_form'],
    generationMode: 'image_to_video',
    supportsImageInput: true,
    supportsVideoInput: false,
    supportsCartoon: false,
    supportsRealistic: true,
    maxDurationSeconds: 8,
    requiresEndpoint: true,
    costTier: 'low',
    qualityTier: 'standard',
    priority: 85,
    notes: 'Fast text-to-video and image-to-video. Requires HF Inference Endpoint.',
  },
  {
    key: 'wan2',
    label: 'Wan2.x',
    modelId: 'Wan-AI/Wan2.1-T2V-14B',
    endpointEnvKey: 'HF_ENDPOINT_WAN2',
    modesSupported: ['text_to_video', 'image_to_video', 'short_form'],
    generationMode: 'clip',
    supportsImageInput: true,
    supportsVideoInput: false,
    supportsCartoon: true,
    supportsRealistic: true,
    maxDurationSeconds: 6,
    requiresEndpoint: true,
    costTier: 'medium',
    qualityTier: 'high',
    priority: 88,
    notes: 'High-quality Wan2.x text-to-video and I2V. Requires HF Inference Endpoint.',
  },
  {
    key: 'cogvideox',
    label: 'CogVideoX-5B',
    modelId: 'THUDM/CogVideoX-5b',
    endpointEnvKey: 'HF_ENDPOINT_COGVIDEOX',
    modesSupported: ['text_to_video', 'short_form'],
    generationMode: 'clip',
    supportsImageInput: false,
    supportsVideoInput: false,
    supportsCartoon: true,
    supportsRealistic: true,
    maxDurationSeconds: 6,
    requiresEndpoint: true,
    costTier: 'medium',
    qualityTier: 'high',
    priority: 80,
    notes: 'Good quality general text-to-video. Requires HF Inference Endpoint.',
  },
  {
    key: 'animatediff',
    label: 'AnimateDiff',
    modelId: 'ByteDance/AnimateDiff-Lightning',
    endpointEnvKey: null,
    modesSupported: ['text_to_video', 'short_form'],
    generationMode: 'clip',
    supportsImageInput: false,
    supportsVideoInput: false,
    supportsCartoon: true,
    supportsRealistic: false,
    maxDurationSeconds: 4,
    requiresEndpoint: false,
    costTier: 'free',
    qualityTier: 'basic',
    priority: 40,
    notes: 'Fast animation-style clips via HF serverless API.',
  },
]

// ── Together Video Catalog ────────────────────────────────────────────────────

export interface TogetherVideoEntry {
  key: string
  label: string
  modelId: string
  modesSupported: VideoMode[]
  generationMode: VideoGenerationMode
  supportsImageInput: boolean
  maxDurationSeconds: number | null
  costTier: 'low' | 'medium' | 'high'
  qualityTier: 'basic' | 'standard' | 'high'
  priority: number
  apiPath: string
}

export const TOGETHER_VIDEO_CATALOG: TogetherVideoEntry[] = []

// ── HF candidate resolution ───────────────────────────────────────────────────

export interface HFVideoCandidate {
  entry: HFVideoProviderEntry
  endpointUrl: string | null
  hfApiKey: string
}

export function resolveHFVideoCandidates(
  hfApiKey: string,
  mode: VideoMode,
  style: VideoStyle | undefined,
  hasImageInput: boolean,
  budget: BudgetMode,
): HFVideoCandidate[] {
  const candidates: HFVideoCandidate[] = []

  for (const entry of HF_VIDEO_CATALOG) {
    if (!entry.modesSupported.includes(mode) && mode !== 'cartoon_episode' && mode !== 'long_form') {
      if (!entry.modesSupported.includes('text_to_video')) continue
    }
    if (mode === 'image_to_video' && !entry.supportsImageInput) continue
    if (mode === 'video_to_video' && !entry.supportsVideoInput) continue

    let endpointUrl: string | null = null
    if (entry.endpointEnvKey) {
      endpointUrl = process.env[entry.endpointEnvKey] ?? null
      if (entry.requiresEndpoint && !endpointUrl) continue
    }

    // Cheap budget skips high-cost entries
    if (budget === 'cheap' && entry.costTier === 'medium') {
      // Allow if no cheaper option with image support available
      if (!hasImageInput) continue
    }

    candidates.push({ entry, endpointUrl, hfApiKey })
  }

  // Sort by priority descending; for cartoon styles prefer supportsCartoon entries
  const isCartoon = style === 'cartoon' || style === 'anime' || style === '3d_animation' || style === 'children_cartoon' || style === 'animation'
  candidates.sort((a, b) => {
    if (isCartoon) {
      if (a.entry.supportsCartoon && !b.entry.supportsCartoon) return -1
      if (!a.entry.supportsCartoon && b.entry.supportsCartoon) return 1
    }
    return b.entry.priority - a.entry.priority
  })

  return candidates
}

// ── HF Video Execution ────────────────────────────────────────────────────────

export interface HFVideoResult {
  success: boolean
  videoUrl: string | null
  videoDataUrl: string | null
  jobId: string | null
  model: string
  providerKey: string
  generationMode: VideoGenerationMode
  requestedDuration: number
  actualDuration: number | null
  error: string | null
}

export async function executeHFVideoCandidate(
  prompt: string,
  requestedDuration: number,
  candidate: HFVideoCandidate,
  imageInput?: string,
): Promise<HFVideoResult> {
  const { entry, endpointUrl, hfApiKey } = candidate
  const modelId = entry.modelId ?? 'unknown'
  const base = 'https://api-inference.huggingface.co'
  const targetUrl = endpointUrl ? endpointUrl.replace(/\/$/, '') : `${base}/models/${modelId}`

  const body: Record<string, unknown> = {
    inputs: prompt,
    parameters: {
      duration: Math.min(requestedDuration, entry.maxDurationSeconds ?? requestedDuration),
      ...(imageInput ? { image: imageInput } : {}),
    },
  }

  const empty = (error: string): HFVideoResult => ({
    success: false, videoUrl: null, videoDataUrl: null, jobId: null,
    model: modelId, providerKey: entry.key, generationMode: entry.generationMode,
    requestedDuration, actualDuration: null, error,
  })

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'video/mp4, video/webm, application/json, application/octet-stream',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      const isLoading = res.status === 503 || errText.toLowerCase().includes('loading')
      return empty(isLoading
        ? `${entry.label} model is loading. Retry shortly.`
        : `${entry.label} error ${res.status}: ${errText.slice(0, 300)}`)
    }

    const ct = res.headers.get('content-type') ?? ''

    // Binary video response
    if (ct.startsWith('video/') || ct === 'application/octet-stream') {
      const buf = await res.arrayBuffer()
      if (buf.byteLength === 0) return empty(`${entry.label} returned empty video buffer`)
      const mime = ct.startsWith('video/') ? ct.split(';')[0].trim() : 'video/mp4'
      const b64 = Buffer.from(buf).toString('base64')
      return {
        success: true, videoUrl: null, videoDataUrl: `data:${mime};base64,${b64}`,
        jobId: null, model: modelId, providerKey: entry.key,
        generationMode: entry.generationMode, requestedDuration,
        actualDuration: null, error: null,
      }
    }

    // JSON response — URL, job, or error
    if (ct.includes('application/json') || ct.includes('text/')) {
      const data = await res.json().catch(() => null) as Record<string, unknown> | null
      if (!data) return empty(`${entry.label} returned invalid JSON`)

      const videoUrl = typeof data.url === 'string' ? data.url
        : typeof data.video_url === 'string' ? data.video_url
        : typeof data.result_url === 'string' ? data.result_url : null

      if (videoUrl) {
        return {
          success: true, videoUrl, videoDataUrl: null, jobId: null,
          model: typeof data.model === 'string' ? data.model : modelId,
          providerKey: entry.key, generationMode: entry.generationMode,
          requestedDuration, actualDuration: typeof data.duration === 'number' ? data.duration : null,
          error: null,
        }
      }

      const jobId = typeof data.job_id === 'string' ? data.job_id
        : typeof data.id === 'string' ? data.id : null
      const status = typeof data.status === 'string' ? data.status : 'pending'
      if (jobId || ['queued', 'processing', 'pending'].includes(status)) {
        return {
          success: true, videoUrl: null, videoDataUrl: null, jobId,
          model: modelId, providerKey: entry.key, generationMode: entry.generationMode,
          requestedDuration, actualDuration: null, error: null,
        }
      }

      const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data).slice(0, 200)
      return empty(`${entry.label} returned no video: ${errMsg}`)
    }

    return empty(`${entry.label} returned unexpected content-type: ${ct}`)
  } catch (err) {
    return empty(`${entry.label} request failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function executeHFVideoGeneration(
  prompt: string,
  requestedDuration: number,
  hfApiKey: string,
  mode: VideoMode,
  style: VideoStyle | undefined,
  imageInput?: string,
  budget: BudgetMode = 'balanced',
): Promise<HFVideoResult> {
  const candidates = resolveHFVideoCandidates(hfApiKey, mode, style, !!imageInput, budget)

  if (candidates.length === 0) {
    return {
      success: false, videoUrl: null, videoDataUrl: null, jobId: null,
      model: 'none', providerKey: 'none', generationMode: 'clip',
      requestedDuration, actualDuration: null,
      error: 'No HuggingFace video provider is configured. Add HF API key and optionally configure HF_ENDPOINT_HUNYUAN_VIDEO, HF_ENDPOINT_LTX_VIDEO, HF_ENDPOINT_WAN2, or HF_ENDPOINT_COGVIDEOX.',
    }
  }

  let lastError = 'All HuggingFace video candidates failed'
  for (const candidate of candidates) {
    const result = await executeHFVideoCandidate(prompt, requestedDuration, candidate, imageInput)
    if (result.success) return result
    lastError = result.error ?? lastError
  }

  return {
    success: false, videoUrl: null, videoDataUrl: null, jobId: null,
    model: candidates[candidates.length - 1]?.entry.modelId ?? 'none',
    providerKey: candidates[candidates.length - 1]?.entry.key ?? 'none',
    generationMode: 'clip', requestedDuration, actualDuration: null, error: lastError,
  }
}

// ── Together Video Execution ──────────────────────────────────────────────────

export interface TogetherVideoResult {
  success: boolean
  videoUrl: string | null
  jobId: string | null
  status?: string
  model: string
  generationMode: VideoGenerationMode
  requestedDuration: number
  error: string | null
}

export async function executeTogetherVideoGeneration(
  prompt: string,
  requestedDuration: number,
  togetherApiKey: string,
  mode: VideoMode,
  imageInput?: string,
): Promise<TogetherVideoResult> {
  // Together video remains disabled until the current async endpoint/model is live-proven.
  const entry = TOGETHER_VIDEO_CATALOG[0]
  if (!entry) {
    return { success: false, videoUrl: null, jobId: null, model: 'none', generationMode: 'clip', requestedDuration, error: 'No Together video model configured' }
  }

  const body: Record<string, unknown> = {
    model: entry.modelId,
    prompt,
    duration: Math.min(requestedDuration, entry.maxDurationSeconds ?? 5),
    ...(imageInput ? { image_url: imageInput } : {}),
  }

  try {
    const res = await fetch(`https://api.together.xyz${entry.apiPath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${togetherApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      return { success: false, videoUrl: null, jobId: null, model: entry.modelId, generationMode: 'clip', requestedDuration, error: `Together video error ${res.status}: ${errText.slice(0, 300)}` }
    }

    const data = await res.json().catch(() => null) as Record<string, unknown> | null
    if (!data) return { success: false, videoUrl: null, jobId: null, model: entry.modelId, generationMode: 'clip', requestedDuration, error: 'Together video returned invalid JSON' }

    const videoUrl = typeof data.url === 'string' ? data.url
      : (data.data as Array<{ url?: string }>)?.[0]?.url ?? null
    if (videoUrl) {
      return { success: true, videoUrl, jobId: null, model: entry.modelId, generationMode: 'clip', requestedDuration, error: null }
    }

    const jobId = typeof data.id === 'string' ? data.id : typeof data.job_id === 'string' ? data.job_id : null
    if (jobId) {
      return { success: true, videoUrl: null, jobId, status: typeof data.status === 'string' ? data.status : 'processing', model: entry.modelId, generationMode: 'clip', requestedDuration, error: null }
    }

    const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data).slice(0, 200)
    return { success: false, videoUrl: null, jobId: null, model: entry.modelId, generationMode: 'clip', requestedDuration, error: `Together video returned no result: ${errMsg}` }
  } catch (err) {
    return { success: false, videoUrl: null, jobId: null, model: entry.modelId, generationMode: 'clip', requestedDuration, error: `Together video request failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── Video provider prompt builder ─────────────────────────────────────────────

export interface VideoProviderPrompt {
  prompt: string
  duration: number
  mode: VideoMode
  generationMode: VideoGenerationMode
  aspectRatio: AspectRatio
  style: VideoStyle
  hasImageInput: boolean
  orchestrationPlan?: VideoOrchestrationPlan
}

export interface VideoOrchestrationPlan {
  title: string
  mode: VideoMode
  totalDurationSeconds: number
  scenes: SceneDefinition[]
  characters: CharacterDefinition[]
  voiceoverRequired: boolean
  captionsRequired: boolean
  musicRequired: boolean
  seriesMetadata?: SeriesMetadata
  assetRequirements: string[]
  assemblyNotes: string
}

export function buildVideoProviderPrompt(payload: VideoCapabilityPayload): VideoProviderPrompt {
  const duration = payload.duration ?? 10
  const aspectRatio = payload.aspectRatio ?? '16:9'
  const style = payload.style ?? 'cinematic'
  const mode = payload.mode

  const isLongForm = mode === 'long_form' || mode === 'cartoon_episode' || duration > 60
  const generationMode: VideoGenerationMode = isLongForm ? 'orchestration_plan' : mode === 'image_to_video' ? 'image_to_video' : mode === 'video_to_video' ? 'video_to_video' : 'clip'

  const styleDesc = buildStyleDescription(style, payload.targetAudience)
  const moodDesc = payload.mood ? `Mood: ${payload.mood}.` : ''
  const voiceDesc = payload.voiceover ? 'Include voiceover narration.' : ''
  const captionDesc = payload.captions ? 'Include captions/subtitles.' : ''
  const musicDesc = payload.music ? 'Include background music.' : ''

  const parts = [
    `Generate a ${duration}-second ${style} video.`,
    `Aspect ratio: ${aspectRatio}.`,
    styleDesc,
    moodDesc,
    voiceDesc,
    captionDesc,
    musicDesc,
    `Prompt: ${payload.prompt}`,
  ]
  const prompt = parts.filter(Boolean).join(' ').trim()

  let orchestrationPlan: VideoOrchestrationPlan | undefined
  if (isLongForm) {
    const scenes = payload.scenes ?? generateDefaultScenes(payload.prompt, duration)
    orchestrationPlan = {
      title: payload.prompt.slice(0, 80),
      mode,
      totalDurationSeconds: duration,
      scenes,
      characters: payload.characters ?? [],
      voiceoverRequired: payload.voiceover ?? false,
      captionsRequired: payload.captions ?? false,
      musicRequired: payload.music ?? false,
      seriesMetadata: payload.series,
      assetRequirements: buildAssetRequirements(scenes, payload),
      assemblyNotes: buildAssemblyNotes(payload),
    }
  }

  return { prompt, duration, mode, generationMode, aspectRatio, style, hasImageInput: !!payload.imageInput, orchestrationPlan }
}

function buildStyleDescription(style: VideoStyle, targetAudience?: string): string {
  const styleDescriptions: Record<VideoStyle, string> = {
    realistic: 'Photorealistic, natural lighting, authentic detail.',
    cinematic: 'Cinematic quality, dramatic lighting, film-grade color grade.',
    animation: 'Smooth animation, vivid colors, fluid motion.',
    cartoon: 'Cartoon style, bold outlines, expressive characters.',
    anime: 'Anime art style, dynamic motion lines, expressive facial detail.',
    '3d_animation': '3D rendered animation, volumetric lighting, rendered textures.',
    children_cartoon: 'Bright cheerful children\'s cartoon, simple shapes, friendly characters.',
    explainer: 'Clean explainer style, clear visuals, informative layout.',
    product_demo: 'Professional product showcase, clean background, detail focus.',
    documentary: 'Documentary style, observational camera work, authentic feel.',
    music_video: 'Music video aesthetic, rhythmic cuts, visual energy.',
    social_reel: 'Vertical social media reel style, punchy and attention-grabbing.',
    vertical_short: 'Vertical format short-form, mobile-optimized composition.',
    widescreen: 'Widescreen cinematic composition, 21:9 aspect, letterboxed.',
  }
  const base = styleDescriptions[style] ?? ''
  return targetAudience ? `${base} Target audience: ${targetAudience}.` : base
}

function generateDefaultScenes(prompt: string, totalDuration: number): SceneDefinition[] {
  const sceneCount = Math.max(1, Math.min(10, Math.floor(totalDuration / 15)))
  const sceneDuration = Math.floor(totalDuration / sceneCount)
  return Array.from({ length: sceneCount }, (_, i) => ({
    id: `scene-${i + 1}`,
    description: `Scene ${i + 1}: ${prompt}`,
    durationSeconds: sceneDuration,
  }))
}

function buildAssetRequirements(scenes: SceneDefinition[], payload: VideoCapabilityPayload): string[] {
  const reqs: string[] = [`${scenes.length} video clips or images`]
  if (payload.voiceover) reqs.push('Voiceover audio track')
  if (payload.music) reqs.push('Background music track')
  if (payload.captions) reqs.push('Caption/subtitle file')
  if ((payload.characters?.length ?? 0) > 0) reqs.push(`${payload.characters!.length} consistent character reference images`)
  return reqs
}

function buildAssemblyNotes(payload: VideoCapabilityPayload): string {
  const notes: string[] = []
  if (payload.series) {
    notes.push(`Series: ${payload.series.seriesName} — Episode ${payload.series.episodeNumber}`)
    if (payload.series.styleConsistencyNotes) notes.push(payload.series.styleConsistencyNotes)
  }
  if (payload.mode === 'cartoon_episode') notes.push('Maintain character and style consistency across all scenes.')
  return notes.join(' ') || 'Standard assembly — cut between scenes per plan.'
}

// ── Budget-based provider ordering ───────────────────────────────────────────

export interface VideoProviderOrder {
  primary: 'genx' | 'together' | 'huggingface'
  fallbacks: Array<'genx' | 'together' | 'huggingface'>
}

export function resolveVideoProviderOrder(
  budget: BudgetMode,
  mode: VideoMode,
  duration: number,
): VideoProviderOrder {
  // Long-form always orchestrates via text, then attempts clip generation
  // For real clip generation, order depends on budget. Together is omitted until live video proof exists.

  if (budget === 'cheap') {
    return { primary: 'huggingface', fallbacks: ['genx'] }
  }

  if (budget === 'premium') {
    return { primary: 'genx', fallbacks: ['huggingface'] }
  }

  // Balanced: duration drives choice; short clips try HF first.
  if (duration <= 10) {
    return { primary: 'huggingface', fallbacks: ['genx'] }
  }
  return { primary: 'genx', fallbacks: ['huggingface'] }
}
