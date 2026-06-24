/**
 * @module adult-capability
 * @description Adult capabilities — HuggingFace dedicated endpoints only.
 *
 * Generation provider: huggingface ONLY.
 * GenX, Together, Groq, MiMo must NOT be used for adult generation.
 *
 * Each capability supports a primary + fallback HF endpoint/model pair.
 * Candidates are tried in order; first real output wins.
 * Failed candidates are recorded in providerAttempts metadata.
 *
 * Endpoint env vars (primary + fallback per capability):
 *   HF_ADULT_TEXT_ENDPOINT / HF_ADULT_TEXT_ENDPOINT_FALLBACK
 *   HF_ADULT_TEXT_MODEL    / HF_ADULT_TEXT_MODEL_FALLBACK
 *
 *   HF_ADULT_IMAGE_ENDPOINT / HF_ADULT_IMAGE_ENDPOINT_FALLBACK
 *   HF_ADULT_IMAGE_MODEL    / HF_ADULT_IMAGE_MODEL_FALLBACK
 *
 *   HF_ADULT_VIDEO_ENDPOINT / HF_ADULT_VIDEO_ENDPOINT_FALLBACK
 *   HF_ADULT_VIDEO_MODEL    / HF_ADULT_VIDEO_MODEL_FALLBACK
 *
 *   HF_ADULT_AVATAR_ENDPOINT / HF_ADULT_AVATAR_ENDPOINT_FALLBACK
 *   HF_ADULT_AVATAR_MODEL    / HF_ADULT_AVATAR_MODEL_FALLBACK
 *
 * Server-side only.
 */

// ── Legal safety ──────────────────────────────────────────────────────────────

const LEGAL_BLOCKED_TERMS: readonly string[] = [
  'minor', 'child', 'underage', 'teen', 'adolescent', 'juvenile',
  'young person', 'kid', 'school age', 'preteen', 'infant', 'baby',
  'girl under 18', 'boy under 18', 'girl under 16', 'boy under 16',
  'schoolgirl', 'schoolboy', 'high school girl', 'high school boy',
  'barely legal', 'loli', 'shota', 'young-looking',
  'non-consensual', 'nonconsensual', 'non consensual',
  'rape', 'sexual assault', 'forced sex', 'forced intercourse',
  'drugged sex', 'drugged and raped', 'coerced into sex',
  'trafficking', 'sex slave', 'child exploitation', 'child abuse material', 'csam',
  'deepfake of', 'naked celebrity', 'celebrity nude', 'real person naked',
  'leaked photos of', 'revenge porn',
  'bestiality', 'zoophilia', 'sex with animal',
  'bypass age check', 'ignore age', 'pretend she is adult', 'pretend he is adult',
  'act as if underage', 'imagine she is 16', 'imagine he is 16',
]

export interface LegalSafetyResult {
  allowed: boolean
  reason: string | null
}

export function checkAdultLegalSafety(input: string): LegalSafetyResult {
  const lower = input.toLowerCase()

  for (const term of LEGAL_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return { allowed: false, reason: `Blocked: content contains prohibited term "${term}"` }
    }
  }

  if (
    (lower.includes('real person') || lower.includes('real woman') || lower.includes('real man')) &&
    (lower.includes('sex') || lower.includes('naked') || lower.includes('nude') || lower.includes('explicit'))
  ) {
    return { allowed: false, reason: 'Blocked: real-person sexual content is not permitted' }
  }

  if (
    (lower.includes('violen') || lower.includes('assault') || lower.includes('murder')) &&
    (lower.includes('sex') || lower.includes('naked') || lower.includes('nude'))
  ) {
    return { allowed: false, reason: 'Blocked: violence combined with sexual content is not permitted' }
  }

  const degradingPatterns: RegExp[] = [
    /\b(degrade|humiliate|worthless|subhuman)\s+(her|him|them|woman|man|person|partner)\b/i,
    /\b(degrading|humiliating|dehumanizing|dehumanising)\b/i,
    /\bmake\s+(her|him|them)\s+(beg|cry|suffer)\b/i,
    /\bowned\s+(woman|man|person|partner)\b/i,
  ]
  for (const pattern of degradingPatterns) {
    if (pattern.test(input)) {
      return { allowed: false, reason: 'Blocked: degrading or dehumanizing content is not permitted' }
    }
  }

  return { allowed: true, reason: null }
}

// ── Permission check ──────────────────────────────────────────────────────────

export interface AdultPermissionRequest {
  adultMode: boolean
  safeMode: boolean
  appId?: string
}

export interface AdultPermissionResult {
  granted: boolean
  reason: string | null
}

export function checkAdultPermission(req: AdultPermissionRequest): AdultPermissionResult {
  if (!req.adultMode) {
    return { granted: false, reason: 'Adult mode is not enabled for this request. Enable adultMode to access adult capabilities.' }
  }
  if (req.safeMode) {
    return { granted: false, reason: 'Safe mode is active. Disable safeMode to access adult capabilities.' }
  }
  return { granted: true, reason: null }
}

// ── Capability type ───────────────────────────────────────────────────────────

export type AdultCapabilityType = 'adult_text' | 'adult_image' | 'adult_video' | 'adult_avatar'

// ── HF Adult Catalog — primary + fallback per capability ──────────────────────

export interface HFAdultProviderEntry {
  capability: AdultCapabilityType
  /** Priority label — 'primary' or 'fallback' */
  priority: 'primary' | 'fallback'
  endpointEnvKey: string
  modelEnvKey: string
  defaultModelId: string
  generationMode: string
  outputType: 'text' | 'image' | 'video'
  supportsCharacter: boolean
  supportsAvatar: boolean
  supportsVideo: boolean
  notes: string
}

export const HF_ADULT_CATALOG: HFAdultProviderEntry[] = [
  // ── adult_text ─────────────────────────────────────────────────────────────
  {
    capability: 'adult_text', priority: 'primary',
    endpointEnvKey: 'HF_ADULT_TEXT_ENDPOINT', modelEnvKey: 'HF_ADULT_TEXT_MODEL',
    defaultModelId: 'DavidAU/L3.2-Rogue-Creative-Instruct-Uncensored-Abliterated-7B-GGUF',
    generationMode: 'text_generation', outputType: 'text',
    supportsCharacter: true, supportsAvatar: false, supportsVideo: false,
    notes: 'Primary adult roleplay/chat endpoint.',
  },
  {
    capability: 'adult_text', priority: 'fallback',
    endpointEnvKey: 'HF_ADULT_TEXT_ENDPOINT_FALLBACK', modelEnvKey: 'HF_ADULT_TEXT_MODEL_FALLBACK',
    defaultModelId: 'DavidAU/Gemma-The-Writer-N-Restless-Quill-10B-Uncensored-GGUF',
    generationMode: 'text_generation', outputType: 'text',
    supportsCharacter: true, supportsAvatar: false, supportsVideo: false,
    notes: 'Fallback adult text endpoint when primary is unavailable.',
  },
  // ── adult_image ────────────────────────────────────────────────────────────
  {
    capability: 'adult_image', priority: 'primary',
    endpointEnvKey: 'HF_ADULT_IMAGE_ENDPOINT', modelEnvKey: 'HF_ADULT_IMAGE_MODEL',
    defaultModelId: 'SG161222/RealVisXL_V4.0',
    generationMode: 'image_generation', outputType: 'image',
    supportsCharacter: true, supportsAvatar: true, supportsVideo: false,
    notes: 'Primary adult image generation endpoint.',
  },
  {
    capability: 'adult_image', priority: 'fallback',
    endpointEnvKey: 'HF_ADULT_IMAGE_ENDPOINT_FALLBACK', modelEnvKey: 'HF_ADULT_IMAGE_MODEL_FALLBACK',
    defaultModelId: 'diroverflo/FLux_Klein_9B_NSFW',
    generationMode: 'image_generation', outputType: 'image',
    supportsCharacter: true, supportsAvatar: true, supportsVideo: false,
    notes: 'Fallback adult image endpoint when primary is unavailable.',
  },
  // ── adult_video ────────────────────────────────────────────────────────────
  {
    capability: 'adult_video', priority: 'primary',
    endpointEnvKey: 'HF_ADULT_VIDEO_ENDPOINT', modelEnvKey: 'HF_ADULT_VIDEO_MODEL',
    defaultModelId: 'NSFW-API/NSFW_Wan_14b',
    generationMode: 'video_generation', outputType: 'video',
    supportsCharacter: false, supportsAvatar: false, supportsVideo: true,
    notes: 'Primary adult video endpoint. Experimental.',
  },
  {
    capability: 'adult_video', priority: 'fallback',
    endpointEnvKey: 'HF_ADULT_VIDEO_ENDPOINT_FALLBACK', modelEnvKey: 'HF_ADULT_VIDEO_MODEL_FALLBACK',
    defaultModelId: 'lynaNSFW/LTX2.3_NSFW_motion',
    generationMode: 'video_generation', outputType: 'video',
    supportsCharacter: false, supportsAvatar: false, supportsVideo: true,
    notes: 'Fallback adult video endpoint. Experimental.',
  },
  // ── adult_avatar ───────────────────────────────────────────────────────────
  {
    capability: 'adult_avatar', priority: 'primary',
    endpointEnvKey: 'HF_ADULT_AVATAR_ENDPOINT', modelEnvKey: 'HF_ADULT_AVATAR_MODEL',
    defaultModelId: 'SG161222/RealVisXL_V4.0',
    generationMode: 'avatar_generation', outputType: 'image',
    supportsCharacter: true, supportsAvatar: true, supportsVideo: false,
    notes: 'Primary adult avatar/character image endpoint.',
  },
  {
    capability: 'adult_avatar', priority: 'fallback',
    endpointEnvKey: 'HF_ADULT_AVATAR_ENDPOINT_FALLBACK', modelEnvKey: 'HF_ADULT_AVATAR_MODEL_FALLBACK',
    defaultModelId: 'diroverflo/FLux_Klein_9B_NSFW',
    generationMode: 'avatar_generation', outputType: 'image',
    supportsCharacter: true, supportsAvatar: true, supportsVideo: false,
    notes: 'Fallback adult avatar endpoint when primary is unavailable.',
  },
]

export function getHFAdultCandidates(capability: AdultCapabilityType): HFAdultProviderEntry[] {
  return HF_ADULT_CATALOG.filter(e => e.capability === capability)
    .sort((a, b) => (a.priority === 'primary' ? -1 : 1) - (b.priority === 'primary' ? -1 : 1))
}

/** @deprecated Use getHFAdultCandidates() for ordered list */
export function getHFAdultEntry(capability: AdultCapabilityType): HFAdultProviderEntry | null {
  return HF_ADULT_CATALOG.find(e => e.capability === capability && e.priority === 'primary') ?? null
}

// ── Endpoint resolution ───────────────────────────────────────────────────────

export interface ResolvedAdultEndpoint {
  endpointUrl: string
  modelId: string
  hfApiKey: string
  priority: 'primary' | 'fallback'
}

export function resolveAdultEndpoint(
  entry: HFAdultProviderEntry,
  hfApiKey: string,
): ResolvedAdultEndpoint | null {
  const endpointUrl = process.env[entry.endpointEnvKey] ?? null
  if (!endpointUrl) return null
  const modelId = process.env[entry.modelEnvKey] ?? entry.defaultModelId
  return { endpointUrl: endpointUrl.replace(/\/$/, ''), modelId, hfApiKey, priority: entry.priority }
}

/**
 * Resolve all configured HF endpoint candidates for a capability, in priority order.
 * Returns an empty array when no endpoints are configured.
 */
export function resolveAdultCandidates(
  capability: AdultCapabilityType,
  hfApiKey: string,
): ResolvedAdultEndpoint[] {
  const candidates: ResolvedAdultEndpoint[] = []
  for (const entry of getHFAdultCandidates(capability)) {
    const resolved = resolveAdultEndpoint(entry, hfApiKey)
    if (resolved) candidates.push(resolved)
  }
  return candidates
}

// ── Avatar types and styles ───────────────────────────────────────────────────

export const ALLOWED_AVATAR_STYLES = [
  'realistic_human', 'anime', 'semi_realistic', '3d_character',
  'cartoon', 'fantasy_character', 'companion_avatar',
] as const

export type AvatarStyle = (typeof ALLOWED_AVATAR_STYLES)[number]

export const ALLOWED_AVATAR_MODES = ['portrait', 'full_body', 'image', 'video'] as const
export type AvatarMode = (typeof ALLOWED_AVATAR_MODES)[number]

export interface AdultAvatarPayload {
  characterProfile: string
  appearance: string
  /** Age confirmation — must be adult */
  ageConfirmation?: 'adult'
  gender?: string
  style?: AvatarStyle
  outfit?: string
  pose?: string
  background?: string
  aspectRatio?: '1:1' | '2:3' | '3:4' | '16:9' | '9:16'
  mode?: AvatarMode
  personalityNotes?: string
  consistencySeed?: number
  referenceImageUrl?: string
  width?: number
  height?: number
  /** Optional voice configuration — HF only */
  voice?: AvatarVoicePayload
}

const AVATAR_STYLE_PROMPTS: Record<AvatarStyle, string> = {
  realistic_human: 'photorealistic, detailed skin texture, natural lighting, DSLR quality',
  anime: 'anime art style, cel-shaded, expressive eyes, clean line art, vibrant colors',
  semi_realistic: 'semi-realistic digital art, stylized realism, artistic rendering',
  '3d_character': '3D rendered character, volumetric lighting, subsurface scattering, studio render',
  cartoon: 'cartoon style, bold outlines, exaggerated features, flat colors',
  fantasy_character: 'fantasy character art, epic lighting, detailed armor or costume, painterly style',
  companion_avatar: 'companion portrait, warm lighting, friendly expression, inviting atmosphere',
}

export function validateAdultAvatarPayload(payload: AdultAvatarPayload): string | null {
  if (!payload.characterProfile || payload.characterProfile.trim().length === 0) {
    return 'characterProfile is required'
  }
  if (!payload.appearance || payload.appearance.trim().length === 0) {
    return 'appearance is required'
  }
  if (payload.style && !(ALLOWED_AVATAR_STYLES as readonly string[]).includes(payload.style)) {
    return `Unsupported avatar style: "${payload.style}". Allowed: ${ALLOWED_AVATAR_STYLES.join(', ')}`
  }
  if (payload.mode && !(ALLOWED_AVATAR_MODES as readonly string[]).includes(payload.mode)) {
    return `Unsupported avatar mode: "${payload.mode}". Allowed: ${ALLOWED_AVATAR_MODES.join(', ')}`
  }
  return null
}

export function buildAdultAvatarBody(payload: AdultAvatarPayload): Record<string, unknown> {
  const stylePrompt = payload.style ? AVATAR_STYLE_PROMPTS[payload.style] : AVATAR_STYLE_PROMPTS.realistic_human

  const parts: string[] = [
    payload.characterProfile.trim(),
    payload.appearance.trim(),
    stylePrompt,
  ]

  if (payload.outfit) parts.push(`Outfit: ${payload.outfit}`)
  if (payload.pose) parts.push(`Pose: ${payload.pose}`)
  if (payload.background) parts.push(`Background: ${payload.background}`)
  if (payload.personalityNotes) parts.push(`Personality: ${payload.personalityNotes}`)
  if (payload.gender) parts.push(`Gender/presentation: ${payload.gender}`)

  const fullPrompt = parts.filter(Boolean).join('. ')

  const aspectToSize: Record<string, { width: number; height: number }> = {
    '1:1': { width: 768, height: 768 },
    '2:3': { width: 512, height: 768 },
    '3:4': { width: 576, height: 768 },
    '16:9': { width: 1024, height: 576 },
    '9:16': { width: 576, height: 1024 },
  }
  const size = payload.aspectRatio ? (aspectToSize[payload.aspectRatio] ?? { width: 768, height: 768 }) : { width: payload.width ?? 768, height: payload.height ?? 768 }

  const body: Record<string, unknown> = {
    inputs: fullPrompt,
    parameters: {
      negative_prompt: 'minor, child, underage, blurry, low quality, deformed, ugly',
      num_inference_steps: 30,
      guidance_scale: 7.5,
      width: size.width,
      height: size.height,
    },
  }

  if (payload.consistencySeed !== undefined) {
    (body.parameters as Record<string, unknown>).seed = payload.consistencySeed
  }
  if (payload.referenceImageUrl) {
    (body.parameters as Record<string, unknown>).image = payload.referenceImageUrl
  }

  return body
}

// ── Payload builders (text / image / video) ───────────────────────────────────

export interface AdultTextPayload {
  userPrompt: string
  characterName?: string
  characterDescription?: string
  relationship?: string
  tone?: string
  boundaries?: string
  memoryHints?: string[]
  language?: string
}

export function buildAdultTextBody(payload: AdultTextPayload): Record<string, unknown> {
  const systemPrompt = buildAdultTextSystemPrompt(payload)
  return {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: payload.userPrompt },
    ],
    max_tokens: 1200,
    temperature: 0.8,
  }
}

function buildAdultTextSystemPrompt(payload: AdultTextPayload): string {
  const parts = [
    'You are an adult creative writing and roleplay assistant for consenting adults only.',
    'All characters in roleplay are fictional adults aged 18 or over.',
    'Strictly refuse: minors, coercion, exploitation, non-consensual content, real person impersonation, illegal content, threats, or hate.',
    'Keep the tone consensual, respectful, and non-degrading.',
  ]
  if (payload.characterName) parts.push(`You are playing the character: ${payload.characterName}.`)
  if (payload.characterDescription) parts.push(`Character description: ${payload.characterDescription}`)
  if (payload.relationship) parts.push(`Relationship dynamic: ${payload.relationship}`)
  if (payload.tone) parts.push(`Tone: ${payload.tone}`)
  if (payload.boundaries) parts.push(`User's stated boundaries: ${payload.boundaries}`)
  if (payload.memoryHints?.length) parts.push(`Memory context: ${payload.memoryHints.join('; ')}`)
  if (payload.language && payload.language !== 'en') parts.push(`Respond in language: ${payload.language}`)
  return parts.join('\n')
}

export interface AdultImagePayload {
  prompt: string
  style?: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  guidanceScale?: number
}

export function buildAdultImageBody(payload: AdultImagePayload): Record<string, unknown> {
  return {
    inputs: payload.prompt,
    parameters: {
      negative_prompt: payload.negativePrompt ?? 'minor, child, underage, blurry, low quality, cartoon',
      num_inference_steps: payload.steps ?? 28,
      guidance_scale: payload.guidanceScale ?? 7.0,
      width: payload.width ?? 768,
      height: payload.height ?? 768,
    },
  }
}

export interface AdultVideoPayload {
  prompt: string
  sourceImageUrl?: string
  duration?: number
  style?: string
  motionNotes?: string
}

export function buildAdultVideoBody(payload: AdultVideoPayload): Record<string, unknown> {
  return {
    inputs: payload.prompt,
    parameters: {
      duration: payload.duration ?? 4,
      ...(payload.sourceImageUrl ? { image_url: payload.sourceImageUrl } : {}),
      ...(payload.motionNotes ? { motion_notes: payload.motionNotes } : {}),
    },
  }
}

// ── HF Adult Result ───────────────────────────────────────────────────────────

export interface HFAdultAttempt {
  endpointKey: string
  modelId: string
  priority: 'primary' | 'fallback'
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

export interface HFAdultResult {
  success: boolean
  output: string | null
  jobId: string | null
  status?: string
  model: string
  endpointKey: string
  capability: AdultCapabilityType
  generationMode: string
  permissionStatus: 'granted'
  safetyStatus: 'passed'
  providerAttempts: HFAdultAttempt[]
  error: string | null
}

// ── Single candidate execution ────────────────────────────────────────────────

async function executeOneHFAdultCandidate(
  resolved: ResolvedAdultEndpoint,
  entry: HFAdultProviderEntry,
  body: Record<string, unknown>,
): Promise<{ output: string | null; jobId: string | null; status?: string; error: string | null }> {
  try {
    const res = await fetch(resolved.endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved.hfApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, image/png, image/jpeg, image/webp, video/mp4, video/webm, application/octet-stream',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      const isLoading = res.status === 503 || errText.toLowerCase().includes('loading')
      return { output: null, jobId: null, error: isLoading ? `${entry.capability} model is loading. Retry shortly.` : `HF ${entry.capability} error ${res.status}: ${errText.slice(0, 300)}` }
    }

    const ct = res.headers.get('content-type') ?? ''

    if (ct.startsWith('image/') || ct.startsWith('video/') || ct === 'application/octet-stream') {
      const buf = await res.arrayBuffer()
      if (buf.byteLength === 0) return { output: null, jobId: null, error: `HF ${entry.capability} returned empty buffer` }
      const mime = (ct.startsWith('image/') || ct.startsWith('video/')) ? ct.split(';')[0].trim() : entry.outputType === 'video' ? 'video/mp4' : 'image/png'
      return { output: `data:${mime};base64,${Buffer.from(buf).toString('base64')}`, jobId: null, error: null }
    }

    if (ct.includes('application/json') || ct.includes('text/')) {
      const data = await res.json().catch(() => null) as Record<string, unknown> | null
      if (!data) return { output: null, jobId: null, error: `HF ${entry.capability} returned invalid JSON` }

      if (entry.outputType === 'text') {
        const text = extractTextOutput(data)
        return text ? { output: text, jobId: null, error: null } : { output: null, jobId: null, error: `HF adult_text returned no text content` }
      }

      const outputUrl = typeof data.url === 'string' ? data.url
        : typeof data.image_url === 'string' ? data.image_url
        : typeof data.video_url === 'string' ? data.video_url
        : typeof data.result_url === 'string' ? data.result_url
        : (data.data as Array<{ url?: string }>)?.[0]?.url ?? null
      if (outputUrl) return { output: outputUrl, jobId: null, error: null }

      const jobId = typeof data.job_id === 'string' ? data.job_id : typeof data.id === 'string' ? data.id : null
      const jobStatus = typeof data.status === 'string' ? data.status : 'pending'
      if (jobId || ['queued', 'processing', 'pending'].includes(jobStatus)) {
        return { output: null, jobId, status: jobStatus, error: null }
      }

      const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data).slice(0, 200)
      return { output: null, jobId: null, error: `HF ${entry.capability} returned no output: ${errMsg}` }
    }

    return { output: null, jobId: null, error: `HF ${entry.capability} returned unexpected content-type: ${ct}` }
  } catch (err) {
    return { output: null, jobId: null, error: `HF ${entry.capability} request failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── Multi-candidate execution ─────────────────────────────────────────────────

/**
 * Execute adult generation against all configured HF candidates in priority order.
 * Primary tried first, then fallback. First real output/job wins.
 * providerAttempts records the outcome of each candidate.
 */
export async function executeHFAdultGeneration(
  resolved: ResolvedAdultEndpoint,
  entry: HFAdultProviderEntry,
  body: Record<string, unknown>,
): Promise<HFAdultResult> {
  // Single-candidate path (used by router when it already resolved one candidate)
  const attempt: HFAdultAttempt = {
    endpointKey: entry.endpointEnvKey,
    modelId: resolved.modelId,
    priority: resolved.priority,
    status: 'failed',
  }

  const r = await executeOneHFAdultCandidate(resolved, entry, body)
  if (r.output !== null || r.jobId !== null) {
    attempt.status = 'success'
    return {
      success: true,
      output: r.output,
      jobId: r.jobId ?? null,
      status: r.status,
      model: resolved.modelId,
      endpointKey: entry.endpointEnvKey,
      capability: entry.capability,
      generationMode: entry.generationMode,
      permissionStatus: 'granted',
      safetyStatus: 'passed',
      providerAttempts: [attempt],
      error: null,
    }
  }

  attempt.error = r.error ?? 'Unknown error'
  return {
    success: false,
    output: null,
    jobId: null,
    model: resolved.modelId,
    endpointKey: entry.endpointEnvKey,
    capability: entry.capability,
    generationMode: entry.generationMode,
    permissionStatus: 'granted',
    safetyStatus: 'passed',
    providerAttempts: [attempt],
    error: r.error,
  }
}

/**
 * Execute adult generation across all candidates (primary then fallback).
 * Used by the router to attempt the full chain automatically.
 */
export async function executeHFAdultGenerationChain(
  capability: AdultCapabilityType,
  hfApiKey: string,
  body: Record<string, unknown>,
): Promise<HFAdultResult> {
  const candidates = getHFAdultCandidates(capability)
  const providerAttempts: HFAdultAttempt[] = []

  let resolvedEntry: HFAdultProviderEntry | null = null
  let resolvedEndpoint: ResolvedAdultEndpoint | null = null

  for (const entry of candidates) {
    const resolved = resolveAdultEndpoint(entry, hfApiKey)
    if (!resolved) {
      providerAttempts.push({
        endpointKey: entry.endpointEnvKey,
        modelId: entry.defaultModelId,
        priority: entry.priority,
        status: 'skipped',
        error: `${entry.endpointEnvKey} not set`,
      })
      continue
    }

    const r = await executeOneHFAdultCandidate(resolved, entry, body)
    if (r.output !== null || r.jobId !== null) {
      providerAttempts.push({ endpointKey: entry.endpointEnvKey, modelId: resolved.modelId, priority: resolved.priority, status: 'success' })
      return {
        success: true,
        output: r.output,
        jobId: r.jobId ?? null,
        status: r.status,
        model: resolved.modelId,
        endpointKey: entry.endpointEnvKey,
        capability,
        generationMode: entry.generationMode,
        permissionStatus: 'granted',
        safetyStatus: 'passed',
        providerAttempts,
        error: null,
      }
    }

    providerAttempts.push({ endpointKey: entry.endpointEnvKey, modelId: resolved.modelId, priority: resolved.priority, status: 'failed', error: r.error ?? 'No output' })
    if (!resolvedEntry) { resolvedEntry = entry; resolvedEndpoint = resolved }
  }

  const lastEntry = resolvedEntry ?? candidates[0]
  const lastResolved = resolvedEndpoint
  const allSkipped = providerAttempts.every(a => a.status === 'skipped')

  return {
    success: false,
    output: null,
    jobId: null,
    model: lastResolved?.modelId ?? lastEntry?.defaultModelId ?? 'none',
    endpointKey: lastEntry?.endpointEnvKey ?? 'none',
    capability,
    generationMode: lastEntry?.generationMode ?? 'unknown',
    permissionStatus: 'granted',
    safetyStatus: 'passed',
    providerAttempts,
    error: allSkipped
      ? `No HF adult endpoints configured for ${capability}. Set ${candidates.map(e => e.endpointEnvKey).join(' or ')}.`
      : `All HF adult ${capability} candidates failed. ${providerAttempts.filter(a => a.error).map(a => a.error).join('; ')}`,
  }
}

// ── Avatar Voice Clone ────────────────────────────────────────────────────────

export type AvatarVoiceMode = 'none' | 'generated_voice' | 'cloned_voice'

export interface AvatarVoicePayload {
  voiceMode: AvatarVoiceMode
  /** Always 'huggingface' — no other provider allowed */
  voiceProvider?: 'huggingface'
  voiceEndpointKey?: string
  voiceModel?: string
  referenceAudioUrl?: string
  /** Explicit consent — required for cloned_voice */
  consentConfirmed?: boolean
  /** Rights confirmation — required to clone identifiable voice */
  rightsConfirmed?: boolean
  voiceStyle?: string
  language?: string
  accent?: string
  emotion?: string
  speakingRate?: number
  pitch?: number
  sampleText?: string
}

export type VoiceStatus =
  | 'not_configured'
  | 'generated'
  | 'cloned'
  | 'skipped'
  | 'blocked'
  | 'error'

export interface AvatarVoiceResult {
  voiceStatus: VoiceStatus
  voiceUrl: string | null
  voiceJobId: string | null
  voiceModel: string | null
  voiceEndpointKey: string | null
  error: string | null
}

const VOICE_BLOCKED_TERMS: readonly string[] = [
  'minor', 'child', 'underage', 'teen', 'adolescent', 'schoolgirl', 'schoolboy', 'loli', 'shota',
]

const CELEBRITY_IMPERSONATION_TERMS: readonly string[] = [
  'celebrity voice', 'famous person', 'impersonate', 'sound like a real', 'clone this celebrity',
  'clone my ex', 'clone my partner', 'clone my boss', 'clone my teacher',
]

/**
 * Validate voice clone request against consent and legal rules.
 * Returns a block reason string, or null if allowed.
 */
export function checkVoiceCloneRules(payload: AvatarVoicePayload, voiceDescription: string): string | null {
  if (payload.voiceMode === 'none' || payload.voiceMode === 'generated_voice') return null

  // Cloned voice requires explicit consent
  if (!payload.consentConfirmed) {
    return 'Cloned voice requires explicit consent: set consentConfirmed=true'
  }

  // Block minor voice cloning
  const lower = voiceDescription.toLowerCase()
  for (const term of VOICE_BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return `Blocked: voice clone request contains prohibited term "${term}"`
    }
  }

  // Block celebrity/real-person impersonation without rights confirmation
  for (const term of CELEBRITY_IMPERSONATION_TERMS) {
    if (lower.includes(term)) {
      if (!payload.rightsConfirmed) {
        return 'Blocked: celebrity or real-person voice impersonation requires rightsConfirmed=true and verified consent'
      }
    }
  }

  // Block deceptive impersonation patterns
  if (lower.includes('deceive') || lower.includes('pretend to be') || lower.includes('fake') && lower.includes('voice')) {
    return 'Blocked: deceptive voice impersonation is not permitted'
  }

  return null
}

/**
 * Resolve HF voice endpoint candidates.
 * Primary: HF_ADULT_VOICE_ENDPOINT / HF_ADULT_VOICE_MODEL
 * Fallback: HF_ADULT_VOICE_ENDPOINT_FALLBACK / HF_ADULT_VOICE_MODEL_FALLBACK
 */
export function resolveVoiceCandidates(hfApiKey: string): Array<{ url: string; modelId: string; priority: 'primary' | 'fallback' }> {
  const candidates: Array<{ url: string; modelId: string; priority: 'primary' | 'fallback' }> = []

  const primaryUrl = process.env.HF_ADULT_VOICE_ENDPOINT ?? null
  if (primaryUrl) {
    candidates.push({
      url: primaryUrl.replace(/\/$/, ''),
      modelId: process.env.HF_ADULT_VOICE_MODEL ?? 'facebook/mms-tts-eng',
      priority: 'primary',
    })
  }

  const fallbackUrl = process.env.HF_ADULT_VOICE_ENDPOINT_FALLBACK ?? null
  if (fallbackUrl) {
    candidates.push({
      url: fallbackUrl.replace(/\/$/, ''),
      modelId: process.env.HF_ADULT_VOICE_MODEL_FALLBACK ?? 'facebook/mms-tts-eng',
      priority: 'fallback',
    })
  }

  return candidates
}

/**
 * Execute avatar voice generation via HF dedicated endpoint.
 * HuggingFace ONLY — no GenX/Together/Groq/MiMo.
 *
 * For generated_voice: send sampleText to TTS endpoint.
 * For cloned_voice: send referenceAudioUrl + sampleText to voice clone endpoint.
 *
 * Returns AvatarVoiceResult. Never throws.
 */
export async function executeAvatarVoice(
  payload: AvatarVoicePayload,
  hfApiKey: string,
  voiceDescription: string,
): Promise<AvatarVoiceResult> {
  const empty = (status: VoiceStatus, error: string | null, key: string | null = null, model: string | null = null): AvatarVoiceResult => ({
    voiceStatus: status, voiceUrl: null, voiceJobId: null, voiceModel: model, voiceEndpointKey: key, error,
  })

  if (payload.voiceMode === 'none') {
    return empty('skipped', null)
  }

  // Legal check
  const blockReason = checkVoiceCloneRules(payload, voiceDescription)
  if (blockReason) {
    return empty('blocked', blockReason)
  }

  const candidates = resolveVoiceCandidates(hfApiKey)
  if (candidates.length === 0) {
    return empty('not_configured', 'No HF adult voice endpoint configured. Set HF_ADULT_VOICE_ENDPOINT.')
  }

  const sampleText = payload.sampleText ?? 'Hello.'
  const body: Record<string, unknown> = {
    inputs: sampleText,
    parameters: {
      ...(payload.referenceAudioUrl ? { reference_audio: payload.referenceAudioUrl } : {}),
      ...(payload.voiceStyle ? { voice_style: payload.voiceStyle } : {}),
      ...(payload.language ? { language: payload.language } : {}),
      ...(payload.accent ? { accent: payload.accent } : {}),
      ...(payload.emotion ? { emotion: payload.emotion } : {}),
      ...(payload.speakingRate !== undefined ? { speaking_rate: payload.speakingRate } : {}),
      ...(payload.pitch !== undefined ? { pitch: payload.pitch } : {}),
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

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        continue // try next candidate
      }

      const ct = res.headers.get('content-type') ?? ''
      const finalStatus: VoiceStatus = payload.voiceMode === 'cloned_voice' ? 'cloned' : 'generated'

      if (ct.startsWith('audio/') || ct === 'application/octet-stream') {
        const buf = await res.arrayBuffer()
        if (buf.byteLength === 0) continue
        const mime = ct.startsWith('audio/') ? ct.split(';')[0].trim() : 'audio/wav'
        const b64 = Buffer.from(buf).toString('base64')
        return {
          voiceStatus: finalStatus,
          voiceUrl: `data:${mime};base64,${b64}`,
          voiceJobId: null,
          voiceModel: candidate.modelId,
          voiceEndpointKey: `HF_ADULT_VOICE_ENDPOINT${candidate.priority === 'fallback' ? '_FALLBACK' : ''}`,
          error: null,
        }
      }

      if (ct.includes('application/json') || ct.includes('text/')) {
        const data = await res.json().catch(() => null) as Record<string, unknown> | null
        if (!data) continue

        const audioUrl = typeof data.url === 'string' ? data.url : typeof data.audio_url === 'string' ? data.audio_url : null
        if (audioUrl) {
          return {
            voiceStatus: finalStatus,
            voiceUrl: audioUrl,
            voiceJobId: null,
            voiceModel: candidate.modelId,
            voiceEndpointKey: `HF_ADULT_VOICE_ENDPOINT${candidate.priority === 'fallback' ? '_FALLBACK' : ''}`,
            error: null,
          }
        }

        const jobId = typeof data.job_id === 'string' ? data.job_id : typeof data.id === 'string' ? data.id : null
        if (jobId) {
          return {
            voiceStatus: finalStatus,
            voiceUrl: null,
            voiceJobId: jobId,
            voiceModel: candidate.modelId,
            voiceEndpointKey: `HF_ADULT_VOICE_ENDPOINT${candidate.priority === 'fallback' ? '_FALLBACK' : ''}`,
            error: null,
          }
        }
      }
    } catch {
      // try next candidate
    }
  }

  return empty('error', 'All HF adult voice candidates failed or returned no audio', 'HF_ADULT_VOICE_ENDPOINT', candidates[0]?.modelId ?? null)
}

function extractTextOutput(data: unknown): string | null {
  if (typeof data === 'string') return data || null
  if (Array.isArray(data)) {
    const first = (data[0] as Record<string, unknown> | undefined) ?? {}
    return (typeof first.generated_text === 'string' ? first.generated_text : null)
      ?? (typeof first.text === 'string' ? first.text : null)
      ?? null
  }
  if (typeof data === 'object' && data !== null) {
    const r = data as Record<string, unknown>
    const choices = r.choices as Array<{ message?: { content?: string }, text?: string }> | undefined
    if (choices?.[0]?.message?.content) return choices[0].message!.content!
    if (choices?.[0]?.text) return choices[0].text!
    if (typeof r.generated_text === 'string') return r.generated_text
    if (typeof r.text === 'string') return r.text
    if (typeof r.content === 'string') return r.content
    if (typeof r.output === 'string') return r.output
  }
  return null
}
