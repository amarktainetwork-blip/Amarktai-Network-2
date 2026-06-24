/**
 * @module music-capability
 * @description Music generation capability — real audio production.
 *
 * Handles all music structuring before provider execution:
 * - Genre validation (1–5 genres from approved list)
 * - Vocal type shaping
 * - Full-song lyrics generation (no placeholders)
 * - Custom lyrics support
 * - Instrumental mode
 * - Style inspiration → descriptive musical traits
 * - Provider catalog with honest generationMode declarations
 * - Multi-provider execution: GenX (Lyria) + HuggingFace (full-song endpoints + MusicGen)
 *
 * ACTIVE PROVIDERS:
 *   genx        — lyria-3-pro-preview, lyria-3-clip-preview (full_song, async job)
 *   huggingface — ACE-Step, YuE, DiffRhythm (full_song, requires configured endpoint)
 *                 facebook/musicgen-* (segment, serverless HF API)
 *
 * Server-side only.
 */

// ── Allowed Genres ────────────────────────────────────────────────────────────

export const ALLOWED_GENRES = [
  'pop', 'rock', 'metal', 'reggae', 'hiphop', 'rap', 'rnb',
  'edm', 'house', 'techno', 'classical', 'jazz', 'blues',
  'gospel', 'country', 'folk', 'cinematic', 'ambient', 'lofi',
  'amapiano', 'afrobeats', 'kpop', 'soul',
] as const

export type MusicGenre = (typeof ALLOWED_GENRES)[number]

// ── Allowed Vocal Types ───────────────────────────────────────────────────────

export const ALLOWED_VOCAL_TYPES = [
  'male', 'female', 'duet', 'band', 'choir', 'rap', 'spoken_word', 'instrumental',
] as const

export type VocalType = (typeof ALLOWED_VOCAL_TYPES)[number]

// ── Allowed Moods ─────────────────────────────────────────────────────────────

export const ALLOWED_MOODS = [
  'happy', 'sad', 'emotional', 'aggressive', 'dark',
  'uplifting', 'inspirational', 'energetic', 'romantic', 'epic',
] as const

export type MusicMood = (typeof ALLOWED_MOODS)[number]

// ── Payload ───────────────────────────────────────────────────────────────────

export interface MusicCapabilityPayload {
  title?: string
  theme: string
  genres: MusicGenre[]
  vocalType: VocalType
  moods?: MusicMood[]
  bpm?: number
  /** Duration in seconds — default 180, range 30–300 */
  duration?: number
  language?: string
  explicit?: boolean
  /** Custom lyrics — used as-is when provided */
  lyrics?: string
  referenceStyle?: string
  productionNotes?: string
}

// ── Generation mode ───────────────────────────────────────────────────────────

export type MusicGenerationMode = 'full_song' | 'lyrics_to_song' | 'text_to_music' | 'segment'

// ── HF Music Provider Catalog ─────────────────────────────────────────────────

export interface HFMusicProviderEntry {
  /** Identifier used as env-var key and vault lookup key */
  key: string
  /** Display name */
  label: string
  /** HF model ID (for serverless) or null for endpoint-only models */
  modelId: string | null
  /** Vault/env key for the endpoint URL — if set, uses endpoint instead of model API */
  endpointEnvKey: string | null
  generationMode: MusicGenerationMode
  supportsVocals: boolean
  supportsInstrumental: boolean
  supportsLyrics: boolean
  /** Approximate max duration in seconds — null means unknown/unbounded */
  maxDurationSeconds: number | null
  /** True when a configured HF Inference Endpoint URL is required */
  requiresEndpoint: boolean
  /** Higher = preferred when available (0–100) */
  priority: number
  notes: string
}

/**
 * HF Music Provider Catalog — ordered by priority descending.
 *
 * Models that require a configured endpoint (ACE-Step, YuE, DiffRhythm) are
 * skipped at runtime when no endpoint URL is present in vault/env.
 * MusicGen models run on the serverless HF Inference API with just an API key.
 */
export const HF_MUSIC_CATALOG: HFMusicProviderEntry[] = [
  {
    key: 'ace_step',
    label: 'ACE-Step v1.5',
    modelId: 'ACE-Step/ACE-Step-v1.5',
    endpointEnvKey: 'HF_ENDPOINT_ACE_STEP',
    generationMode: 'full_song',
    supportsVocals: true,
    supportsInstrumental: true,
    supportsLyrics: true,
    maxDurationSeconds: 300,
    requiresEndpoint: true,
    priority: 95,
    notes: 'Full-song generation with controlled structure. Requires HF Inference Endpoint.',
  },
  {
    key: 'yue',
    label: 'YuE',
    modelId: 'THUDM/YuE-s1-7B-anneal-jp-zh-en',
    endpointEnvKey: 'HF_ENDPOINT_YUE',
    generationMode: 'lyrics_to_song',
    supportsVocals: true,
    supportsInstrumental: false,
    supportsLyrics: true,
    maxDurationSeconds: 240,
    requiresEndpoint: true,
    priority: 90,
    notes: 'Lyrics-to-full-song generation. Requires HF Inference Endpoint.',
  },
  {
    key: 'diffrhythm',
    label: 'DiffRhythm',
    modelId: 'ASLP-lab/DiffRhythm',
    endpointEnvKey: 'HF_ENDPOINT_DIFFRHYTHM',
    generationMode: 'full_song',
    supportsVocals: true,
    supportsInstrumental: true,
    supportsLyrics: true,
    maxDurationSeconds: 285,
    requiresEndpoint: true,
    priority: 88,
    notes: 'Full-length lyrics + vocals + accompaniment. Requires HF Inference Endpoint.',
  },
  {
    key: 'musicgen_large',
    label: 'MusicGen Large',
    modelId: 'facebook/musicgen-large',
    endpointEnvKey: null,
    generationMode: 'segment',
    supportsVocals: false,
    supportsInstrumental: true,
    supportsLyrics: false,
    maxDurationSeconds: 30,
    requiresEndpoint: false,
    priority: 50,
    notes: 'Best quality serverless text-to-music. Segment output only (~8-30s).',
  },
  {
    key: 'musicgen_medium',
    label: 'MusicGen Medium',
    modelId: 'facebook/musicgen-medium',
    endpointEnvKey: null,
    generationMode: 'segment',
    supportsVocals: false,
    supportsInstrumental: true,
    supportsLyrics: false,
    maxDurationSeconds: 30,
    requiresEndpoint: false,
    priority: 45,
    notes: 'Balanced quality serverless text-to-music. Segment output only.',
  },
  {
    key: 'musicgen_small',
    label: 'MusicGen Small',
    modelId: 'facebook/musicgen-small',
    endpointEnvKey: null,
    generationMode: 'segment',
    supportsVocals: false,
    supportsInstrumental: true,
    supportsLyrics: false,
    maxDurationSeconds: 30,
    requiresEndpoint: false,
    priority: 40,
    notes: 'Fastest serverless text-to-music. Segment output only.',
  },
]

// ── Provider selection ────────────────────────────────────────────────────────

export interface HFMusicProviderCandidate {
  entry: HFMusicProviderEntry
  endpointUrl: string | null
  hfApiKey: string
}

/**
 * Resolve which HF music providers are actually configured and executable.
 * Reads endpoint URLs from environment variables.
 * Returns candidates sorted by priority descending.
 */
export function resolveHFMusicCandidates(
  hfApiKey: string,
  requestedDuration: number,
  hasLyrics: boolean,
  preferFullSong: boolean,
): HFMusicProviderCandidate[] {
  const candidates: HFMusicProviderCandidate[] = []

  for (const entry of HF_MUSIC_CATALOG) {
    // If endpoint required, check env
    let endpointUrl: string | null = null
    if (entry.endpointEnvKey) {
      endpointUrl = process.env[entry.endpointEnvKey] ?? null
      if (entry.requiresEndpoint && !endpointUrl) continue
    }

    // Filter by capability
    if (hasLyrics && !entry.supportsLyrics && entry.generationMode !== 'segment') continue
    if (requestedDuration > 30 && entry.maxDurationSeconds !== null && entry.maxDurationSeconds < 30) continue

    candidates.push({ entry, endpointUrl, hfApiKey })
  }

  // Sort: full_song / lyrics_to_song preferred for long requests; segment last
  candidates.sort((a, b) => {
    if (preferFullSong) {
      const aFull = a.entry.generationMode === 'full_song' || a.entry.generationMode === 'lyrics_to_song'
      const bFull = b.entry.generationMode === 'full_song' || b.entry.generationMode === 'lyrics_to_song'
      if (aFull && !bFull) return -1
      if (!aFull && bFull) return 1
    }
    return b.entry.priority - a.entry.priority
  })

  return candidates
}

// ── HF Music Execution ────────────────────────────────────────────────────────

export interface HFMusicResult {
  success: boolean
  audioDataUrl: string | null
  audioUrl: string | null
  jobId: string | null
  model: string
  providerKey: string
  generationMode: MusicGenerationMode
  requestedDuration: number
  actualDuration: number | null
  error: string | null
}

/**
 * Execute music generation against a single HF candidate (endpoint or serverless).
 *
 * Response handling:
 * - audio/* or application/octet-stream → binary audio → base64 data URL
 * - application/json with .url field → audio URL
 * - application/json with .job_id / .status → async job
 * - Anything else → failure
 *
 * Never throws. Returns { success: false, error } on any failure.
 */
export async function executeHFMusicCandidate(
  prompt: string,
  requestedDuration: number,
  candidate: HFMusicProviderCandidate,
): Promise<HFMusicResult> {
  const { entry, endpointUrl, hfApiKey } = candidate
  const modelId = entry.modelId ?? 'unknown'
  const base = 'https://api-inference.huggingface.co'

  const targetUrl = endpointUrl
    ? endpointUrl.replace(/\/$/, '')
    : `${base}/models/${modelId}`

  const body = buildHFMusicBody(prompt, requestedDuration, entry)

  const emptyResult = (error: string): HFMusicResult => ({
    success: false,
    audioDataUrl: null,
    audioUrl: null,
    jobId: null,
    model: modelId,
    providerKey: entry.key,
    generationMode: entry.generationMode,
    requestedDuration,
    actualDuration: null,
    error,
  })

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'audio/wav, audio/flac, audio/mpeg, application/json, application/octet-stream',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      const isLoading = res.status === 503 || errText.toLowerCase().includes('loading')
      return emptyResult(
        isLoading
          ? `${entry.label} model is loading. Retry shortly.`
          : `${entry.label} error ${res.status}: ${errText.slice(0, 300)}`,
      )
    }

    const contentType = res.headers.get('content-type') ?? ''

    // Binary audio response
    if (contentType.startsWith('audio/') || contentType === 'application/octet-stream') {
      const buffer = await res.arrayBuffer()
      if (buffer.byteLength === 0) return emptyResult(`${entry.label} returned empty audio buffer`)
      const mime = contentType.startsWith('audio/') ? contentType.split(';')[0].trim() : 'audio/wav'
      const base64 = Buffer.from(buffer).toString('base64')
      return {
        success: true,
        audioDataUrl: `data:${mime};base64,${base64}`,
        audioUrl: null,
        jobId: null,
        model: modelId,
        providerKey: entry.key,
        generationMode: entry.generationMode,
        requestedDuration,
        actualDuration: null,
        error: null,
      }
    }

    // JSON response — may contain url, job_id, or error
    if (contentType.includes('application/json') || contentType.includes('text/')) {
      const data = await res.json().catch(() => null) as Record<string, unknown> | null
      if (!data) return emptyResult(`${entry.label} returned invalid JSON`)

      // Audio URL in response
      const audioUrl = typeof data.url === 'string' ? data.url
        : typeof data.audio_url === 'string' ? data.audio_url
        : typeof data.result_url === 'string' ? data.result_url
        : null

      if (audioUrl) {
        return {
          success: true,
          audioDataUrl: null,
          audioUrl,
          jobId: null,
          model: typeof data.model === 'string' ? data.model : modelId,
          providerKey: entry.key,
          generationMode: entry.generationMode,
          requestedDuration,
          actualDuration: typeof data.duration === 'number' ? data.duration : null,
          error: null,
        }
      }

      // Async job response
      const jobId = typeof data.job_id === 'string' ? data.job_id
        : typeof data.id === 'string' ? data.id
        : null
      const status = typeof data.status === 'string' ? data.status : 'pending'
      if (jobId || status === 'queued' || status === 'processing' || status === 'pending') {
        return {
          success: true,
          audioDataUrl: null,
          audioUrl: null,
          jobId,
          model: modelId,
          providerKey: entry.key,
          generationMode: entry.generationMode,
          requestedDuration,
          actualDuration: null,
          error: null,
        }
      }

      const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data).slice(0, 200)
      return emptyResult(`${entry.label} returned no audio: ${errMsg}`)
    }

    return emptyResult(`${entry.label} returned unexpected content-type: ${contentType}`)
  } catch (err) {
    return emptyResult(
      `${entry.label} request failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

function buildHFMusicBody(
  prompt: string,
  durationSeconds: number,
  entry: HFMusicProviderEntry,
): Record<string, unknown> {
  if (entry.generationMode === 'segment') {
    // MusicGen serverless format
    return {
      inputs: prompt,
      parameters: { max_new_tokens: Math.min(1500, Math.round(durationSeconds * 50)) },
    }
  }
  // Full-song endpoint format (ACE-Step, YuE, DiffRhythm)
  return {
    inputs: prompt,
    parameters: {
      duration: durationSeconds,
      format: 'mp3',
    },
  }
}

/**
 * Try all configured HF music candidates in priority order.
 * Returns the first successful result, or the last error if all fail.
 */
export async function executeHFMusicGeneration(
  prompt: string,
  requestedDuration: number,
  hfApiKey: string,
  hasLyrics: boolean,
): Promise<HFMusicResult> {
  const preferFullSong = requestedDuration > 60
  const candidates = resolveHFMusicCandidates(hfApiKey, requestedDuration, hasLyrics, preferFullSong)

  if (candidates.length === 0) {
    return {
      success: false,
      audioDataUrl: null,
      audioUrl: null,
      jobId: null,
      model: 'none',
      providerKey: 'none',
      generationMode: 'segment',
      requestedDuration,
      actualDuration: null,
      error: 'No HuggingFace music provider is configured. Add an HF API key and optionally configure HF_ENDPOINT_ACE_STEP, HF_ENDPOINT_YUE, or HF_ENDPOINT_DIFFRHYTHM for full-song generation.',
    }
  }

  let lastError = 'All HuggingFace music candidates failed'
  for (const candidate of candidates) {
    const result = await executeHFMusicCandidate(prompt, requestedDuration, candidate)
    if (result.success) return result
    lastError = result.error ?? lastError
  }

  return {
    success: false,
    audioDataUrl: null,
    audioUrl: null,
    jobId: null,
    model: candidates[candidates.length - 1]?.entry.modelId ?? 'none',
    providerKey: candidates[candidates.length - 1]?.entry.key ?? 'none',
    generationMode: 'segment',
    requestedDuration,
    actualDuration: null,
    error: lastError,
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateMusicPayload(payload: MusicCapabilityPayload): string | null {
  if (!payload.theme || payload.theme.trim().length === 0) {
    return 'Theme is required'
  }
  if (!payload.genres || payload.genres.length === 0) {
    return 'At least one genre is required'
  }
  if (payload.genres.length > 5) {
    return `Maximum 5 genres allowed — received ${payload.genres.length}`
  }
  const invalidGenres = payload.genres.filter(g => !(ALLOWED_GENRES as readonly string[]).includes(g))
  if (invalidGenres.length > 0) {
    return `Unsupported genre(s): ${invalidGenres.join(', ')}. Allowed: ${ALLOWED_GENRES.join(', ')}`
  }
  if (!(ALLOWED_VOCAL_TYPES as readonly string[]).includes(payload.vocalType)) {
    return `Unsupported vocal type: "${payload.vocalType}". Allowed: ${ALLOWED_VOCAL_TYPES.join(', ')}`
  }
  if (payload.moods && payload.moods.length > 5) {
    return 'Maximum 5 moods allowed'
  }
  const duration = payload.duration ?? 180
  if (duration < 30 || duration > 300) {
    return 'Duration must be between 30 and 300 seconds'
  }
  if (payload.bpm && (payload.bpm < 40 || payload.bpm > 300)) {
    return 'BPM must be between 40 and 300'
  }
  return null
}

// ── Style Inspiration → Descriptive Traits ────────────────────────────────────

const STYLE_TRAIT_MAP: Record<string, string> = {
  'michael jackson': '1980s–90s pop-funk, dance groove, bright synth hooks, rhythmic staccato vocal phrasing, polished pop-R&B production, dynamic call-and-response sections',
  'bob marley': 'roots reggae, offbeat guitar skank, warm round bassline, spiritual and social consciousness, laid-back groove, organic drum feel',
  'justin bieber': 'modern polished pop and R&B, melodic male lead vocal, radio-friendly hook, clean production, tropical-influenced percussion',
  'metallica': 'heavy metal, down-tuned distorted guitars, double-kick driving drums, aggressive riff-based energy, powerful full-band sound',
  'boyz ii men': '1990s R&B vocal group, four-part harmonies, smooth ballad phrasing, gospel-influenced melisma, lush string arrangements',
  'beyoncé': 'contemporary R&B pop, powerful female lead vocal, layered harmonies, stadium production energy, cinematic dynamics',
  'drake': 'hip-hop and moody R&B, introspective rap delivery, atmospheric trap beats, melodic hooks, sparse emotional production',
  'taylor swift': 'pop-country crossover, intimate storytelling lyrics, bright guitar hooks, anthemic chorus, confessional personal tone',
  'the weeknd': 'dark R&B, 1980s synth-pop influence, falsetto male vocal, moody atmospheric production, cinematic emotional arc',
  'eminem': 'rapid-fire rap delivery, introspective complex lyricism, hard-hitting boom-bap beats, raw confrontational energy',
  'rihanna': 'dancehall-influenced pop, reggae rhythmic feel, powerful female vocal, upbeat island-inspired production',
  'adele': 'soul-pop ballad, powerful emotional female vocal, orchestral arrangement, slow build dynamics, raw heartfelt phrasing',
  'ed sheeran': 'acoustic pop-folk, intimate male vocal, loop-based guitar patterns, conversational lyrical storytelling',
  'kendrick lamar': 'conscious hip-hop, complex narrative lyricism, jazz and soul sampling, intricate rhyme schemes',
  'linkin park': 'alternative metal, rap-rock hybrid, emotional contrast between soft verses and heavy sections, melodic chorus over distorted guitars',
  'coldplay': 'alternative rock, anthemic stadium feel, atmospheric synth pads, melodic guitar arpeggios, uplifting emotional arc',
  'bruno mars': '1970s–80s funk and soul influence, groove-forward drum feel, punchy brass section, playful melodic vocal, retro production polish',
}

export function resolveStyleInspiration(referenceStyle: string): string {
  const key = referenceStyle.toLowerCase().trim()
  if (STYLE_TRAIT_MAP[key]) return STYLE_TRAIT_MAP[key]
  return `musical style inspired by ${referenceStyle} — apply the characteristic sonic traits, instrumentation, era, and production style associated with this reference without imitating the voice or claiming authorship`
}

// ── Full Lyrics Generation ────────────────────────────────────────────────────

export function generateFullLyrics(payload: MusicCapabilityPayload): string {
  const theme = payload.theme.trim()
  const primaryGenre = payload.genres[0]
  const mood = payload.moods?.[0] ?? 'emotional'
  const language = payload.language ?? 'en'

  let lyrics: string
  if (payload.vocalType === 'rap') {
    lyrics = buildRapLyrics(theme, primaryGenre, mood)
  } else if (payload.vocalType === 'spoken_word') {
    lyrics = buildSpokenWordLyrics(theme, mood)
  } else {
    lyrics = buildStandardLyrics(theme, primaryGenre, mood, payload.genres)
  }

  return language !== 'en' ? `${lyrics}\n\n[Language: ${language}]` : lyrics
}

function buildStandardLyrics(theme: string, primaryGenre: MusicGenre, mood: MusicMood, genres: MusicGenre[]): string {
  const isGospel = genres.includes('gospel')
  const isReggae = genres.includes('reggae') || genres.includes('afrobeats') || genres.includes('amapiano')
  const isRnb = genres.includes('rnb') || genres.includes('soul')
  const isRock = genres.includes('rock') || genres.includes('metal')
  const isClassical = genres.includes('classical') || genres.includes('cinematic') || genres.includes('ambient')

  const adv = moodToAdverb(mood)
  const action = themeToAction(theme)
  const feeling = themeToFeeling(theme)
  const imagery = themeToImagery(theme, primaryGenre)
  const opposition = themeToOpposition(theme)
  const resolution = themeToResolution(theme, mood)

  if (isGospel) {
    return `[Intro]
In the stillness before dawn, I hear the call
Something greater than myself is standing tall

[Verse 1]
I have walked through valleys, carried every weight
${adv} I rise, ${action}, guided by my faith
Every step I take is measured, every prayer I pray
${imagery}, lighting up my way

[Pre-Chorus]
When the world grows cold and the shadows fall
There is something ${feeling} pulling through it all

[Chorus]
${theme} — a fire that never dies
Lifting up my spirit, reaching for the skies
${theme} — I surrender everything
In the power of this moment, hear me sing

[Verse 2]
Broken roads have shaped me, storms have made me whole
${opposition} tried to silence what was burning in my soul
But every trial, every heartache, every tear I've cried
Only made this ${feeling} stronger, only made me rise

[Pre-Chorus]
When the world grows cold and the shadows fall
There is something ${feeling} pulling through it all

[Chorus]
${theme} — a fire that never dies
Lifting up my spirit, reaching for the skies
${theme} — I surrender everything
In the power of this moment, hear me sing

[Bridge]
I won't let go, I won't back down
${resolution}
This is my song, this is my sound
${imagery}, sacred and profound

[Final Chorus]
${theme} — a fire that never dies
Lifting up my spirit, reaching for the skies
${theme} — I surrender everything
In the power of this moment, hear me sing

[Outro]
${theme}... ${theme}...
Forever in my heart`
  }

  if (isReggae) {
    return `[Intro]
One love, one rhythm, one truth to find
${adv} we ${action}, leaving fear behind

[Verse 1]
Underneath the sun, where the river flows
${imagery} — that is where the healing grows
In the rhythm of the earth, in the steady beat
Life is ${feeling} when the soul is free

[Pre-Chorus]
Rising up, can you feel it in your bones?
No matter where you wander, you are never alone

[Chorus]
${theme}, carry me through
Through every storm and every morning new
${theme}, in everything we do
This is the truth — and the truth will see us through

[Verse 2]
${opposition} may try to dim the light we carry here
But ${resolution} — that message becomes clear
Every voice that sings together, every hand held tight
${imagery} will guide us through the night

[Pre-Chorus]
Rising up, can you feel it in your bones?
No matter where you wander, you are never alone

[Chorus]
${theme}, carry me through
Through every storm and every morning new
${theme}, in everything we do
This is the truth — and the truth will see us through

[Bridge]
Roots run deep, the branches reach the sky
${adv} we move, let the old wounds lie
${feeling} is the rhythm, ${feeling} is the song
In this ${primaryGenre} groove, we have always belonged

[Final Chorus]
${theme}, carry me through
Through every storm and every morning new
${theme}, in everything we do
This is the truth — and the truth will see us through

[Outro]
Irie, irie — let the music play
${theme} leads the way`
  }

  if (isRnb) {
    return `[Intro]
Mmm... yeah
You know what this is

[Verse 1]
${adv}, I ${action} when I think of what we had
Every memory is ${feeling}, every good and bad
${imagery} in the corner of my mind
The kind of ${theme} that you only find sometimes

[Pre-Chorus]
And I've been trying to explain this feeling
But words fall short of what my heart is feeling

[Chorus]
${theme} — it's written in the way you move
${theme} — it's living in this midnight groove
Can't shake it, can't fake it, it's real
Baby, ${theme} is everything I feel

[Verse 2]
Late nights and city lights, the world outside is still
${opposition} fades away when I feel that thrill
${imagery} across the room and time slows down
${feeling} everywhere — the sweetest sound

[Pre-Chorus]
And I've been trying to explain this feeling
But words fall short of what my heart is feeling

[Chorus]
${theme} — it's written in the way you move
${theme} — it's living in this midnight groove
Can't shake it, can't fake it, it's real
Baby, ${theme} is everything I feel

[Bridge]
${resolution}
Cause I'm done pretending this isn't true
${adv} I lean into what I feel for you
${imagery} — that is my proof

[Final Chorus]
${theme} — it's written in the way you move
${theme} — it's living in this midnight groove
Can't shake it, can't fake it, it's real
Baby, ${theme} is everything I feel

[Outro]
Everything I feel... yeah
${theme}`
  }

  if (isRock) {
    return `[Intro]
[Guitar riff — heavy, driving]

[Verse 1]
${adv} we ${action}, breaking through the noise
${imagery} — drowning out the voices
Every scar is proof that we were here
${feeling} burns — it's all we've got this year

[Pre-Chorus]
We won't be silenced, we won't stand down
${opposition} — we'll shake the ground

[Chorus]
${theme}! — we scream it to the sky
${theme}! — we're not afraid to die
Burning bright until the darkness breaks
${theme} — this is what it takes

[Verse 2]
Concrete walls and broken glass below
${imagery} — the only way to go
${opposition} pressed against our backs tonight
${feeling} carries us into the fight

[Pre-Chorus]
We won't be silenced, we won't stand down
${opposition} — we'll shake the ground

[Chorus]
${theme}! — we scream it to the sky
${theme}! — we're not afraid to die
Burning bright until the darkness breaks
${theme} — this is what it takes

[Bridge]
[Guitar solo]
${resolution}
We are the ones who never gave in
We are the storm that's rising from within

[Final Chorus]
${theme}! — we scream it to the sky
${theme}! — we're not afraid to die
Burning bright until the darkness breaks
${theme} — this is what it takes

[Outro]
${theme}... ${theme}...
[Fading riff]`
  }

  if (isClassical) {
    return `[Movement I — Intro]
In the space between silence and sound
${imagery} — where meaning is found

[Movement II — First Theme]
${adv}, ${theme} begins to rise
${feeling} ascending toward the skies
Like a thread of light through winter air
${imagery} — unexpected, rare

[Development]
${opposition} — the tension grows
A darker passage, where the current flows
But underneath, the theme persists
${feeling} threading through the mist

[Movement III — Recapitulation]
${theme} returns, transformed and whole
${resolution}
${imagery} in every note
${feeling} — every chord you wrote

[Coda]
And in the silence after the last phrase
${theme} lingers — more than the ear can trace`
  }

  // Default: contemporary pop
  return `[Intro]
${adv}...

[Verse 1]
I ${action} when I think about ${theme}
${imagery} paints the picture clear
Every moment leading to this place
${feeling} all around me, everywhere

[Pre-Chorus]
Something in me knows this is real
Can't explain exactly what I feel
But the weight of it is undeniable

[Chorus]
${theme} — it changes everything
${theme} — hear the way it rings
I've been searching for a reason why
${theme} — it's the answer I've been trying to find

[Verse 2]
${opposition} tried to keep me from this truth
${imagery} — I knew it from my youth
Every single winding road I've taken here
Led me to this moment, crystal clear

[Pre-Chorus]
Something in me knows this is real
Can't explain exactly what I feel
But the weight of it is undeniable

[Chorus]
${theme} — it changes everything
${theme} — hear the way it rings
I've been searching for a reason why
${theme} — it's the answer I've been trying to find

[Bridge]
${resolution}
${adv} I stand and face what's true
${imagery} — I see it now, and I see through
Everything I thought I knew

[Final Chorus]
${theme} — it changes everything
${theme} — hear the way it rings
I've been searching for a reason why
${theme} — it's the answer I've been trying to find

[Outro]
${theme}...
The answer I've been trying to find`
}

function buildRapLyrics(theme: string, primaryGenre: MusicGenre, mood: MusicMood): string {
  const adv = moodToAdverb(mood)
  const action = themeToAction(theme)
  const feeling = themeToFeeling(theme)
  const opposition = themeToOpposition(theme)
  const resolution = themeToResolution(theme, mood)

  return `[Intro]
Uh, yeah... listen

[Verse 1]
${adv} moving through the noise, yeah I hear the call
${theme} written on the wall, standing ten feet tall
Every day I wake and ${action}, know what I'm about
${opposition} tries to keep me down but I break it out
${feeling} in my chest, I put it in the bars
Midnight in the city, hand reaching for the stars
This ${primaryGenre} sound is my identity, my code
Carrying my truth like a compass on this road

[Chorus]
${theme} — that's the only thing I know
${theme} — watch how far this takes me, watch me go
Real ones understand, this ain't for the fame
${theme} is the fire and the fuel and the flame

[Verse 2]
They said I couldn't make it, said the odds were stacked
${opposition} — I turned around and never looked back
${feeling} guided every decision, every word I wrote
Every line a testament to everything I know
${resolution}
${theme} — it isn't just a topic, it's the truth I hold
Story of my life, and it's finally being told

[Chorus]
${theme} — that's the only thing I know
${theme} — watch how far this takes me, watch me go
Real ones understand, this ain't for the fame
${theme} is the fire and the fuel and the flame

[Bridge]
When the beat drops, let it resonate
${theme} is what I build — watch me demonstrate
Every verse a chapter, every hook a key
This is where I stand — this is who I'll be

[Outro]
${theme}... yeah
That's the only thing I know`
}

function buildSpokenWordLyrics(theme: string, mood: MusicMood): string {
  const adv = moodToAdverb(mood)
  const feeling = themeToFeeling(theme)

  return `[Spoken — Opening]
There is a word I keep returning to.
A word that sounds simple until you sit with it.
That word is: ${theme}.

[Spoken — First Movement]
${adv} — I turn it over in my hands.
What does it ask of us?
What does it cost to truly live inside it?

We talk about ${theme} as if it were a given.
As if it arrives without being earned.
But those of us who have felt its absence know —
${theme} is work. ${theme} is choice. ${theme} is discipline.

[Spoken — Second Movement]
I have seen people carry ${feeling} like a burden they never asked for.
And I have seen others wear it like armor.
The difference is not circumstance.
The difference is the story they tell about it.

Change the story — and you change everything.

[Spoken — Refrain]
${theme}.
Not as an idea.
Not as a slogan.
But as a practice — daily, imperfect, and real.

[Spoken — Resolution]
So today, I choose ${theme}.
Not because it is easy.
But because the alternative is a life I am no longer willing to accept.

This is my declaration.
This is my rhythm.
This is my poem.

[Spoken — Closing]
${theme}.
Remember this word.
Let it find you when you need it most.`
}

function moodToAdverb(mood: MusicMood): string {
  const map: Record<MusicMood, string> = {
    happy: 'Joyfully', sad: 'Quietly', emotional: 'Deeply', aggressive: 'Fiercely',
    dark: 'Slowly', uplifting: 'Boldly', inspirational: 'Purposefully',
    energetic: 'Relentlessly', romantic: 'Softly', epic: 'Powerfully',
  }
  return map[mood] ?? 'Truly'
}

function themeToAction(theme: string): string {
  const t = theme.toLowerCase()
  if (t.includes('love')) return 'hold on to what matters'
  if (t.includes('freedom') || t.includes('free')) return 'break every chain'
  if (t.includes('faith') || t.includes('hope')) return 'rise above the doubt'
  if (t.includes('strength') || t.includes('power')) return 'stand my ground'
  if (t.includes('loss') || t.includes('grief')) return 'carry what remains'
  if (t.includes('journey') || t.includes('road')) return 'keep moving forward'
  if (t.includes('dream')) return 'chase what others said was impossible'
  return 'search for something real'
}

function themeToFeeling(theme: string): string {
  const t = theme.toLowerCase()
  if (t.includes('love')) return 'warmth'
  if (t.includes('freedom')) return 'liberation'
  if (t.includes('faith') || t.includes('hope')) return 'faith'
  if (t.includes('strength')) return 'resilience'
  if (t.includes('loss') || t.includes('grief')) return 'sorrow'
  if (t.includes('journey')) return 'momentum'
  if (t.includes('dream')) return 'purpose'
  return 'something undeniable'
}

function themeToImagery(theme: string, genre: MusicGenre): string {
  const t = theme.toLowerCase()
  const genreImages: Partial<Record<MusicGenre, string>> = {
    reggae: 'Golden light through palm leaves', amapiano: 'Dusty streets alive with rhythm',
    afrobeats: 'Colors blazing in the heat', classical: 'A cathedral of sound',
    cinematic: 'Sweeping vistas and quiet skies', ambient: 'Still water reflecting stars',
    jazz: 'Blue smoke in a late-night room', blues: 'A crossroads under a silver moon',
    folk: 'Firelight and open fields',
  }
  if (t.includes('love')) return 'Two hands reaching across the silence'
  if (t.includes('freedom')) return 'Wide open skies and no horizon'
  if (t.includes('faith')) return 'A single candle through the dark'
  if (t.includes('loss')) return 'An empty chair at the kitchen table'
  return genreImages[genre] ?? 'The light through a cracked window'
}

function themeToOpposition(theme: string): string {
  const t = theme.toLowerCase()
  if (t.includes('love')) return 'Distance and doubt'
  if (t.includes('freedom')) return 'Every lock and every wall'
  if (t.includes('faith')) return 'Every voice that said believe in nothing'
  if (t.includes('strength')) return 'Every force that tried to break me'
  if (t.includes('loss')) return 'Time and silence'
  if (t.includes('dream')) return 'Every voice that said impossible'
  return 'Everything that tried to hold me back'
}

function themeToResolution(theme: string, mood: MusicMood): string {
  const uplifting = ['happy', 'uplifting', 'inspirational', 'energetic', 'epic']
  return uplifting.includes(mood) ? `${theme} — this is where I choose to stand` : `Even now, ${theme} finds a way through`
}

// ── Provider Prompt Builder ───────────────────────────────────────────────────

export interface MusicProviderPrompt {
  prompt: string
  duration: number
  lyricsMode: 'custom' | 'generated' | 'instrumental'
  generatedLyrics?: string
  params: Record<string, unknown>
}

export function buildMusicProviderPrompt(payload: MusicCapabilityPayload): MusicProviderPrompt {
  const duration = payload.duration ?? 180
  const genreMix = payload.genres.join(', ')
  const moodList = payload.moods?.join(', ')
  const bpm = payload.bpm ? `${payload.bpm} BPM` : 'auto BPM'
  const language = payload.language ?? 'English'

  let lyricsMode: 'custom' | 'generated' | 'instrumental'
  let generatedLyrics: string | undefined
  let lyricsBlock = ''

  if (payload.vocalType === 'instrumental') {
    lyricsMode = 'instrumental'
  } else if (payload.lyrics && payload.lyrics.trim().length > 0) {
    lyricsMode = 'custom'
    lyricsBlock = `\n\nLyrics:\n${payload.lyrics.trim()}`
  } else {
    lyricsMode = 'generated'
    generatedLyrics = generateFullLyrics(payload)
    lyricsBlock = `\n\nLyrics:\n${generatedLyrics}`
  }

  const vocalDesc = buildVocalDescription(payload.vocalType, payload.genres)
  const styleDesc = payload.referenceStyle ? `\nStyle inspiration: ${resolveStyleInspiration(payload.referenceStyle)}` : ''
  const productionDesc = payload.productionNotes ? `\nProduction notes: ${payload.productionNotes}` : ''
  const explicitNote = payload.explicit ? '\nContent: explicit lyrics allowed' : ''

  const parts = [
    `Generate a ${duration}-second ${genreMix} song.`,
    `Theme: ${payload.theme}.`,
    `Vocal: ${vocalDesc}.`,
    moodList ? `Mood: ${moodList}.` : '',
    `Tempo: ${bpm}.`,
    `Language: ${language}.`,
    styleDesc, productionDesc, explicitNote, lyricsBlock,
  ]

  const prompt = parts.filter(Boolean).join('\n').trim()

  const params: Record<string, unknown> = {
    duration, genres: payload.genres, vocalType: payload.vocalType,
    bpm: payload.bpm ?? 'auto', language, explicit: payload.explicit ?? false,
  }
  if (payload.moods?.length) params.moods = payload.moods
  if (payload.referenceStyle) params.referenceStyle = payload.referenceStyle

  return { prompt, duration, lyricsMode, generatedLyrics, params }
}

function buildVocalDescription(vocalType: VocalType, genres: MusicGenre[]): string {
  switch (vocalType) {
    case 'male': return 'male lead vocal'
    case 'female': return 'female lead vocal'
    case 'duet': return 'male and female duet vocals'
    case 'band': return genres.some(g => ['rock', 'metal'].includes(g))
      ? 'full rock band with lead and backing vocals'
      : 'full band with lead and backing vocals'
    case 'choir': return 'choir vocal arrangement with full harmonies'
    case 'rap': return 'rap vocal delivery — rhythmic, lyric-forward, beat-driven'
    case 'spoken_word': return 'spoken word delivery — poetic, narrative, without melodic singing'
    case 'instrumental': return 'fully instrumental — no vocals, no lyrics'
    default: return 'lead vocal'
  }
}
