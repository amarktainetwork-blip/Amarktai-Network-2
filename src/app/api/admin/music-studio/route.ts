import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import {
  AVAILABLE_GENRES,
  AVAILABLE_VOCAL_STYLES,
  getAllMusicArtifactsAsync,
  getMusicArtifactAsync,
  getMusicArtifactsByAppAsync,
  getMusicStudioStatusAsync,
  getMusicStudioSummaryAsync,
  listMusicJobs,
  validateMusicRequest,
  type MusicCreationRequest,
} from '@/lib/music-studio'
import { getSession } from '@/lib/session'

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
    const jobs = await listMusicJobs(appSlug ?? undefined, limit)
    return NextResponse.json({ jobs, count: jobs.length })
  }
  if (id) {
    const artifact = await getMusicArtifactAsync(id)
    return artifact
      ? NextResponse.json({ artifact })
      : NextResponse.json({ error: `Artifact not found: ${id}` }, { status: 404 })
  }

  const artifacts = appSlug
    ? await getMusicArtifactsByAppAsync(appSlug, limit)
    : await getAllMusicArtifactsAsync(limit)
  return NextResponse.json({
    artifacts,
    count: artifacts.length,
    status: await getMusicStudioStatusAsync(),
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    action?: 'create' | 'create_async' | 'lyrics_only'
    request?: Partial<MusicCreationRequest> & { executionId?: string }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const musicRequest = normalizeMusicRequest(body.request)
  if (!musicRequest) {
    return NextResponse.json(
      { error: 'Required fields: theme, genre (or genres[]), vocalStyle, appSlug' },
      { status: 400 },
    )
  }

  try {
    validateMusicRequest(musicRequest)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 },
    )
  }

  const action = body.action ?? 'create'
  const capability = action === 'lyrics_only' ? 'lyrics_generation' : 'music_generation'
  const result = await executeCapability({
    capability,
    input: musicPrompt(musicRequest, action),
    appId: musicRequest.appSlug,
    saveArtifact: true,
    metadata: {
      executionId: body.request?.executionId ?? null,
      genres: musicRequest.genres ?? [musicRequest.genre],
      moods: musicRequest.moods ?? [],
      vocalStyle: musicRequest.vocalStyle,
      instrumental: musicRequest.instrumental,
      durationSeconds: musicRequest.durationSeconds,
      productionNotes: musicRequest.productionNotes,
      source: 'music_studio',
    },
  })

  const processing = result.status === 'processing' || Boolean(result.providerJobId)
  const requiresMusicArtifact = capability === 'music_generation'
  const hasMusicArtifact = Boolean(result.artifactId && result.artifactUrl)
  const missingMusicArtifact = requiresMusicArtifact && result.success && !processing && !hasMusicArtifact
  const completed = result.success && !processing && (!requiresMusicArtifact || hasMusicArtifact)
  const status = completed ? 201 : processing ? 202 : readinessStatus(result.readiness)
  const artifactError = missingMusicArtifact
    ? 'Music generation completed without a downloadable audio artifact.'
    : null
  return NextResponse.json({
    ...result,
    success: missingMusicArtifact ? false : result.success,
    executed: result.success && !missingMusicArtifact,
    jobStatus: processing ? 'processing' : completed ? 'completed' : 'failed',
    storageUrl: result.artifactUrl ?? null,
    audioUrl: completed && capability === 'music_generation' ? result.artifactUrl ?? null : null,
    musicUrl: completed && capability === 'music_generation' ? result.artifactUrl ?? null : null,
    error: artifactError ?? result.error ?? null,
    blocker: artifactError ?? result.error ?? null,
  }, { status: missingMusicArtifact ? 502 : status })
}

function normalizeMusicRequest(
  request: Partial<MusicCreationRequest> | undefined,
): MusicCreationRequest | null {
  if (!request) return null
  const genre = request.genre ?? request.genres?.[0]
  if (!request.theme || !genre || !request.vocalStyle || !request.appSlug) return null
  return { ...request, genre } as MusicCreationRequest
}

function musicPrompt(
  request: MusicCreationRequest,
  action: 'create' | 'create_async' | 'lyrics_only',
): string {
  const genres = (request.genres ?? [request.genre]).join(', ')
  const existingLyrics = request.existingLyrics?.trim()
  if (action === 'lyrics_only') {
    return `Write complete song lyrics about ${request.theme}. Genre: ${genres}. Vocal style: ${request.vocalStyle}.`
  }
  return [
    request.title ?? request.theme,
    request.theme,
    `Genre: ${genres}`,
    `Vocal style: ${request.vocalStyle}`,
    existingLyrics ? `Lyrics:\n${existingLyrics}` : '',
  ].filter(Boolean).join('\n\n')
}

function readinessStatus(readiness: string): number {
  if (readiness === 'BLOCKED') return 403
  if (readiness === 'NEEDS_INPUT') return 400
  if (readiness === 'NEEDS_CONFIGURATION') return 503
  return 502
}
