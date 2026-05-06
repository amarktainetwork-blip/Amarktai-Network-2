import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  listArtifacts,
  getArtifact,
  getArtifactCounts,
  deleteArtifact,
  createArtifact,
  type ArtifactType,
  type ArtifactStatus,
} from '@/lib/artifact-store'
import { verifyStorage } from '@/lib/storage-driver'
import {
  appendRecord,
  listRecords,
  checkWritable,
  getStorageRoot,
  LOCAL_STORE_FILES,
} from '@/lib/local-json-store'

interface LocalArtifactMeta {
  id: string
  appSlug: string
  type: string
  subType: string
  title: string
  description: string
  provider: string
  model: string
  status: string
  mimeType: string
  metadata: Record<string, unknown>
  createdAt: string
  driver: 'local_meta'
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  const id = searchParams.get('id')
  if (id) {
    // Try DB
    try {
      const artifact = await getArtifact(id)
      if (artifact) return NextResponse.json({ artifact })
    } catch { /* ignore */ }
    // Try local
    const locals = listRecords<LocalArtifactMeta>(LOCAL_STORE_FILES.artifacts)
    const local = locals.find((a) => a.id === id)
    if (!local) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ artifact: local })
  }

  if (searchParams.has('counts')) {
    const appSlug = searchParams.get('appSlug') ?? undefined
    // Try DB
    try {
      const counts = await getArtifactCounts(appSlug)
      return NextResponse.json({ counts })
    } catch { /* ignore */ }
    // Local fallback
    const locals = listRecords<LocalArtifactMeta>(LOCAL_STORE_FILES.artifacts)
    const filtered = appSlug ? locals.filter((a) => a.appSlug === appSlug) : locals
    const counts: Record<string, number> = {}
    for (const a of filtered) {
      counts[a.type] = (counts[a.type] ?? 0) + 1
    }
    return NextResponse.json({ counts })
  }

  if (searchParams.has('storage-info')) {
    // Check both storage driver and local store
    const localCheck = checkWritable(LOCAL_STORE_FILES.artifacts)
    let driverInfo: Awaited<ReturnType<typeof verifyStorage>> | null = null
    try { driverInfo = await verifyStorage() } catch { /* ignore */ }

    const localWorking = localCheck.writable
    return NextResponse.json({
      storageDriver: driverInfo?.driver ?? 'local_vps',
      storageRoot: driverInfo?.basePath ?? localCheck.root,
      persistent: driverInfo?.persistent ?? localWorking,
      configured: driverInfo?.configured ?? localWorking,
      writable: driverInfo?.writable ?? localWorking,
      localVpsWritable: localWorking,
      localVpsRoot: localCheck.root,
      localVpsFile: LOCAL_STORE_FILES.artifacts,
      requiredDriver: driverInfo?.requiredDriver ?? 'local_vps',
      requiredRoot: driverInfo?.requiredRoot ?? getStorageRoot(),
      requiredDirectories: driverInfo?.requiredDirectories ?? [],
      directories: driverInfo?.directories ?? [],
      missingSetup: driverInfo?.missingSetup ?? (localWorking ? [] : ['storage directory not writable']),
      warning: (driverInfo?.configured ?? localWorking) ? null : (driverInfo?.error ?? driverInfo?.note ?? null),
    })
  }

  const appSlug = searchParams.get('appSlug') ?? undefined
  const typeFilter = (searchParams.get('type') ?? undefined) as ArtifactType | undefined
  const statusFilter = (searchParams.get('status') ?? undefined) as ArtifactStatus | undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50') || 50, 200)
  const offset = parseInt(searchParams.get('offset') ?? '0') || 0

  // Try DB
  try {
    const result = await listArtifacts({ appSlug, type: typeFilter, status: statusFilter, limit, offset })
    // Merge local metadata artifacts (ones without DB backing)
    const localMetas = listRecords<LocalArtifactMeta>(LOCAL_STORE_FILES.artifacts)
    const localFiltered = localMetas
      .filter((a) => (!appSlug || a.appSlug === appSlug) && (!typeFilter || a.type === typeFilter))
    return NextResponse.json({
      artifacts: [...result.artifacts, ...localFiltered],
      total: result.total + localFiltered.length,
      driver: 'db+local',
    })
  } catch { /* ignore */ }

  // Local VPS fallback — always return empty array (not blocked)
  const locals = listRecords<LocalArtifactMeta>(LOCAL_STORE_FILES.artifacts)
  const filtered = locals.filter(
    (a) => (!appSlug || a.appSlug === appSlug) && (!typeFilter || a.type === typeFilter),
  )
  return NextResponse.json({ artifacts: filtered, total: filtered.length, driver: 'local_vps' })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = body.type as ArtifactType | undefined
  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 })
  }

  const rawContentBase64 = body.contentBase64 as string | undefined
  const rawContentUrl = body.contentUrl as string | undefined

  let content: Buffer | undefined
  let contentUrl: string | undefined = rawContentUrl
  let mimeType = body.mimeType as string | undefined

  if (rawContentBase64 && typeof rawContentBase64 === 'string') {
    content = Buffer.from(rawContentBase64, 'base64')
  } else if (rawContentUrl && typeof rawContentUrl === 'string' && rawContentUrl.startsWith('data:')) {
    const match = rawContentUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mimeType = mimeType ?? match[1]
      content = Buffer.from(match[2], 'base64')
      contentUrl = undefined
    }
  } else if (rawContentUrl && typeof rawContentUrl === 'string' && rawContentUrl.startsWith('http')) {
    const allowedCdnHostnames = [
      'oaidalleapi.blob.core.windows.net',
      'openai.com',
      'replicate.delivery',
      'pbxt.replicate.delivery',
      'api.together.xyz',
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
    ]
    let fetchAllowed = false
    try {
      const parsed = new URL(rawContentUrl)
      if (parsed.protocol === 'https:') {
        fetchAllowed = allowedCdnHostnames.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
        )
      }
    } catch {
      fetchAllowed = false
    }
    if (fetchAllowed) {
      try {
        const fetchRes = await fetch(rawContentUrl, { signal: AbortSignal.timeout(20_000) })
        if (fetchRes.ok) {
          const buf = Buffer.from(await fetchRes.arrayBuffer())
          const ct = fetchRes.headers.get('content-type') ?? undefined
          if (buf.length > 0) {
            content = buf
            mimeType = mimeType ?? ct
            contentUrl = undefined
          }
        }
      } catch {
        // createArtifact will reject unpersisted external URLs instead of claiming success.
      }
    }
  }

  try {
    const artifact = await createArtifact({
      appSlug: (body.appSlug as string) || 'workspace',
      type,
      subType: body.subType as string | undefined,
      title: body.title as string | undefined,
      description: body.description as string | undefined,
      provider: body.provider as string | undefined,
      model: body.model as string | undefined,
      traceId: body.traceId as string | undefined,
      mimeType,
      costUsdCents: typeof body.costUsdCents === 'number' ? body.costUsdCents : undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
      content,
      contentUrl,
    })
    return NextResponse.json({ artifact }, { status: 201 })
  } catch {
    // Artifact store failed — save metadata-only to local VPS store
    try {
      const meta: Omit<LocalArtifactMeta, 'id'> = {
        appSlug: (body.appSlug as string) || 'workspace',
        type: type as string,
        subType: (body.subType as string) ?? '',
        title: (body.title as string) ?? '',
        description: (body.description as string) ?? '',
        provider: (body.provider as string) ?? 'manual',
        model: (body.model as string) ?? '',
        status: 'completed',
        mimeType: mimeType ?? 'application/octet-stream',
        metadata: (body.metadata as Record<string, unknown>) ?? {},
        createdAt: new Date().toISOString(),
        driver: 'local_meta',
      }
      const saved = appendRecord(LOCAL_STORE_FILES.artifacts, meta)
      return NextResponse.json({ artifact: saved, driver: 'local_vps' }, { status: 201 })
    } catch (localErr) {
      return NextResponse.json(
        { error: localErr instanceof Error ? localErr.message : 'Failed to create artifact' },
        { status: 500 },
      )
    }
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Artifact id required' }, { status: 400 })
  }

  const deleted = await deleteArtifact(body.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found or delete failed' }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
