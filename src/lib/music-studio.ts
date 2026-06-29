/**
 * @module music-studio
 * @description Full Music Studio for the AmarktAI Network platform.
 *
 * Provides a complete music production pipeline:
 *   - Lyrics generation
 *   - Song structure generation
 *   - Music/audio generation (via AI music providers: Suno-compatible, MusicGen)
 *   - Cover art generation (via image generation models)
 *   - Genre / vocal style / BPM configuration
 *   - Export / download pipeline
 *   - Artifact metadata (title, genre, duration, model, timestamp)
 *
 * When a real music generation API is not configured the module falls back to
 * generating a full creative blueprint (lyrics + structure + production notes)
 * and marks the audio artifact as `blueprint_only` so the dashboard can
 * display it truthfully.
 *
 * Server-side only.
 */

import { randomUUID } from 'crypto'
import { getVaultApiKey } from '@/lib/brain'
import { isUsableServiceKey } from '@/lib/service-vault'
import { callGenXMedia, getConfiguredGenXMusicModel, getGenXStatusAsync } from '@/lib/genx-client'
import { createArtifact } from '@/lib/artifact-store'

// Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Maximum characters from generated lyrics sent to the Suno API as a prompt.
 *  The Suno API accepts prompts up to ~3000 characters. */

/** Number of polling iterations when waiting for an async audio prediction.
 *  Each iteration waits REPLICATE_POLL_INTERVAL_MS Ã¢â€ â€™ total max wait = 60 s. */

/** Milliseconds to wait between async audio prediction polling attempts. */
const IS_TEST_RUNTIME = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'

function usableKey(raw: string | null | undefined): string | null {
  return isUsableServiceKey(raw) ? raw.trim() : null
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Supported music genres. */
export type MusicGenre =
  | 'pop'
  | 'rock'
  | 'hip_hop'
  | 'edm'
  | 'gospel'
  | 'worship'
  | 'amapiano'
  | 'afrobeats'
  | 'jazz'
  | 'classical'
  | 'rnb'
  | 'country'
  | 'blues'
  | 'reggae'
  | 'latin'
  | 'kpop'
  | 'soul'
  | 'ambient'
  | 'lofi'
  | 'cinematic'
  | 'custom'

/** Vocal style options. */
export type VocalStyle =
  | 'male_lead'
  | 'female_lead'
  | 'choir'
  | 'rap'
  | 'spoken_word'
  | 'a_cappella'
  | 'harmonized'
  | 'falsetto'
  | 'instrumental_only'

/** Song section type. */
export type SongSection = 'intro' | 'verse' | 'pre_chorus' | 'chorus' | 'bridge' | 'outro' | 'instrumental_break'

/** Request to create a music piece. */
export interface MusicCreationRequest {
  /** App this music is created for. */
  appSlug: string
  /** Song title (optional Ã¢â‚¬â€ will be auto-generated if omitted). */
  title?: string
  /** Theme or mood of the song (e.g. "hope and redemption"). */
  theme: string
  /**
   * Primary genre (legacy single-genre field Ã¢â‚¬â€ still supported).
   * When `genres` is provided and non-empty, `genre` is ignored; `genres[0]` is used.
   */
  genre: MusicGenre
  /**
   * Multi-genre selection (max 5). If provided, overrides `genre`.
   * The first entry is treated as the primary genre.
   */
  genres?: MusicGenre[]
  /** Mood tags (max 5). E.g. ["uplifting", "intense", "nostalgic"]. */
  moods?: string[]
  /** Vocal style. */
  vocalStyle: VocalStyle
  /** Approximate duration in seconds. */
  durationSeconds?: number
  /** BPM (beats per minute). 0 = auto. */
  bpm?: number
  /** Song language (ISO 639-1 or display name, e.g. "en" / "English"). Defaults to "English". */
  language?: string
  /**
   * true = instrumental-only track (overrides vocalStyle to instrumental_only).
   * Defaults to false unless vocalStyle = 'instrumental_only'.
   */
  instrumental?: boolean
  /**
   * Cover art generation preference:
   *   "auto"   Ã¢â‚¬â€ generate cover art if image provider is configured (default)
   *   "custom" Ã¢â‚¬â€ skip AI generation; admin will supply art manually
   *   "none"   Ã¢â‚¬â€ do not generate cover art
   */
  coverArtChoice?: 'auto' | 'custom' | 'none'
  /** Existing lyrics to use (skips lyrics generation step). */
  existingLyrics?: string
  /** Extra creative direction. */
  productionNotes?: string
  /** Provider-ready prompt compiled by Studio controls. */
  prompt?: string
  /** Requested number of tracks. */
  count?: number
  /** Fine-grained section instructions from Studio. */
  songStructure?: Record<string, string>
  /** Optional downstream video-planning handoff metadata. */
  musicVideoHandoff?: Record<string, unknown>
  /**
   * Whether to also generate a cover art image.
   * @deprecated Use coverArtChoice. Kept for backward compatibility.
   */
  generateCoverArt?: boolean
  /** Quality tier for model selection. */
  qualityTier?: 'standard' | 'high' | 'premium'
}

/** Resolve the primary genre from a request (handles both legacy and new multi-genre field). */
export function resolveGenre(request: MusicCreationRequest): MusicGenre {
  if (request.genres && request.genres.length > 0) return request.genres[0]
  return request.genre
}

/** Validate genre/mood limits and normalise the request in place. Throws on invalid input. */
export function validateMusicRequest(request: MusicCreationRequest): void {
  if (request.genres && request.genres.length > 5) {
    throw new Error('Too many genres: maximum 5 genres allowed.')
  }
  if (request.moods && request.moods.length > 5) {
    throw new Error('Too many moods: maximum 5 moods allowed.')
  }
  // Normalise instrumental flag
  if (request.instrumental) {
    request.vocalStyle = 'instrumental_only'
  }
}

/** One section in a generated song structure. */
export interface SongStructureSection {
  type: SongSection
  durationSeconds: number
  lyrics?: string
  notes?: string
}

/** Full song structure. */
export interface SongStructure {
  sections: SongStructureSection[]
  totalDurationSeconds: number
  bpm: number
  keySignature: string
  timeSignature: string
  productionStyle: string
}

/** Lyrics generation result. */
export interface LyricsResult {
  id: string
  title: string
  genre: MusicGenre
  theme: string
  vocalStyle: VocalStyle
  lyrics: string
  structure: SongStructure
  generatedAt: string
  model: string
}

/** Audio generation result artifact. */
export interface MusicArtifact {
  id: string
  appSlug: string
  title: string
  genre: MusicGenre
  vocalStyle: VocalStyle
  theme: string
  durationSeconds: number
  bpm: number
  /** URL to the audio file (absolute URL or data URI). */
  audioUrl: string | null
  /** MIME type of the audio file. */
  audioMimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | null
  /** Whether the audio was actually generated or only a blueprint was produced. */
  artifactType: 'generated_audio' | 'blueprint_only'
  /** Full lyrics for the track. */
  lyrics: string
  /** Full song structure. */
  structure: SongStructure
  /** Cover art image URL (null if not generated). */
  coverArtUrl: string | null
  /** Provider that generated the music. */
  musicProvider: string
  /** Model used for lyrics/structure generation. */
  lyricsModel: string
  /** Model used for cover art generation. */
  coverArtModel: string | null
  /** ISO timestamp of generation. */
  generatedAt: string
  /** Metadata tags for this track. */
  tags: string[]
}

/** Result from the music studio pipeline. */
export interface MusicStudioResult {
  artifact: MusicArtifact
  lyrics: LyricsResult
  status: 'generated' | 'blueprint_only' | 'failed'
  message: string
}

/** Summary of music studio activity. */
export interface MusicStudioSummary {
  totalCreated: number
  byGenre: Record<string, number>
  byAppSlug: Record<string, number>
  lastCreatedAt: string | null
  providersUsed: string[]
}

// Ã¢â€â‚¬Ã¢â€â‚¬ DB-backed artifact persistence Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// Uses the platform's Artifact model (type='music') instead of an in-memory Map.
// Falls back gracefully to empty results if the DB is unavailable.

async function _saveMusicArtifactToDB(artifact: MusicArtifact): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.artifact.create({
      data: {
        id: artifact.id,
        appSlug: artifact.appSlug,
        type: 'music',
        subType: artifact.artifactType,
        title: artifact.title,
        description: `${artifact.genre} Ã¢â‚¬Â¢ ${artifact.vocalStyle} Ã¢â‚¬Â¢ ${artifact.theme}`,
        provider: artifact.musicProvider,
        model: artifact.lyricsModel,
        storageDriver: 'url',
        storagePath: '',
        storageUrl: artifact.audioUrl ?? '',
        mimeType: artifact.audioMimeType ?? '',
        fileSizeBytes: 0,
        previewable: true,
        downloadable: !!artifact.audioUrl,
        status: artifact.artifactType === 'generated_audio' ? 'completed' : 'completed',
        metadata: JSON.stringify({
          genre: artifact.genre,
          vocalStyle: artifact.vocalStyle,
          theme: artifact.theme,
          durationSeconds: artifact.durationSeconds,
          bpm: artifact.bpm,
          lyrics: artifact.lyrics,
          structure: artifact.structure,
          coverArtUrl: artifact.coverArtUrl,
          coverArtModel: artifact.coverArtModel,
          artifactType: artifact.artifactType,
          tags: artifact.tags,
          generatedAt: artifact.generatedAt,
        }),
      },
    })
  } catch {
    // DB write failure is non-fatal Ã¢â‚¬â€ log only, do not throw
  }
}

async function loadMusicArtifactsFromDB(appSlug?: string, limit = 50): Promise<MusicArtifact[]> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.artifact.findMany({
      where: { type: 'music', ...(appSlug ? { appSlug } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row): MusicArtifact => {
      let meta: Record<string, unknown> = {}
      try { meta = JSON.parse(row.metadata) as Record<string, unknown> } catch { /* ignore */ }
      return {
        id: row.id,
        appSlug: row.appSlug,
        title: row.title,
        genre: (meta.genre as MusicGenre) ?? 'pop',
        vocalStyle: (meta.vocalStyle as VocalStyle) ?? 'female_lead',
        theme: (meta.theme as string) ?? '',
        durationSeconds: (meta.durationSeconds as number) ?? 180,
        bpm: (meta.bpm as number) ?? 100,
        audioUrl: row.storageUrl || null,
        audioMimeType: (row.mimeType as 'audio/mpeg' | 'audio/wav' | 'audio/ogg') || null,
        artifactType: (meta.artifactType as 'generated_audio' | 'blueprint_only') ?? 'blueprint_only',
        lyrics: (meta.lyrics as string) ?? '',
        structure: (meta.structure as SongStructure) ?? { sections: [] },
        coverArtUrl: (meta.coverArtUrl as string) ?? null,
        musicProvider: row.provider,
        lyricsModel: row.model,
        coverArtModel: (meta.coverArtModel as string) ?? null,
        generatedAt: row.createdAt.toISOString(),
        tags: (meta.tags as string[]) ?? [],
      }
    })
  } catch {
    return []
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Genre display names Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const GENRE_DISPLAY: Record<MusicGenre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  hip_hop: 'Hip Hop',
  edm: 'EDM',
  gospel: 'Gospel',
  worship: 'Worship',
  amapiano: 'Amapiano',
  afrobeats: 'Afrobeats',
  jazz: 'Jazz',
  classical: 'Classical',
  rnb: 'R&B',
  country: 'Country',
  blues: 'Blues',
  reggae: 'Reggae',
  latin: 'Latin',
  kpop: 'K-Pop',
  soul: 'Soul',
  ambient: 'Ambient',
  lofi: 'Lo-Fi',
  cinematic: 'Cinematic',
  custom: 'Custom',
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Genre defaults (BPM, key, production notes) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface GenreDefaults {
  typicalBpm: number
  typicalKey: string
  timeSignature: string
  productionStyle: string
}

const GENRE_DEFAULTS: Record<string, GenreDefaults> = {
  pop:        { typicalBpm: 120, typicalKey: 'C major', timeSignature: '4/4', productionStyle: 'polished, hooky, radio-ready' },
  rock:       { typicalBpm: 140, typicalKey: 'G major', timeSignature: '4/4', productionStyle: 'electric guitars, powerful drums, driven mix' },
  hip_hop:    { typicalBpm: 90,  typicalKey: 'D minor', timeSignature: '4/4', productionStyle: 'boom-bap or trap drums, sub bass, sampled chops' },
  edm:        { typicalBpm: 128, typicalKey: 'A minor', timeSignature: '4/4', productionStyle: 'synthesizer leads, sidechain compression, drop builds' },
  gospel:     { typicalBpm: 80,  typicalKey: 'F major', timeSignature: '4/4', productionStyle: 'organ, choir harmonies, uplifting key changes' },
  worship:    { typicalBpm: 75,  typicalKey: 'E major', timeSignature: '4/4', productionStyle: 'atmospheric pads, acoustic guitar, congregational feel' },
  amapiano:   { typicalBpm: 112, typicalKey: 'C minor', timeSignature: '4/4', productionStyle: 'log drum, deep house piano, sub bass, percussion groove' },
  afrobeats:  { typicalBpm: 105, typicalKey: 'G minor', timeSignature: '4/4', productionStyle: 'percussive polyrhythm, talking drum, bright keys' },
  jazz:       { typicalBpm: 95,  typicalKey: 'Bb major', timeSignature: '4/4', productionStyle: 'swing feel, walking bass, improvised solos' },
  classical:  { typicalBpm: 80,  typicalKey: 'D major', timeSignature: '4/4', productionStyle: 'orchestral dynamics, counterpoint, thematic development' },
  rnb:        { typicalBpm: 85,  typicalKey: 'A major', timeSignature: '4/4', productionStyle: 'smooth groove, sustained chords, emotional melisma' },
  country:    { typicalBpm: 110, typicalKey: 'G major', timeSignature: '4/4', productionStyle: 'acoustic guitar, steel guitar, storytelling lyrics' },
  blues:      { typicalBpm: 80,  typicalKey: 'E major', timeSignature: '4/4', productionStyle: '12-bar blues, call-and-response, emotive guitar bends' },
  reggae:     { typicalBpm: 80,  typicalKey: 'G major', timeSignature: '4/4', productionStyle: 'offbeat skank, bass-driven, roots rhythm' },
  latin:      { typicalBpm: 100, typicalKey: 'A minor', timeSignature: '4/4', productionStyle: 'clave rhythm, brass stabs, Latin percussion' },
  kpop:       { typicalBpm: 130, typicalKey: 'B major', timeSignature: '4/4', productionStyle: 'ultra-polished, synth-heavy, choreography-ready drops' },
  soul:       { typicalBpm: 85,  typicalKey: 'E major', timeSignature: '4/4', productionStyle: 'horn section, Hammond organ, emotive vocal delivery' },
  ambient:    { typicalBpm: 70,  typicalKey: 'F major', timeSignature: '4/4', productionStyle: 'textural pads, slow evolving soundscapes, no hard drum hits' },
  lofi:       { typicalBpm: 80,  typicalKey: 'C major', timeSignature: '4/4', productionStyle: 'vinyl crackle, muffled highs, laid-back swing' },
  cinematic:  { typicalBpm: 75,  typicalKey: 'D minor', timeSignature: '4/4', productionStyle: 'full orchestra, emotional arc, tension and release' },
  custom:     { typicalBpm: 100, typicalKey: 'C major', timeSignature: '4/4', productionStyle: 'genre-blending, experimental approach' },
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Lyrics Generation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Build a detailed lyrics generation prompt for an AI language model.
 */
export function buildLyricsPrompt(request: MusicCreationRequest): string {
  const primaryGenre = resolveGenre(request)
  const genreName = GENRE_DISPLAY[primaryGenre] ?? primaryGenre
  const defs = GENRE_DEFAULTS[primaryGenre] ?? GENRE_DEFAULTS.pop
  const bpm = request.bpm || defs.typicalBpm
  const style = request.vocalStyle.replace(/_/g, ' ')
  const moodStr = request.moods && request.moods.length > 0
    ? `- Moods: ${request.moods.join(', ')}\n`
    : ''
  const genresStr = request.genres && request.genres.length > 1
    ? `- Genres (blend): ${request.genres.map(g => GENRE_DISPLAY[g] ?? g).join(', ')}\n`
    : `- Genre: ${genreName}\n`
  const langStr = request.language && request.language !== 'en' && request.language.toLowerCase() !== 'english'
    ? `- Language: ${request.language}\n`
    : ''

  return `You are a professional songwriter and music producer. Create complete, polished song lyrics for the following track.

TRACK DETAILS:
- Title: ${request.title ?? 'auto-generate a compelling title'}
${genresStr}${moodStr}- Theme / mood: ${request.theme}
- Vocal style: ${style}
- BPM: ${bpm}
- Production style: ${defs.productionStyle}
${langStr}${request.productionNotes ? `- Extra direction: ${request.productionNotes}\n` : ''}
REQUIRED OUTPUT (respond in this exact format):

TITLE: <song title>

STRUCTURE:
[Intro] (${Math.round((request.durationSeconds ?? 180) * 0.07)}s)
[Verse 1] (${Math.round((request.durationSeconds ?? 180) * 0.18)}s)
[Pre-Chorus] (${Math.round((request.durationSeconds ?? 180) * 0.10)}s)
[Chorus] (${Math.round((request.durationSeconds ?? 180) * 0.15)}s)
[Verse 2] (${Math.round((request.durationSeconds ?? 180) * 0.18)}s)
[Pre-Chorus] (${Math.round((request.durationSeconds ?? 180) * 0.10)}s)
[Chorus] (${Math.round((request.durationSeconds ?? 180) * 0.15)}s)
[Bridge] (${Math.round((request.durationSeconds ?? 180) * 0.12)}s)
[Outro] (${Math.round((request.durationSeconds ?? 180) * 0.10)}s)

LYRICS:
(Write full lyrics for every section above. Mark each section clearly.)

PRODUCTION NOTES:
(2-3 sentences on instrumentation, feel, key changes, production tips.)

Make the lyrics emotionally resonant, commercially viable, and true to the genre. Be specific and creative.`
}

/**
 * Parse raw AI lyrics output into a structured LyricsResult.
 */
export function parseLyricsOutput(
  raw: string,
  request: MusicCreationRequest,
  model: string,
): LyricsResult {
  const id = randomUUID()
  const primaryGenre = resolveGenre(request)
  const defs = GENRE_DEFAULTS[primaryGenre] ?? GENRE_DEFAULTS.pop
  const bpm = request.bpm || defs.typicalBpm

  // Extract title
  const titleMatch = raw.match(/TITLE:\s*(.+)/i)
  const title = titleMatch?.[1]?.trim() ?? request.title ?? `${request.theme} (${GENRE_DISPLAY[primaryGenre]})`

  // Extract lyrics section using a linear split to avoid ReDoS on adversarial input.
  // Split on "PRODUCTION NOTES:" (case-insensitive) and take the portion after "LYRICS:".
  const prodNotesSplit = raw.split(/PRODUCTION NOTES:/i)
  const beforeProdNotes = prodNotesSplit[0] ?? raw
  const lyricsSplit = beforeProdNotes.split(/LYRICS:/i)
  const lyrics = (lyricsSplit.length > 1 ? lyricsSplit.slice(1).join('') : raw).trim()

  // Build a simple structure from the raw text
  const SECTION_TYPES: Array<{ label: string; type: SongSection }> = [
    { label: 'Intro', type: 'intro' },
    { label: 'Verse 1', type: 'verse' },
    { label: 'Verse 2', type: 'verse' },
    { label: 'Verse 3', type: 'verse' },
    { label: 'Pre-Chorus', type: 'pre_chorus' },
    { label: 'Chorus', type: 'chorus' },
    { label: 'Bridge', type: 'bridge' },
    { label: 'Outro', type: 'outro' },
    { label: 'Instrumental', type: 'instrumental_break' },
  ]

  const totalDuration = request.durationSeconds ?? 180
  const sections: SongStructureSection[] = []
  const rawLines = lyrics.split('\n')

  for (const { label, type } of SECTION_TYPES) {
    const regex = new RegExp(`\\[${label}\\]([^\\[]*)`, 'i')
    const match = raw.match(regex)
    if (match) {
      sections.push({
        type,
        durationSeconds: Math.round(totalDuration / (SECTION_TYPES.length || 1)),
        lyrics: match[1]?.trim(),
      })
    }
  }

  if (sections.length === 0) {
    // Fallback: chunk lyrics into verse/chorus/verse/chorus structure
    const chunks = rawLines.filter((l) => l.trim()).slice(0, 24)
    const chunkSize = Math.ceil(chunks.length / 4)
    const sectionTypes: SongSection[] = ['verse', 'chorus', 'verse', 'chorus']
    for (let i = 0; i < 4; i++) {
      sections.push({
        type: sectionTypes[i],
        durationSeconds: Math.round(totalDuration / 4),
        lyrics: chunks.slice(i * chunkSize, (i + 1) * chunkSize).join('\n'),
      })
    }
  }

  const structure: SongStructure = {
    sections,
    totalDurationSeconds: totalDuration,
    bpm,
    keySignature: defs.typicalKey,
    timeSignature: defs.timeSignature,
    productionStyle: defs.productionStyle,
  }

  return {
    id,
    title,
    genre: resolveGenre(request),
    theme: request.theme,
    vocalStyle: request.vocalStyle,
    lyrics,
    structure,
    generatedAt: new Date().toISOString(),
    model,
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Music Generation API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Providers that support real music audio generation (currently external services). */
export type MusicProvider = 'genx' | 'blueprint_only'

/**
 * Attempt to generate audio via a configured music provider.
 * Returns null when no provider is available (falls back to blueprint_only).
 *
 * Key resolution order: DB vault (set via Admin Ã¢â€ â€™ AI Providers UI) first,
 * then raw environment variable fallback (for local dev / CI).
 */
async function generateAudio(
  request: MusicCreationRequest,
  lyrics: LyricsResult,
): Promise<{ audioUrl: string; mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg'; provider: MusicProvider } | null> {
  if (IS_TEST_RUNTIME) return null

  try {
    const musicModel = getConfiguredGenXMusicModel()
    if (!musicModel) return null
    const genxStatus = await getGenXStatusAsync()
    if (genxStatus.available) {
      const genxResult = await callGenXMedia({
        model: musicModel,
        prompt: `${lyrics.title}\n\n${lyrics.lyrics}`,
        type: 'audio',
        duration: request.durationSeconds,
        params: {
          style: GENRE_DISPLAY[resolveGenre(request)] ?? resolveGenre(request),
          lyrics: lyrics.lyrics,
        },
      })
      if (genxResult.success && genxResult.url) {
        return { audioUrl: genxResult.url, mimeType: 'audio/mpeg', provider: 'genx' }
      }
    }
  } catch {
    // Fall through to direct audio providers.
  }

          // Poll for up to REPLICATE_POLL_ITERATIONS Ãƒâ€” REPLICATE_POLL_INTERVAL_MS
  return null
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Cover Art Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Generate cover art for the track using the platform's image generation route.
 * Returns a data URL or CDN URL, or null if unavailable.
 */
async function generateCoverArt(
  lyrics: LyricsResult,
  request: MusicCreationRequest,
): Promise<{ url: string; model: string } | null> {
  try {
    const prompt =
      `Album cover art for a ${GENRE_DISPLAY[resolveGenre(request)]} song titled "${lyrics.title}". ` +
      `Theme: ${request.theme}. Style: ${GENRE_DEFAULTS[resolveGenre(request)]?.productionStyle ?? 'modern'}. ` +
      'High quality, visually compelling, no text overlays.'
    const result = await callGenXMedia({
      model: 'genx/default-image',
      prompt,
      type: 'image',
    })
    if (result.success && result.url) return { url: result.url, model: result.model ?? 'genx/default-image' }
  } catch { /* fall through */ }
  return null
}

async function saveCanonicalMusicArtifact(artifact: MusicArtifact): Promise<string> {
  const metadata = {
    genre: artifact.genre,
    vocalStyle: artifact.vocalStyle,
    theme: artifact.theme,
    durationSeconds: artifact.durationSeconds,
    bpm: artifact.bpm,
    lyrics: artifact.lyrics,
    structure: artifact.structure,
    coverArtUrl: artifact.coverArtUrl,
    coverArtModel: artifact.coverArtModel,
    artifactType: artifact.artifactType,
    tags: artifact.tags,
    generatedAt: artifact.generatedAt,
  }
  const saved = artifact.artifactType === 'generated_audio' && artifact.audioUrl
    ? await createArtifact({
      appSlug: artifact.appSlug,
      type: 'music',
      subType: 'generated_audio',
      title: artifact.title,
      description: `${artifact.genre} / ${artifact.vocalStyle} / ${artifact.theme}`,
      provider: artifact.musicProvider,
      model: artifact.lyricsModel,
      contentUrl: artifact.audioUrl,
      allowRemoteReference: true,
      mimeType: artifact.audioMimeType ?? 'audio/mpeg',
      metadata,
    })
    : await createArtifact({
      appSlug: artifact.appSlug,
      type: 'report',
      subType: 'music_plan',
      title: `${artifact.title} - song plan`,
      description: 'Lyrics and production plan only. No playable song was generated.',
      provider: artifact.musicProvider,
      model: artifact.lyricsModel,
      content: Buffer.from(JSON.stringify(metadata, null, 2)),
      mimeType: 'application/json',
      metadata,
    })
  return saved.id
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Lyrics-only Generation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/**
 * Generate lyrics by calling an active chat provider when configured.
 * Falls back to a structured template when no key is available.
 */
async function generateLyricsViaChat(
  request: MusicCreationRequest,
): Promise<{ lyrics: string; model: string }> {
  // Groq fallback (vault or env) for text generation.
  const groqKey = (await getVaultApiKey('groq').catch(() => null)) ?? process.env.GROQ_API_KEY?.trim() ?? null
  if (groqKey) {
    const prompt = buildLyricsPrompt(request)
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.85,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { choices: Array<{ message: { content: string } }>; model: string }
        const content = data?.choices?.[0]?.message?.content ?? ''
        return { lyrics: content, model: data.model ?? 'llama-3.3-70b-versatile' }
      }
    } catch { /* fall through to template */ }
  }

  // Template fallback Ã¢â‚¬â€ no AI key available anywhere
  return { lyrics: buildFallbackLyrics(request), model: 'template' }
}

/**
 * Build a structured lyrics template when AI generation is unavailable.
 * This is a real, usable starting point Ã¢â‚¬â€ not a placeholder.
 */
function buildFallbackLyrics(request: MusicCreationRequest): string {
  const primaryGenre = resolveGenre(request)
  const genreName = GENRE_DISPLAY[primaryGenre] ?? primaryGenre
  const defs = GENRE_DEFAULTS[primaryGenre] ?? GENRE_DEFAULTS.pop

  return `TITLE: ${request.title ?? request.theme}

STRUCTURE:
[Intro] (~12s)
[Verse 1] (~30s)
[Pre-Chorus] (~16s)
[Chorus] (~24s)
[Verse 2] (~30s)
[Pre-Chorus] (~16s)
[Chorus] (~24s)
[Bridge] (~20s)
[Outro] (~16s)

LYRICS:
[Intro]
(Instrumental introduction Ã¢â‚¬â€ ${defs.productionStyle})

[Verse 1]
In the silence of the morning light,
Every thought that I've been holding tight.
${request.theme} fills the air around,
A new beginning, breaking ground.

[Pre-Chorus]
And I can feel it rising,
Something new is coming through,
The horizon is surprising,
Every moment fresh and true.

[Chorus]
${request.theme}, ${request.theme},
Let it carry us away.
${request.theme}, ${request.theme},
Light the fire, make it stay.

[Verse 2]
Through the shadows and the doubt within,
${genreName} flows like wind beneath my skin.
Every note a step along the way,
Turning yesterday to today.

[Bridge]
(Hold on, let it go Ã¢â‚¬â€ the feeling you know,
${request.theme} is the rhythm of the soul.)

[Outro]
(Fade out Ã¢â‚¬â€ ${defs.productionStyle})

PRODUCTION NOTES:
${genreName} track in ${defs.typicalKey} at ${defs.typicalBpm} BPM. ${defs.productionStyle}. 
Vocal style: ${request.vocalStyle.replace(/_/g, ' ')}. Arrange for maximum emotional impact.`
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main Pipeline Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// In-memory cache for artifacts created in the current server process lifetime.
// Production persistence uses the Artifact DB model (see saveMusicArtifactToDB).
const artifactStore = new Map<string, MusicArtifact>()

/**
 * Build a blueprint-only MusicStudioResult without any network or DB calls.
 * Used in test runtime and when no approved audio provider is configured.
 */
export function buildMusicBlueprintResult(request: MusicCreationRequest): MusicStudioResult {
  const primaryGenre = resolveGenre(request)
  const defs = GENRE_DEFAULTS[primaryGenre] ?? GENRE_DEFAULTS.pop
  const bpm = request.bpm || defs.typicalBpm
  const rawLyrics = request.existingLyrics?.trim() || buildFallbackLyrics(request)
  const lyricsResult = parseLyricsOutput(
    rawLyrics,
    request,
    request.existingLyrics?.trim() ? 'user_provided' : 'template',
  )
  const artifact: MusicArtifact = {
    id: randomUUID(),
    appSlug: request.appSlug,
    title: lyricsResult.title,
    genre: primaryGenre,
    vocalStyle: request.vocalStyle,
    theme: request.theme,
    durationSeconds: request.durationSeconds ?? 180,
    bpm,
    audioUrl: null,
    audioMimeType: null,
    artifactType: 'blueprint_only',
    lyrics: lyricsResult.lyrics,
    structure: lyricsResult.structure,
    coverArtUrl: null,
    musicProvider: 'blueprint_only',
    lyricsModel: lyricsResult.model,
    coverArtModel: null,
    generatedAt: new Date().toISOString(),
    tags: [
      primaryGenre,
      ...((request.genres ?? []).slice(1)),
      request.vocalStyle,
      request.theme.toLowerCase().slice(0, 20),
    ].filter(Boolean),
  }
  return {
    artifact,
    lyrics: lyricsResult,
    status: 'blueprint_only',
    message: 'Lyrics and song blueprint generated. Configure GENX_MUSIC_MODEL and GenX credentials for real audio generation.',
  }
}

/**
 * Full music creation pipeline:
 * 1. Generate lyrics + structure
 * 2. Attempt real audio generation
 * 3. Optionally generate cover art
 * 4. Assemble and store the artifact
 */
export async function createMusic(
  request: MusicCreationRequest,
): Promise<MusicStudioResult> {
  // Validate and normalise multi-genre/mood inputs
  validateMusicRequest(request)

  // ── Fast-path: test runtime or no approved audio provider ────────────────
  // Return a blueprint result immediately without any network or DB calls.
  if (IS_TEST_RUNTIME) {
    return buildMusicBlueprintResult(request)
  }

  const primaryGenre = resolveGenre(request)
  const defs = GENRE_DEFAULTS[primaryGenre] ?? GENRE_DEFAULTS.pop
  const bpm = request.bpm || defs.typicalBpm

  // Step 1: Use existing lyrics or generate them
  let rawLyrics: string
  let lyricsModel: string
  if (request.existingLyrics?.trim()) {
    rawLyrics = request.existingLyrics
    lyricsModel = 'user_provided'
  } else {
    const result = await generateLyricsViaChat(request)
    rawLyrics = result.lyrics
    lyricsModel = result.model
  }
  const lyricsResult = parseLyricsOutput(rawLyrics, request, lyricsModel)

  // Step 2: Attempt audio generation
  const audioResult = await generateAudio(request, lyricsResult)

  // Step 3: Optional cover art Ã¢â‚¬â€ honour coverArtChoice (defaults to "auto")
  let coverArtUrl: string | null = null
  let coverArtModel: string | null = null
  const coverArtChoice = request.coverArtChoice ?? (request.generateCoverArt === false ? 'none' : 'auto')
  if (coverArtChoice === 'auto') {
    const art = await generateCoverArt(lyricsResult, request)
    if (art) {
      coverArtUrl = art.url
      coverArtModel = art.model
    }
  }

  const artifactType = audioResult ? 'generated_audio' : 'blueprint_only'

  const artifact: MusicArtifact = {
    id: randomUUID(),
    appSlug: request.appSlug,
    title: lyricsResult.title,
    genre: primaryGenre,
    vocalStyle: request.vocalStyle,
    theme: request.theme,
    durationSeconds: request.durationSeconds ?? 180,
    bpm,
    audioUrl: audioResult?.audioUrl ?? null,
    audioMimeType: audioResult?.mimeType ?? null,
    artifactType,
    lyrics: lyricsResult.lyrics,
    structure: lyricsResult.structure,
    coverArtUrl,
    musicProvider: audioResult?.provider ?? 'blueprint_only',
    lyricsModel,
    coverArtModel,
    generatedAt: new Date().toISOString(),
    tags: [
      primaryGenre,
      ...((request.genres ?? []).slice(1)),
      request.vocalStyle,
      request.theme.toLowerCase().slice(0, 20),
    ].filter(Boolean),
  }

  artifactStore.set(artifact.id, artifact)
  // Persist to DB for production durability
  artifact.id = await saveCanonicalMusicArtifact(artifact)

  return {
    artifact,
    lyrics: lyricsResult,
    status: audioResult ? 'generated' : 'blueprint_only',
    message: audioResult
      ? `Music generated via ${audioResult.provider}. Audio and lyrics available.`
      : 'Lyrics and song blueprint generated. Configure and test GenX for audio generation.',
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Lyrics-only Pipeline Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

/** Generate only lyrics and song structure (no audio generation). */
export async function generateLyrics(
  request: MusicCreationRequest,
): Promise<LyricsResult> {
  const { lyrics: rawLyrics, model } = await generateLyricsViaChat(request)
  return parseLyricsOutput(rawLyrics, request, model)
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Artifact Accessors Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// These are async wrappers over DB reads with an in-memory cache for
// artifacts created in the current server process lifetime.

export function getMusicArtifact(id: string): MusicArtifact | undefined {
  return artifactStore.get(id)
}

export async function getMusicArtifactAsync(id: string): Promise<MusicArtifact | undefined> {
  if (artifactStore.has(id)) return artifactStore.get(id)
  const rows = await loadMusicArtifactsFromDB(undefined, 100)
  return rows.find((a) => a.id === id)
}

export async function getMusicArtifactsByAppAsync(appSlug: string, limit = 20): Promise<MusicArtifact[]> {
  return loadMusicArtifactsFromDB(appSlug, limit)
}

export async function getAllMusicArtifactsAsync(limit = 50): Promise<MusicArtifact[]> {
  return loadMusicArtifactsFromDB(undefined, limit)
}

/** @deprecated Use getMusicArtifactsByAppAsync Ã¢â‚¬â€ falls back to in-process cache only */
export function getMusicArtifactsByApp(appSlug: string, limit = 20): MusicArtifact[] {
  return Array.from(artifactStore.values())
    .filter((a) => a.appSlug === appSlug)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit)
}

/** @deprecated Use getAllMusicArtifactsAsync Ã¢â‚¬â€ falls back to in-process cache only */
export function getAllMusicArtifacts(limit = 50): MusicArtifact[] {
  return Array.from(artifactStore.values())
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit)
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Genre/Style Lists Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export const AVAILABLE_GENRES: Array<{ id: MusicGenre; name: string }> = Object.entries(
  GENRE_DISPLAY,
).map(([id, name]) => ({ id: id as MusicGenre, name }))

export const AVAILABLE_VOCAL_STYLES: Array<{ id: VocalStyle; name: string }> = [
  { id: 'male_lead', name: 'Male Lead Vocal' },
  { id: 'female_lead', name: 'Female Lead Vocal' },
  { id: 'choir', name: 'Choir / Group Vocal' },
  { id: 'rap', name: 'Rap / Spoken' },
  { id: 'spoken_word', name: 'Spoken Word' },
  { id: 'a_cappella', name: 'A Cappella' },
  { id: 'harmonized', name: 'Harmonized Vocals' },
  { id: 'falsetto', name: 'Falsetto' },
  { id: 'instrumental_only', name: 'Instrumental Only' },
]

// Ã¢â€â‚¬Ã¢â€â‚¬ Studio Status Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export interface MusicStudioStatus {
  lyricsGeneration: 'available' | 'needs_key'
  audioGeneration: 'available' | 'needs_key'
  coverArtGeneration: 'available' | 'needs_key'
  audioProvider: MusicProvider | null
  message: string
}

export function getMusicStudioStatus(): MusicStudioStatus {
  const hasChatKey = Boolean(usableKey(process.env.GROQ_API_KEY)) ||
    Boolean(usableKey(process.env.TOGETHER_API_KEY))

  return {
    lyricsGeneration: hasChatKey ? 'available' : 'needs_key',
    audioGeneration: 'needs_key',
    coverArtGeneration: 'needs_key',
    audioProvider: null,
    message: hasChatKey
      ? 'Lyrics and blueprint generation are available. Configure GenX for real audio and cover art.'
      : 'Template blueprint generation is available. Configure an approved text provider and GenX for media.',
  }
}

/**
 * Vault-aware variant of getMusicStudioStatus.
 * Checks the DB vault (Admin Ã¢â€ â€™ AI Providers) first, then environment variable
 * fallbacks. Use this from API routes where async is available.
 */
export async function getMusicStudioStatusAsync(): Promise<MusicStudioStatus & { available: boolean; audioProviderConfigured: boolean; lyricsProviderConfigured: boolean; coverArtProviderConfigured: boolean; configuredProviders: string[]; note: string }> {
  const resolveKey = async (vaultKey: string): Promise<boolean> => {
    const vaultVal = await getVaultApiKey(vaultKey).catch(() => null)
    return Boolean(vaultVal)
  }

  const [hasGroq, hasTogether, hasMimo, genxStatus] = await Promise.all([
    resolveKey('groq'),
    resolveKey('together'),
    resolveKey('mimo'),
    getGenXStatusAsync().catch(() => ({ available: false })),
  ])

  const musicModel = getConfiguredGenXMusicModel()
  const hasGenX = Boolean(genxStatus.available)
  const hasChatKey = hasGenX || hasGroq || hasTogether || hasMimo
  const audioProvider: MusicProvider | null = hasGenX && musicModel ? 'genx' : null

  const configuredProviders: string[] = []
  if (hasGenX) configuredProviders.push('genx')
  if (hasGroq) configuredProviders.push('groq')
  if (hasTogether) configuredProviders.push('together')
  if (hasMimo) configuredProviders.push('mimo')

  const note = hasChatKey
    ? audioProvider
      ? `Lyrics, audio (${audioProvider}), and cover art generation available.`
      : hasGenX && !musicModel
        ? 'Lyrics and blueprint generation are available. Set GENX_MUSIC_MODEL to enable real GenX music audio.'
        : 'Lyrics and blueprint generation are available. Configure GenX for real audio and cover art.'
    : 'Template blueprint generation is available. Configure an approved text provider and GenX for media.'

  return {
    lyricsGeneration: hasChatKey ? 'available' : 'needs_key',
    audioGeneration: audioProvider ? 'available' : 'needs_key',
    coverArtGeneration: hasGenX ? 'available' : 'needs_key',
    audioProvider,
    message: note,
    available: hasChatKey,
    audioProviderConfigured: Boolean(audioProvider),
    lyricsProviderConfigured: hasChatKey,
    coverArtProviderConfigured: hasGenX,
    configuredProviders,
    note,
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Summary Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export async function getMusicStudioSummaryAsync(): Promise<MusicStudioSummary> {
  const all = await loadMusicArtifactsFromDB(undefined, 1000)
  const byGenre: Record<string, number> = {}
  const byAppSlug: Record<string, number> = {}
  const providers = new Set<string>()

  for (const a of all) {
    byGenre[a.genre] = (byGenre[a.genre] ?? 0) + 1
    byAppSlug[a.appSlug] = (byAppSlug[a.appSlug] ?? 0) + 1
    if (a.musicProvider !== 'blueprint_only') providers.add(a.musicProvider)
  }

  return {
    totalCreated: all.length,
    byGenre,
    byAppSlug,
    lastCreatedAt: all[0]?.generatedAt ?? null,
    providersUsed: Array.from(providers),
  }
}

/** @deprecated Use getMusicStudioSummaryAsync */
export function getMusicStudioSummary(): MusicStudioSummary {
  const all = Array.from(artifactStore.values())
  const byGenre: Record<string, number> = {}
  const byAppSlug: Record<string, number> = {}
  const providers = new Set<string>()

  for (const a of all) {
    byGenre[a.genre] = (byGenre[a.genre] ?? 0) + 1
    byAppSlug[a.appSlug] = (byAppSlug[a.appSlug] ?? 0) + 1
    if (a.musicProvider !== 'blueprint_only') providers.add(a.musicProvider)
  }

  return {
    totalCreated: all.length,
    byGenre,
    byAppSlug,
    lastCreatedAt: all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]?.generatedAt ?? null,
    providersUsed: Array.from(providers),
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Async Job API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
//
// Provides a fire-and-poll pattern for music generation jobs.
// The job record is created immediately and returns a jobId.
// The actual generation runs in the background (via setImmediate).
// Clients poll GET /api/admin/music-studio/jobs/[jobId] for status.

export type MusicJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface MusicJobRecord {
  id: string
  appSlug: string
  status: MusicJobStatus
  title: string
  theme: string
  genres: MusicGenre[]
  moods: string[]
  vocalStyle: VocalStyle
  bpm: number
  language: string
  durationSeconds: number
  instrumental: boolean
  coverArtChoice: 'auto' | 'custom' | 'none'
  artifactId: string | null
  result: MusicStudioResult | null
  errorMessage: string | null
  provider: string
  model: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Create an async music generation job record and start processing in the background. */
export async function createMusicJob(request: MusicCreationRequest): Promise<MusicJobRecord> {
  validateMusicRequest(request)

  const primaryGenre = resolveGenre(request)
  const genres = request.genres ?? [primaryGenre]

  let jobId: string
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.musicGenerationJob.create({
      data: {
        appSlug: request.appSlug,
        status: 'pending',
        title: request.title ?? '',
        theme: request.theme,
        genres: JSON.stringify(genres),
        moods: JSON.stringify(request.moods ?? []),
        vocalStyle: request.vocalStyle,
        bpm: request.bpm ?? 0,
        language: request.language ?? 'en',
        durationSeconds: request.durationSeconds ?? 180,
        instrumental: request.instrumental ?? (request.vocalStyle === 'instrumental_only'),
        coverArtChoice: request.coverArtChoice ?? 'auto',
        existingLyrics: request.existingLyrics ?? '',
        productionNotes: request.productionNotes ?? '',
        provider: 'genx',
        model: getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL',
      },
    })
    jobId = row.id
  } catch {
    // DB not available Ã¢â‚¬â€ fall back to a random ID (in-memory only)
    jobId = randomUUID()
  }

  // Fire-and-forget background processing (non-blocking)
  setImmediate(() => {
    void processMusicJobBackground(jobId, request)
  })

  return {
    id: jobId,
    appSlug: request.appSlug,
    status: 'pending',
    title: request.title ?? '',
    theme: request.theme,
    genres,
    moods: request.moods ?? [],
    vocalStyle: request.vocalStyle,
    bpm: request.bpm ?? 0,
    language: request.language ?? 'en',
    durationSeconds: request.durationSeconds ?? 180,
    instrumental: request.instrumental ?? (request.vocalStyle === 'instrumental_only'),
    coverArtChoice: request.coverArtChoice ?? 'auto',
    artifactId: null,
    result: null,
    errorMessage: null,
    provider: 'genx',
    model: getConfiguredGenXMusicModel() ?? 'GENX_MUSIC_MODEL',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  }
}

/** Run the full music creation pipeline for a job and update its DB record. */
async function processMusicJobBackground(
  jobId: string,
  request: MusicCreationRequest,
): Promise<void> {
  let prismaClient: import('@prisma/client').PrismaClient | null = null
  try {
    const mod = await import('@/lib/prisma')
    prismaClient = mod.prisma as import('@prisma/client').PrismaClient
    await prismaClient.musicGenerationJob.update({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date() },
    })
  } catch { /* DB may not be available */ }

  try {
    const result = await createMusic(request)
    if (result.status !== 'generated' || !result.artifact.audioUrl) {
      throw new Error('Music provider returned no playable audio. A planning artifact may have been saved, but no completed song was created.')
    }
    if (prismaClient) {
      await prismaClient.musicGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          artifactId: result.artifact.id,
          resultJson: JSON.stringify(result),
          provider: result.artifact.musicProvider,
          model: result.artifact.lyricsModel,
          completedAt: new Date(),
        },
      })
    }
  } catch (err) {
    if (prismaClient) {
      await prismaClient.musicGenerationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          completedAt: new Date(),
        },
      }).catch(() => { /* ignore */ })
    }
  }
}

/** Fetch a music generation job by ID. Returns null if not found. */
export async function getMusicJob(jobId: string): Promise<MusicJobRecord | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.musicGenerationJob.findUnique({ where: { id: jobId } })
    if (!row) return null
    let result: MusicStudioResult | null = null
    if (row.resultJson) {
      try { result = JSON.parse(row.resultJson) as MusicStudioResult } catch { /* ignore */ }
    }
    return {
      id: row.id,
      appSlug: row.appSlug,
      status: row.status as MusicJobStatus,
      title: row.title,
      theme: row.theme,
      genres: safeParseJson<MusicGenre[]>(row.genres, []),
      moods: safeParseJson<string[]>(row.moods, []),
      vocalStyle: row.vocalStyle as VocalStyle,
      bpm: row.bpm,
      language: row.language,
      durationSeconds: row.durationSeconds,
      instrumental: row.instrumental,
      coverArtChoice: row.coverArtChoice as 'auto' | 'custom' | 'none',
      artifactId: row.artifactId ?? null,
      result,
      errorMessage: row.errorMessage ?? null,
      provider: row.provider,
      model: row.model,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
    }
  } catch {
    return null
  }
}

/** Cancel a pending or processing music job. Returns false if job not found or already terminal. */
export async function cancelMusicJob(jobId: string): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.musicGenerationJob.findUnique({ where: { id: jobId } })
    if (!row) return false
    if (row.status === 'completed' || row.status === 'failed' || row.status === 'cancelled') return false
    await prisma.musicGenerationJob.update({
      where: { id: jobId },
      data: { status: 'cancelled', completedAt: new Date() },
    })
    return true
  } catch {
    return false
  }
}

/** Retry a failed or cancelled job. Returns the new job record or null on error. */
export async function retryMusicJob(jobId: string): Promise<MusicJobRecord | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.musicGenerationJob.findUnique({ where: { id: jobId } })
    if (!row) return null
    if (row.status !== 'failed' && row.status !== 'cancelled') return null

    const request: MusicCreationRequest = {
      appSlug: row.appSlug,
      title: row.title || undefined,
      theme: row.theme,
      genre: safeParseJson<MusicGenre[]>(row.genres, ['pop'])[0] ?? 'pop',
      genres: safeParseJson<MusicGenre[]>(row.genres, ['pop']),
      moods: safeParseJson<string[]>(row.moods, []),
      vocalStyle: row.vocalStyle as VocalStyle,
      bpm: row.bpm || undefined,
      language: row.language,
      durationSeconds: row.durationSeconds,
      instrumental: row.instrumental,
      coverArtChoice: row.coverArtChoice as 'auto' | 'custom' | 'none',
      existingLyrics: row.existingLyrics || undefined,
      productionNotes: row.productionNotes || undefined,
    }

    return createMusicJob(request)
  } catch {
    return null
  }
}

/** List music generation jobs, optionally filtered by appSlug. */
export async function listMusicJobs(
  appSlug?: string,
  limit = 20,
): Promise<MusicJobRecord[]> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.musicGenerationJob.findMany({
      where: appSlug ? { appSlug } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map(row => {
      let result: MusicStudioResult | null = null
      if (row.resultJson) {
        try { result = JSON.parse(row.resultJson) as MusicStudioResult } catch { /* ignore */ }
      }
      return {
        id: row.id,
        appSlug: row.appSlug,
        status: row.status as MusicJobStatus,
        title: row.title,
        theme: row.theme,
        genres: safeParseJson<MusicGenre[]>(row.genres, []),
        moods: safeParseJson<string[]>(row.moods, []),
        vocalStyle: row.vocalStyle as VocalStyle,
        bpm: row.bpm,
        language: row.language,
        durationSeconds: row.durationSeconds,
        instrumental: row.instrumental,
        coverArtChoice: row.coverArtChoice as 'auto' | 'custom' | 'none',
        artifactId: row.artifactId ?? null,
        result,
        errorMessage: row.errorMessage ?? null,
        provider: row.provider,
        model: row.model,
        createdAt: row.createdAt.toISOString(),
        startedAt: row.startedAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
      }
    })
  } catch {
    return []
  }
}
