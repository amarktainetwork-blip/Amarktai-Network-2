/**
 * @module avatar-capability
 * @description Avatar System — real multi-provider orchestration.
 *
 * Distinct from adult_avatar (which uses HF dedicated adult endpoints).
 * This module handles ALL non-adult avatar generation.
 *
 * Providers:
 *   genx        — premium avatar image/video (SOURCE_WIRED)
 *   huggingface — avatar image via HF Inference Endpoint/API
 *   together    — avatar image via Together FLUX/image models (cheap/balanced)
 *   groq/mimo   — text/profile/personality generation only, no image/video claim
 *
 * Server-side only.
 */

// ── Avatar styles ─────────────────────────────────────────────────────────────

export const ALLOWED_AVATAR_STYLES = [
  'realistic_human', 'anime', 'semi_realistic', '3d_character', 'cartoon',
  'children_cartoon', 'fantasy_character', 'brand_mascot', 'product_presenter',
  'customer_service_agent', 'teacher_tutor', 'story_character', 'ai_friend',
  'creator_avatar',
] as const

export type AvatarStyle = (typeof ALLOWED_AVATAR_STYLES)[number]

// ── Avatar modes ──────────────────────────────────────────────────────────────

export const ALLOWED_AVATAR_MODES = [
  'portrait', 'full_body', 'talking_head', 'image_avatar', 'video_avatar',
  'animated_avatar', 'cartoon_character', 'brand_character',
] as const

export type AvatarMode = (typeof ALLOWED_AVATAR_MODES)[number]

// ── Age categories ────────────────────────────────────────────────────────────

export const ALLOWED_AGE_CATEGORIES = ['adult', 'child_character', 'ageless', 'mascot'] as const
export type AvatarAgeCategory = (typeof ALLOWED_AGE_CATEGORIES)[number]

// ── Usage contexts ────────────────────────────────────────────────────────────

export const ALLOWED_USAGE_CONTEXTS = [
  'story', 'marketing', 'support', 'education', 'friend', 'brand', 'creator', 'general',
] as const
export type AvatarUsageContext = (typeof ALLOWED_USAGE_CONTEXTS)[number]

// ── Voice modes ───────────────────────────────────────────────────────────────

export type AvatarVoiceMode = 'none' | 'generated_voice' | 'cloned_voice'

export interface AvatarVoiceConfig {
  voiceMode: AvatarVoiceMode
  /** Explicit consent required for cloned_voice */
  consentConfirmed?: boolean
  /** Required for real-person/brand voice cloning */
  rightsConfirmed?: boolean
  referenceAudioUrl?: string
  sampleText?: string
  voiceStyle?: string
  language?: string
  accent?: string
  emotion?: string
  speakingRate?: number
  pitch?: number
}

// ── Avatar payload ────────────────────────────────────────────────────────────

export interface AvatarPayload {
  /** Avatar display name */
  avatarName: string
  /** App that owns this avatar */
  appSlug?: string
  avatarRole?: string
  style: AvatarStyle
  mode: AvatarMode
  ageCategory: AvatarAgeCategory
  /** Text description of appearance */
  appearance: string
  personality?: string
  voice?: AvatarVoiceConfig
  outfit?: string
  pose?: string
  background?: string
  brandColors?: string[]
  referenceImageUrl?: string
  consistencySeed?: number
  aspectRatio?: '1:1' | '2:3' | '3:4' | '16:9' | '9:16'
  resolution?: '512px' | '768px' | '1024px' | '1536px'
  animationPrompt?: string
  scriptLine?: string
  emotion?: string
  targetAudience?: string
  usage?: AvatarUsageContext
  /** Budget preference passed from app/runtime */
  budget?: 'cheap' | 'balanced' | 'premium'
}

// ── Validation ────────────────────────────────────────────────────────────────

const CHILD_CHARACTER_BLOCKED_TERMS: readonly string[] = [
  'sexy', 'sexual', 'nude', 'naked', 'explicit', 'nsfw', 'erotic', 'adult content',
  'intimate', 'seductive', 'lingerie', 'underwear',
]

const VOICE_CLONE_BLOCKED_TERMS: readonly string[] = [
  'minor', 'child', 'underage', 'teen', 'adolescent', 'schoolgirl', 'schoolboy',
]

const CELEBRITY_IMPERSONATION_TERMS: readonly string[] = [
  'celebrity voice', 'famous person', 'impersonate', 'sound exactly like',
  'clone this celebrity', 'clone my ex', 'clone my partner', 'clone my boss',
]

export interface AvatarValidationResult {
  valid: boolean
  error: string | null
}

export function validateAvatarPayload(payload: AvatarPayload): AvatarValidationResult {
  if (!payload.avatarName || payload.avatarName.trim().length === 0) {
    return { valid: false, error: 'avatarName is required' }
  }
  if (payload.avatarName.length > 100) {
    return { valid: false, error: 'avatarName must be 100 characters or less' }
  }
  if (!payload.appearance || payload.appearance.trim().length === 0) {
    return { valid: false, error: 'appearance is required' }
  }
  if (!(ALLOWED_AVATAR_STYLES as readonly string[]).includes(payload.style)) {
    return { valid: false, error: `Unsupported style: "${payload.style}". Allowed: ${ALLOWED_AVATAR_STYLES.join(', ')}` }
  }
  if (!(ALLOWED_AVATAR_MODES as readonly string[]).includes(payload.mode)) {
    return { valid: false, error: `Unsupported mode: "${payload.mode}". Allowed: ${ALLOWED_AVATAR_MODES.join(', ')}` }
  }
  if (!(ALLOWED_AGE_CATEGORIES as readonly string[]).includes(payload.ageCategory)) {
    return { valid: false, error: `Unsupported ageCategory: "${payload.ageCategory}". Allowed: ${ALLOWED_AGE_CATEGORIES.join(', ')}` }
  }

  // Child characters must be non-sexual
  if (payload.ageCategory === 'child_character') {
    const lower = `${payload.appearance} ${payload.animationPrompt ?? ''} ${payload.scriptLine ?? ''}`.toLowerCase()
    for (const term of CHILD_CHARACTER_BLOCKED_TERMS) {
      if (lower.includes(term)) {
        return { valid: false, error: `Blocked: child_character avatars must not contain sexual or explicit content. Prohibited term: "${term}"` }
      }
    }
  }

  // Voice clone validation
  if (payload.voice?.voiceMode === 'cloned_voice') {
    if (!payload.voice.consentConfirmed) {
      return { valid: false, error: 'Voice cloning requires consentConfirmed=true' }
    }
    const voiceDesc = `${payload.voice.voiceStyle ?? ''} ${payload.voice.sampleText ?? ''}`.toLowerCase()
    for (const term of VOICE_CLONE_BLOCKED_TERMS) {
      if (voiceDesc.includes(term)) {
        return { valid: false, error: `Blocked: voice cloning cannot target a minor's voice. Prohibited term: "${term}"` }
      }
    }
    for (const term of CELEBRITY_IMPERSONATION_TERMS) {
      if (voiceDesc.includes(term) && !payload.voice.rightsConfirmed) {
        return { valid: false, error: 'Blocked: celebrity or real-person voice cloning requires rightsConfirmed=true and explicit rights confirmation' }
      }
    }
  }

  return { valid: true, error: null }
}

// ── Style quality prompts ──────────────────────────────────────────────────────

const STYLE_QUALITY_PROMPTS: Record<AvatarStyle, string> = {
  realistic_human: 'photorealistic portrait, natural lighting, detailed skin texture, DSLR quality',
  anime: 'anime art style, cel-shaded, expressive eyes, clean line art, vibrant colors',
  semi_realistic: 'semi-realistic digital art, stylized realism, artistic rendering',
  '3d_character': '3D rendered character, volumetric lighting, subsurface scattering, Pixar-style render',
  cartoon: 'cartoon style, bold outlines, exaggerated features, bright colors',
  children_cartoon: 'friendly children\'s cartoon, cheerful colors, simple rounded shapes, safe and wholesome',
  fantasy_character: 'fantasy character concept art, epic lighting, detailed costume, painterly style',
  brand_mascot: 'professional brand mascot illustration, clean design, memorable visual identity',
  product_presenter: 'professional presenter portrait, clean background, confident stance, product demo ready',
  customer_service_agent: 'friendly professional portrait, business attire, approachable expression, office background',
  teacher_tutor: 'warm educator portrait, friendly and knowledgeable expression, classroom or study background',
  story_character: 'storybook character illustration, expressive, narrative visual style',
  ai_friend: 'friendly AI companion portrait, warm expression, approachable digital style',
  creator_avatar: 'content creator portrait, vibrant personality, studio-ready composition',
}

// ── Prompt builder ────────────────────────────────────────────────────────────

export interface AvatarProviderPrompt {
  prompt: string
  negativePrompt: string
  style: AvatarStyle
  mode: AvatarMode
  aspectRatio: AvatarPayload['aspectRatio']
  resolution: AvatarPayload['resolution']
  params: Record<string, unknown>
}

export function buildAvatarPrompt(payload: AvatarPayload): AvatarProviderPrompt {
  const stylePrompt = STYLE_QUALITY_PROMPTS[payload.style]
  const parts: string[] = [stylePrompt, payload.appearance.trim()]

  if (payload.avatarRole) parts.push(`Role: ${payload.avatarRole}`)
  if (payload.outfit) parts.push(`Outfit: ${payload.outfit}`)
  if (payload.pose) parts.push(`Pose: ${payload.pose}`)
  if (payload.background) parts.push(`Background: ${payload.background}`)
  if (payload.emotion) parts.push(`Expression: ${payload.emotion}`)
  if (payload.personality) parts.push(`Personality: ${payload.personality}`)
  if (payload.targetAudience) parts.push(`Target audience: ${payload.targetAudience}`)
  if (payload.brandColors?.length) parts.push(`Brand colors: ${payload.brandColors.join(', ')}`)
  if (payload.animationPrompt) parts.push(`Animation: ${payload.animationPrompt}`)

  const negativeTerms = ['blurry', 'low quality', 'deformed', 'ugly', 'distorted', 'watermark', 'text overlay']
  if (payload.ageCategory === 'child_character') {
    negativeTerms.push('adult', 'mature', 'sexual', 'explicit', 'nsfw')
  }

  const aspectToSize: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '2:3': { width: 768, height: 1152 },
    '3:4': { width: 768, height: 1024 },
    '16:9': { width: 1024, height: 576 },
    '9:16': { width: 576, height: 1024 },
  }
  const size = payload.aspectRatio ? (aspectToSize[payload.aspectRatio] ?? { width: 1024, height: 1024 }) : { width: 1024, height: 1024 }

  return {
    prompt: parts.join('. '),
    negativePrompt: negativeTerms.join(', '),
    style: payload.style,
    mode: payload.mode,
    aspectRatio: payload.aspectRatio ?? '1:1',
    resolution: payload.resolution ?? '1024px',
    params: {
      width: size.width,
      height: size.height,
      num_inference_steps: 28,
      guidance_scale: 7.5,
      ...(payload.consistencySeed !== undefined ? { seed: payload.consistencySeed } : {}),
      ...(payload.referenceImageUrl ? { image: payload.referenceImageUrl } : {}),
    },
  }
}

// ── Provider catalog ──────────────────────────────────────────────────────────

export type AvatarProviderKey = 'genx' | 'huggingface' | 'together'

export interface AvatarProviderEntry {
  key: AvatarProviderKey
  label: string
  modesSupported: AvatarMode[]
  stylesSupported: AvatarStyle[]
  generatesImage: boolean
  generatesVideo: boolean
  costTier: 'free' | 'low' | 'medium' | 'high'
  qualityTier: 'basic' | 'standard' | 'high' | 'premium'
  priority: { cheap: number; balanced: number; premium: number }
  requiresEndpointEnv?: string
  endpointFallbackEnv?: string
  modelEnv?: string
  modelFallbackEnv?: string
  defaultModel?: string
  notes: string
}

export const AVATAR_PROVIDER_CATALOG: AvatarProviderEntry[] = [
  {
    key: 'genx',
    label: 'GenX',
    modesSupported: ['portrait', 'full_body', 'image_avatar', 'video_avatar', 'talking_head'],
    stylesSupported: ALLOWED_AVATAR_STYLES as unknown as AvatarStyle[],
    generatesImage: true,
    generatesVideo: true,
    costTier: 'high',
    qualityTier: 'premium',
    priority: { cheap: 3, balanced: 2, premium: 1 },
    notes: 'Premium avatar image and video via GenX media API.',
  },
  {
    key: 'huggingface',
    label: 'HuggingFace',
    modesSupported: ['portrait', 'full_body', 'image_avatar', 'cartoon_character', 'brand_character'],
    stylesSupported: ['realistic_human', 'anime', 'semi_realistic', '3d_character', 'cartoon', 'children_cartoon', 'fantasy_character', 'brand_mascot', 'story_character', 'ai_friend'],
    generatesImage: true,
    generatesVideo: false,
    costTier: 'free',
    qualityTier: 'standard',
    priority: { cheap: 1, balanced: 2, premium: 3 },
    requiresEndpointEnv: 'HF_AVATAR_IMAGE_ENDPOINT',
    endpointFallbackEnv: 'HF_AVATAR_IMAGE_ENDPOINT_FALLBACK',
    modelEnv: 'HF_AVATAR_IMAGE_MODEL',
    modelFallbackEnv: 'HF_AVATAR_IMAGE_MODEL_FALLBACK',
    defaultModel: 'stabilityai/stable-diffusion-xl-base-1.0',
    notes: 'HF Inference Endpoint or serverless API for avatar images. Set HF_AVATAR_IMAGE_ENDPOINT for dedicated endpoint.',
  },
  {
    key: 'together',
    label: 'Together AI',
    modesSupported: ['portrait', 'full_body', 'image_avatar', 'cartoon_character', 'brand_character'],
    stylesSupported: ['realistic_human', 'anime', 'cartoon', 'children_cartoon', 'brand_mascot', 'story_character', 'product_presenter', 'customer_service_agent', 'teacher_tutor', 'ai_friend', 'creator_avatar'],
    generatesImage: true,
    generatesVideo: false,
    costTier: 'low',
    qualityTier: 'standard',
    priority: { cheap: 2, balanced: 1, premium: 3 },
    defaultModel: 'black-forest-labs/FLUX.1-schnell-Free',
    notes: 'Together FLUX image generation for avatar images. Good for cheap/balanced workflows.',
  },
]

// ── Provider ordering by budget ───────────────────────────────────────────────

export function resolveAvatarProviderOrder(
  budget: 'cheap' | 'balanced' | 'premium',
  mode: AvatarMode,
  style: AvatarStyle,
): AvatarProviderKey[] {
  return AVATAR_PROVIDER_CATALOG
    .filter(p => p.modesSupported.includes(mode) || ['portrait', 'image_avatar'].includes(mode))
    .filter(p => p.generatesImage)
    .sort((a, b) => a.priority[budget] - b.priority[budget])
    .map(p => p.key)
}

// ── HF avatar execution ───────────────────────────────────────────────────────

export interface AvatarImageResult {
  success: boolean
  imageDataUrl: string | null
  imageUrl: string | null
  jobId: string | null
  model: string
  provider: AvatarProviderKey
  error: string | null
}

export async function executeHFAvatarImage(
  prompt: AvatarProviderPrompt,
  hfApiKey: string,
): Promise<AvatarImageResult> {
  const fail = (error: string): AvatarImageResult => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model: 'none', provider: 'huggingface', error })

  // Resolve endpoint — dedicated endpoint preferred, serverless fallback
  const candidates: Array<{ url: string; modelId: string }> = []

  const primaryUrl = process.env[AVATAR_PROVIDER_CATALOG.find(p => p.key === 'huggingface')?.requiresEndpointEnv ?? ''] ?? null
  const primaryModel = process.env[AVATAR_PROVIDER_CATALOG.find(p => p.key === 'huggingface')?.modelEnv ?? '']
    ?? AVATAR_PROVIDER_CATALOG.find(p => p.key === 'huggingface')?.defaultModel
    ?? 'stabilityai/stable-diffusion-xl-base-1.0'

  if (primaryUrl) {
    candidates.push({ url: primaryUrl.replace(/\/$/, ''), modelId: primaryModel })
  }

  const fallbackUrl = process.env[AVATAR_PROVIDER_CATALOG.find(p => p.key === 'huggingface')?.endpointFallbackEnv ?? ''] ?? null
  const fallbackModel = process.env[AVATAR_PROVIDER_CATALOG.find(p => p.key === 'huggingface')?.modelFallbackEnv ?? ''] ?? primaryModel
  if (fallbackUrl && fallbackUrl !== primaryUrl) {
    candidates.push({ url: fallbackUrl.replace(/\/$/, ''), modelId: fallbackModel })
  }

  // Serverless fallback — use HF inference API directly
  if (candidates.length === 0) {
    candidates.push({ url: `https://api-inference.huggingface.co/models/${primaryModel}`, modelId: primaryModel })
  }

  for (const candidate of candidates) {
    try {
      const body = {
        inputs: prompt.prompt,
        parameters: {
          negative_prompt: prompt.negativePrompt,
          ...prompt.params,
        },
      }
      const res = await fetch(candidate.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'image/png, image/jpeg, application/json, application/octet-stream',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        if (res.status === 503) continue // model loading — try next
        continue
      }

      const ct = res.headers.get('content-type') ?? ''

      if (ct.startsWith('image/') || ct === 'application/octet-stream') {
        const buf = await res.arrayBuffer()
        if (buf.byteLength === 0) continue
        const mime = ct.startsWith('image/') ? ct.split(';')[0].trim() : 'image/png'
        return { success: true, imageDataUrl: `data:${mime};base64,${Buffer.from(buf).toString('base64')}`, imageUrl: null, jobId: null, model: candidate.modelId, provider: 'huggingface', error: null }
      }

      if (ct.includes('application/json') || ct.includes('text/')) {
        const data = await res.json().catch(() => null) as Record<string, unknown> | null
        if (!data) continue
        const url = typeof data.url === 'string' ? data.url : typeof data.image_url === 'string' ? data.image_url : null
        if (url) return { success: true, imageDataUrl: null, imageUrl: url, jobId: null, model: candidate.modelId, provider: 'huggingface', error: null }
        const jobId = typeof data.job_id === 'string' ? data.job_id : typeof data.id === 'string' ? data.id : null
        if (jobId) return { success: true, imageDataUrl: null, imageUrl: null, jobId, model: candidate.modelId, provider: 'huggingface', error: null }
      }
    } catch {
      // try next
    }
  }

  return fail('All HuggingFace avatar image candidates failed or returned no image')
}

// ── Together avatar execution ─────────────────────────────────────────────────

export async function executeTogetherAvatarImage(
  prompt: AvatarProviderPrompt,
  togetherApiKey: string,
): Promise<AvatarImageResult> {
  const model = AVATAR_PROVIDER_CATALOG.find(p => p.key === 'together')?.defaultModel ?? 'black-forest-labs/FLUX.1-schnell-Free'
  const fail = (error: string): AvatarImageResult => ({ success: false, imageDataUrl: null, imageUrl: null, jobId: null, model, provider: 'together', error })

  try {
    const res = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${togetherApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: prompt.prompt,
        n: 1,
        steps: 4,
        width: (prompt.params.width as number) ?? 1024,
        height: (prompt.params.height as number) ?? 1024,
        negative_prompt: prompt.negativePrompt,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      return fail(`Together avatar error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json().catch(() => null) as { data?: Array<{ url?: string }> } | null
    const url = data?.data?.[0]?.url ?? null
    if (url) return { success: true, imageDataUrl: null, imageUrl: url, jobId: null, model, provider: 'together', error: null }
    return fail('Together avatar returned no image URL')
  } catch (err) {
    return fail(`Together avatar request failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Avatar voice execution ────────────────────────────────────────────────────

export type AvatarVoiceStatus = 'skipped' | 'generated' | 'cloned' | 'not_configured' | 'blocked' | 'error'

export interface AvatarVoiceResult {
  voiceStatus: AvatarVoiceStatus
  voiceUrl: string | null
  voiceJobId: string | null
  voiceModel: string | null
  error: string | null
}

export async function executeAvatarVoice(
  voice: AvatarVoiceConfig,
  hfApiKey: string,
  description: string,
): Promise<AvatarVoiceResult> {
  const skip = (): AvatarVoiceResult => ({ voiceStatus: 'skipped', voiceUrl: null, voiceJobId: null, voiceModel: null, error: null })
  const blocked = (reason: string): AvatarVoiceResult => ({ voiceStatus: 'blocked', voiceUrl: null, voiceJobId: null, voiceModel: null, error: reason })
  const notConfigured = (msg: string): AvatarVoiceResult => ({ voiceStatus: 'not_configured', voiceUrl: null, voiceJobId: null, voiceModel: null, error: msg })

  if (voice.voiceMode === 'none') return skip()

  // Cloned voice safety checks
  if (voice.voiceMode === 'cloned_voice') {
    if (!voice.consentConfirmed) return blocked('Voice cloning requires consentConfirmed=true')
    const lower = description.toLowerCase()
    for (const term of VOICE_CLONE_BLOCKED_TERMS) {
      if (lower.includes(term)) return blocked(`Blocked: voice cloning cannot target a minor. Prohibited term: "${term}"`)
    }
    for (const term of CELEBRITY_IMPERSONATION_TERMS) {
      if (lower.includes(term) && !voice.rightsConfirmed) {
        return blocked('Blocked: celebrity/real-person voice cloning requires rightsConfirmed=true')
      }
    }
  }

  // Resolve HF voice endpoint
  const primaryUrl = process.env.HF_AVATAR_VOICE_ENDPOINT ?? null
  const fallbackUrl = process.env.HF_AVATAR_VOICE_ENDPOINT_FALLBACK ?? null
  const primaryModel = process.env.HF_AVATAR_VOICE_MODEL ?? 'facebook/mms-tts-eng'
  const fallbackModel = process.env.HF_AVATAR_VOICE_MODEL_FALLBACK ?? primaryModel

  const candidates: Array<{ url: string; modelId: string }> = []
  if (primaryUrl) candidates.push({ url: primaryUrl.replace(/\/$/, ''), modelId: primaryModel })
  if (fallbackUrl) candidates.push({ url: fallbackUrl.replace(/\/$/, ''), modelId: fallbackModel })

  if (candidates.length === 0) {
    return notConfigured('No HF avatar voice endpoint configured. Set HF_AVATAR_VOICE_ENDPOINT.')
  }

  const sampleText = voice.sampleText ?? 'Hello, I am your avatar assistant.'
  const body: Record<string, unknown> = {
    inputs: sampleText,
    parameters: {
      ...(voice.referenceAudioUrl ? { reference_audio: voice.referenceAudioUrl } : {}),
      ...(voice.voiceStyle ? { voice_style: voice.voiceStyle } : {}),
      ...(voice.language ? { language: voice.language } : {}),
      ...(voice.emotion ? { emotion: voice.emotion } : {}),
      ...(voice.speakingRate !== undefined ? { speaking_rate: voice.speakingRate } : {}),
      ...(voice.pitch !== undefined ? { pitch: voice.pitch } : {}),
    },
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'audio/wav, audio/mpeg, application/json, application/octet-stream',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) continue

      const ct = res.headers.get('content-type') ?? ''
      const finalStatus: AvatarVoiceStatus = voice.voiceMode === 'cloned_voice' ? 'cloned' : 'generated'

      if (ct.startsWith('audio/') || ct === 'application/octet-stream') {
        const buf = await res.arrayBuffer()
        if (buf.byteLength === 0) continue
        const mime = ct.startsWith('audio/') ? ct.split(';')[0].trim() : 'audio/wav'
        return { voiceStatus: finalStatus, voiceUrl: `data:${mime};base64,${Buffer.from(buf).toString('base64')}`, voiceJobId: null, voiceModel: candidate.modelId, error: null }
      }

      if (ct.includes('application/json') || ct.includes('text/')) {
        const data = await res.json().catch(() => null) as Record<string, unknown> | null
        if (!data) continue
        const audioUrl = typeof data.url === 'string' ? data.url : typeof data.audio_url === 'string' ? data.audio_url : null
        if (audioUrl) return { voiceStatus: finalStatus, voiceUrl: audioUrl, voiceJobId: null, voiceModel: candidate.modelId, error: null }
        const jobId = typeof data.job_id === 'string' ? data.job_id : typeof data.id === 'string' ? data.id : null
        if (jobId) return { voiceStatus: finalStatus, voiceUrl: null, voiceJobId: jobId, voiceModel: candidate.modelId, error: null }
      }
    } catch {
      // try next
    }
  }

  return { voiceStatus: 'error', voiceUrl: null, voiceJobId: null, voiceModel: candidates[0]?.modelId ?? null, error: 'All HF avatar voice candidates failed' }
}

// ── Avatar storage metadata ───────────────────────────────────────────────────

export interface AvatarStorageMetadata extends Record<string, unknown> {
  avatarName: string
  appSlug?: string
  style: AvatarStyle
  mode: AvatarMode
  ageCategory: AvatarAgeCategory
  usage?: AvatarUsageContext
  provider: AvatarProviderKey
  model: string
  consistencySeed?: number
  referenceImageUrl?: string
  voiceStatus?: AvatarVoiceStatus
  voiceModel?: string | null
  generatedAt: string
}

export function buildAvatarStorageMetadata(
  payload: AvatarPayload,
  provider: AvatarProviderKey,
  model: string,
  voiceResult?: AvatarVoiceResult,
): AvatarStorageMetadata {
  return {
    avatarName: payload.avatarName,
    appSlug: payload.appSlug,
    style: payload.style,
    mode: payload.mode,
    ageCategory: payload.ageCategory,
    usage: payload.usage,
    provider,
    model,
    consistencySeed: payload.consistencySeed,
    referenceImageUrl: payload.referenceImageUrl,
    voiceStatus: voiceResult?.voiceStatus,
    voiceModel: voiceResult?.voiceModel ?? null,
    generatedAt: new Date().toISOString(),
  }
}

// ── Legacy exports (backward compat) ─────────────────────────────────────────

/** @deprecated Use AvatarStyle from this module */
export const AVATAR_LIBRARY = [
  { avatarId: 'default-professional', name: 'Professional', style: 'customer_service_agent' as AvatarStyle, provider: 'genx', metadata: {} },
  { avatarId: 'default-friendly', name: 'Friendly', style: 'ai_friend' as AvatarStyle, provider: 'genx', metadata: {} },
  { avatarId: 'default-anime', name: 'Anime', style: 'anime' as AvatarStyle, provider: 'huggingface', metadata: {} },
  { avatarId: 'default-creator', name: 'Creator', style: 'creator_avatar' as AvatarStyle, provider: 'genx', metadata: {} },
]
