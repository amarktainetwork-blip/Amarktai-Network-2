/**
 * @module music-capability
 * @description Music generation capability with structured controls.
 *
 * Supports:
 * - Multiple genres (up to 5)
 * - Vocal types (male, female, choir, rap, spoken_word, instrumental)
 * - Moods (happy, sad, emotional, aggressive, dark, uplifting, inspirational, energetic, romantic, epic)
 * - BPM, duration, language, explicit/clean
 * - Lyrics provided or generated
 * - Reference style / inspired-by artist style
 *
 * ACTIVE PROVIDERS: genx, huggingface, together, groq, mimo
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MusicGenre =
  | 'pop' | 'rock' | 'metal' | 'reggae' | 'hiphop' | 'rap' | 'rnb'
  | 'edm' | 'house' | 'techno' | 'classical' | 'jazz' | 'blues'
  | 'gospel' | 'country' | 'folk' | 'cinematic' | 'ambient' | 'lofi'
  | 'amapiano' | 'afrobeats' | 'kpop' | 'soul' | 'custom'

export type VocalType =
  | 'male' | 'female' | 'duet' | 'band' | 'choir' | 'rap'
  | 'spoken_word' | 'instrumental'

export type MusicMood =
  | 'happy' | 'sad' | 'emotional' | 'aggressive' | 'dark'
  | 'uplifting' | 'inspirational' | 'energetic' | 'romantic' | 'epic'

export interface MusicCapabilityPayload {
  /** Song title (optional — auto-generated if omitted) */
  title?: string
  /** Theme or description */
  theme: string
  /** Genres (up to 5) */
  genres: MusicGenre[]
  /** Vocal type */
  vocalType: VocalType
  /** Mood tags (up to 5) */
  moods: MusicMood[]
  /** BPM (0 = auto) */
  bpm?: number
  /** Duration in seconds */
  duration?: number
  /** Language (ISO 639-1) */
  language?: string
  /** Explicit content */
  explicit?: boolean
  /** Existing lyrics */
  lyrics?: string
  /** Reference style / inspired-by artist */
  referenceStyle?: string
  /** Production notes */
  productionNotes?: string
}

export interface MusicExecutionResult {
  success: boolean
  provider: string
  model: string
  artifactId?: string
  audioUrl?: string
  blueprint?: MusicBlueprint
  error?: string
}

export interface MusicBlueprint {
  title: string
  genreMix: string
  vocalType: string
  bpm: number
  key: string
  structure: string
  lyrics: string
  productionNotes: string
  instrumentation: string
  mixMasterNotes: string
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateMusicPayload(payload: MusicCapabilityPayload): string | null {
  if (!payload.theme || payload.theme.trim().length === 0) {
    return 'Theme is required'
  }
  if (payload.genres.length === 0) {
    return 'At least one genre is required'
  }
  if (payload.genres.length > 5) {
    return 'Maximum 5 genres allowed'
  }
  if (payload.moods && payload.moods.length > 5) {
    return 'Maximum 5 moods allowed'
  }
  if (payload.duration && (payload.duration < 10 || payload.duration > 600)) {
    return 'Duration must be between 10 and 600 seconds'
  }
  if (payload.bpm && (payload.bpm < 40 || payload.bpm > 300)) {
    return 'BPM must be between 40 and 300'
  }
  return null
}

// ── Blueprint Generation ──────────────────────────────────────────────────────

export function generateMusicBlueprint(payload: MusicCapabilityPayload): MusicBlueprint {
  const genreMix = payload.genres.join(' + ')
  const title = payload.title || `${genreMix} ${payload.vocalType} track`

  return {
    title,
    genreMix,
    vocalType: payload.vocalType,
    bpm: payload.bpm || 120,
    key: 'C major',
    structure: generateSongStructure(payload.genres, payload.vocalType),
    lyrics: payload.lyrics || generateLyricsPlaceholder(payload.theme, payload.genres),
    productionNotes: payload.productionNotes || generateProductionNotes(payload.genres, payload.moods),
    instrumentation: generateInstrumentation(payload.genres, payload.vocalType),
    mixMasterNotes: generateMixNotes(payload.genres),
  }
}

function generateSongStructure(genres: MusicGenre[], vocalType: VocalType): string {
  const hasVocals = vocalType !== 'instrumental'
  const sections = ['Intro']

  if (hasVocals) {
    sections.push('Verse 1', 'Pre-Chorus', 'Chorus')
    if (genres.includes('rock') || genres.includes('metal') || genres.includes('pop')) {
      sections.push('Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Guitar Solo', 'Chorus', 'Outro')
    } else {
      sections.push('Verse 2', 'Chorus', 'Bridge', 'Chorus', 'Outro')
    }
  } else {
    sections.push('Main Theme', 'Variation 1', 'Bridge', 'Variation 2', 'Climax', 'Outro')
  }

  return sections.join(' → ')
}

function generateLyricsPlaceholder(theme: string, genres: MusicGenre[]): string {
  const primaryGenre = genres[0] || 'pop'
  return `[Verse 1]\n${theme}-inspired lyrics...\n\n[Chorus]\nCatchy ${primaryGenre} chorus...\n\n[Verse 2]\nContinuing the theme...\n\n[Chorus]\nRepeat chorus...\n\n[Bridge]\nBridge section...\n\n[Chorus]\nFinal chorus...`
}

function generateProductionNotes(genres: MusicGenre[], moods?: MusicMood[]): string {
  const notes: string[] = []
  if (genres.includes('edm') || genres.includes('house') || genres.includes('techno')) {
    notes.push('Heavy bass, synth leads, electronic drums')
  }
  if (genres.includes('rock') || genres.includes('metal')) {
    notes.push('Electric guitars, drums, bass guitar')
  }
  if (genres.includes('classical') || genres.includes('cinematic')) {
    notes.push('Orchestral arrangement, strings, brass, woodwinds')
  }
  if (moods?.includes('epic') || moods?.includes('inspirational')) {
    notes.push('Building dynamics, powerful crescendos')
  }
  return notes.join('. ') || 'Standard production'
}

function generateInstrumentation(genres: MusicGenre[], vocalType: VocalType): string {
  const instruments: string[] = []
  if (vocalType !== 'instrumental') {
    instruments.push('Vocals')
  }
  if (genres.includes('rock') || genres.includes('metal')) {
    instruments.push('Electric Guitar', 'Bass Guitar', 'Drums')
  }
  if (genres.includes('pop') || genres.includes('rnb')) {
    instruments.push('Synthesizer', 'Drums', 'Bass')
  }
  if (genres.includes('classical') || genres.includes('cinematic')) {
    instruments.push('Strings', 'Brass', 'Woodwinds', 'Percussion')
  }
  if (genres.includes('jazz') || genres.includes('blues')) {
    instruments.push('Piano', 'Saxophone', 'Trumpet', 'Double Bass')
  }
  return instruments.join(', ') || 'Standard instrumentation'
}

function generateMixNotes(genres: MusicGenre[]): string {
  if (genres.includes('edm') || genres.includes('house') || genres.includes('techno')) {
    return 'Heavy compression, side-chain pumping, wide stereo image'
  }
  if (genres.includes('rock') || genres.includes('metal')) {
    return 'Punchy drums, distorted guitars, powerful vocals'
  }
  if (genres.includes('classical') || genres.includes('cinematic')) {
    return 'Natural dynamics, wide stereo field, reverb-heavy'
  }
  return 'Balanced mix, clear vocals, standard mastering'
}
