import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  createMusic,
  listMusicJobs,
  generateLyrics,
  getMusicArtifactAsync,
  getMusicArtifactsByAppAsync,
  getAllMusicArtifactsAsync,
  getMusicStudioStatusAsync,
  getMusicStudioSummaryAsync,
  validateMusicRequest,
  AVAILABLE_GENRES,
  AVAILABLE_VOCAL_STYLES,
  type MusicCreationRequest,
} from '@/lib/music-studio'
import { callGenXMedia, GENX_AUDIO_MODELS } from '@/lib/genx-client'
import { createArtifact } from '@/lib/artifact-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'

/**
 * GET /api/admin/music-studio
 *
 * Query params:
 *   id       - get a single artifact by ID
 *   appSlug  - filter artifacts by app
 *   summary  - return summary stats only
 *   status   - return music studio status (vault-aware async check)
 *   genres   - return available genres
 *   styles   - return available vocal styles
 *   limit    - max results (default 20)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const appSlug = searchParams.get('appSlug')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100)

  if (searchParams.has('status')) {
    // Use vault-aware async check so keys configured via Admin UI are discovered
    return NextResponse.json({ status: await getMusicStudioStatusAsync() })
  }

  if (searchParams.has('summary')) {
    return NextResponse.json({ summary: await getMusicStudioSummaryAsync() })
  }

  if (searchParams.has('genres')) {
    return NextResponse.json({ genres: AVAILABLE_GENRES })
  }

  if (searchParams.has('styles')) {
    return NextResponse.json({ styles: AVAILABLE_VOCAL_STYLES })
  }

  if (searchParams.has('jobs')) {
    // List async music generation jobs
    const jobs = await listMusicJobs(appSlug ?? undefined, limit)
    return NextResponse.json({ jobs, count: jobs.length })
  }

  if (id) {
    const artifact = await getMusicArtifactAsync(id)
    if (!artifact) {
      return NextResponse.json({ error: `Artifact not found: ${id}` }, { status: 404 })
    }
    return NextResponse.json({ artifact })
  }

  const artifacts = appSlug
    ? await getMusicArtifactsByAppAsync(appSlug, limit)
    : await getAllMusicArtifactsAsync(limit)

  // Use vault-aware async status for the artifact listing response too
  const status = await getMusicStudioStatusAsync()
  return NextResponse.json({
    artifacts,
    count: artifacts.length,
    status,
  })
}

/**
 * POST /api/admin/music-studio
 *
 * Body:
 *   action: 'create' | 'create_async' | 'lyrics_only'
 *   request: MusicCreationRequest
 *
 * create_async — returns a job record immediately; poll /jobs/[jobId] for status.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string; request?: Partial<MusicCreationRequest> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action = 'create', request: req } = body
  if (!req) {
    return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
  }

  // Require genre OR genres
  const hasGenre = req.genre || (req.genres && req.genres.length > 0)
  if (!req.theme || !hasGenre || !req.vocalStyle || !req.appSlug) {
    return NextResponse.json(
      { error: 'Required fields: theme, genre (or genres[]), vocalStyle, appSlug' },
      { status: 400 },
    )
  }

  // Derive legacy genre from genres[] if only genres[] is provided
  if (!req.genre && req.genres && req.genres.length > 0) {
    req.genre = req.genres[0]
  }

  const musicRequest = req as MusicCreationRequest

  // Validate genre/mood limits before any processing
  try {
    validateMusicRequest(musicRequest)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    if (action === 'lyrics_only') {
      const lyrics = await generateLyrics(musicRequest)
      const artifact = await createArtifact({
        appSlug: musicRequest.appSlug,
        type: 'text',
        subType: 'lyrics',
        capability: 'lyrics_generation',
        title: lyrics.title,
        description: `${musicRequest.genre} / ${musicRequest.vocalStyle}`,
        model: lyrics.model,
        mimeType: 'text/plain',
        content: Buffer.from(lyrics.lyrics, 'utf8'),
        metadata: {
          theme: musicRequest.theme,
          genre: musicRequest.genre,
          vocalStyle: musicRequest.vocalStyle,
        },
      })
      return NextResponse.json({
        success: true, capability: 'lyrics_generation', provider: null, model: null,
        jobStatus: 'completed', artifactId: artifact.id, storageUrl: artifact.storageUrl,
        error: null, blocker: null, lyrics,
      })
    }

    if (action === 'create_async') {
      const status = await getMusicStudioStatusAsync()
      if (!status.audioProviderConfigured) {
        const blocker = 'No connected music/audio provider can start real song generation. Configure and test GenX audio generation.'
        return NextResponse.json({
          success: false,
          capability: 'music_generation',
          provider: null,
          model: null,
          jobStatus: 'needs_setup',
          artifactId: null,
          storageUrl: null,
          error: blocker,
          blocker,
        }, { status: 503 })
      }
      const model = GENX_AUDIO_MODELS[0]
      const prompt = musicRequest.existingLyrics?.trim()
        ? `${musicRequest.title ?? musicRequest.theme}\n\n${musicRequest.existingLyrics}`
        : `${musicRequest.title ?? musicRequest.theme}. ${musicRequest.theme}. ${musicRequest.genre} music, ${musicRequest.vocalStyle.replaceAll('_', ' ')}.`
      const generated = await callGenXMedia({
        model,
        prompt,
        type: 'audio',
        duration: musicRequest.durationSeconds,
        params: {
          style: musicRequest.genre,
          instrumental: musicRequest.instrumental ?? musicRequest.vocalStyle === 'instrumental_only',
        },
      })
      if (!generated.success || (!generated.url && !generated.jobId)) {
        const blocker = generated.error ?? 'Music provider returned no playable audio or trackable provider job.'
        return NextResponse.json({
          success: false, executed: false, capability: 'music_generation', provider: 'genx', model,
          jobStatus: 'failed', jobId: null, pollUrl: null, artifactId: null, storageUrl: null,
          error: blocker, blocker,
        }, { status: 502 })
      }
      if (generated.url) {
        const persisted = await persistCanonicalMediaResult({
          result: generated,
          appSlug: musicRequest.appSlug,
          type: 'music',
          subType: 'generated_audio',
          title: musicRequest.title ?? musicRequest.theme.slice(0, 80),
          description: `${musicRequest.genre} / ${musicRequest.vocalStyle} / ${musicRequest.theme}`,
          provider: 'genx',
          model: generated.model,
          metadata: { capability: 'music_generation', theme: musicRequest.theme, genre: musicRequest.genre },
        })
        return NextResponse.json({
          success: true,
          executed: true,
          capability: 'music_generation',
          provider: 'genx',
          model: generated.model,
          jobStatus: 'completed',
          status: 'completed',
          jobId: null,
          pollUrl: null,
          artifactId: persisted.artifactId,
          storageUrl: persisted.storageUrl,
          audioUrl: persisted.mediaUrl,
          musicUrl: persisted.mediaUrl,
          error: null,
          blocker: null,
          artifact: persisted.artifact,
        }, { status: 201 })
      }
      const job = createLocalMediaJob({
        capability: 'music_generation',
        appSlug: musicRequest.appSlug,
        type: 'music',
        subType: 'generated_audio',
        title: musicRequest.title ?? musicRequest.theme.slice(0, 80),
        description: `${musicRequest.genre} / ${musicRequest.vocalStyle} / ${musicRequest.theme}`,
        prompt,
        provider: 'genx',
        model: generated.model,
        providerJobId: generated.jobId!,
        metadata: { theme: musicRequest.theme, genre: musicRequest.genre, vocalStyle: musicRequest.vocalStyle },
      })
      return NextResponse.json(localMediaJobResponse(job), { status: 202 })
    }

    // action === 'create' (default — synchronous)
    const result = await createMusic(musicRequest)
    const completed = result.status === 'generated' && Boolean(result.artifact.audioUrl)
    return NextResponse.json({
      success: completed,
      capability: 'music_generation',
      provider: result.artifact.musicProvider,
      model: result.artifact.lyricsModel,
      jobStatus: completed ? 'completed' : 'failed',
      artifactId: completed ? result.artifact.id : null,
      planningArtifactId: completed ? null : result.artifact.id,
      storageUrl: completed ? result.artifact.audioUrl : null,
      audioUrl: completed ? result.artifact.audioUrl : null,
      musicUrl: completed ? result.artifact.audioUrl : null,
      error: completed ? null : 'Music provider returned no playable audio.',
      blocker: completed ? null : 'Music provider returned no playable audio. The saved output is a planning artifact, not a completed song.',
      ...result,
    }, { status: completed ? 201 : 502 })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Music studio error'
    return NextResponse.json({
      success: false, capability: 'music_generation', provider: null, model: null,
      jobStatus: 'failed', artifactId: null, storageUrl: null, error, blocker: error,
    }, { status: 500 })
  }
}
