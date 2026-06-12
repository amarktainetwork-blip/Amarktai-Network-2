import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  ARTIFACT_STATUSES,
  ARTIFACT_TYPES,
  createArtifact,
  getArtifactCounts,
  listArtifacts,
} from '@/lib/artifact-store'
import { filterArtifactsByAppPolicy } from '@/lib/artifact-policy'
import { verifyStorage } from '@/lib/storage-driver'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  if (searchParams.has('counts')) {
    const counts = await getArtifactCounts(searchParams.get('appSlug') ?? undefined).catch(() => ({}))
    return NextResponse.json({ counts })
  }
  if (searchParams.has('storage-info')) {
    const storage = await verifyStorage().catch((error) => ({
      configured: false,
      writable: false,
      persistent: false,
      error: error instanceof Error ? error.message : 'Storage check failed',
    }))
    return NextResponse.json({ storage })
  }

  const type = enumParam(searchParams.get('type'), ARTIFACT_TYPES)
  const status = enumParam(searchParams.get('status'), ARTIFACT_STATUSES)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
  try {
    const result = await listArtifacts({
      appSlug: searchParams.get('appSlug') ?? undefined,
      type,
      status,
      capability: searchParams.get('capability') ?? undefined,
      executionId: searchParams.get('executionId') ?? undefined,
      jobId: searchParams.get('jobId') ?? undefined,
      limit,
      offset,
    })
    const artifacts = await filterArtifactsByAppPolicy(result.artifacts)
    return NextResponse.json({
      artifacts,
      total: artifacts.length === result.artifacts.length ? result.total : artifacts.length,
      limit,
      offset,
      empty: artifacts.length === 0,
    })
  } catch (error) {
    return NextResponse.json({
      artifacts: [],
      total: 0,
      limit,
      offset,
      empty: true,
      unavailable: true,
      error: error instanceof Error ? error.message : 'Artifact store unavailable',
    }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const type = enumParam(typeof body?.type === 'string' ? body.type : null, ARTIFACT_TYPES)
  if (!body || !type) return NextResponse.json({ error: 'A valid artifact type is required' }, { status: 400 })

  const decoded = decodeContent(body)
  try {
    const artifact = await createArtifact({
      appSlug: stringValue(body.appSlug) ?? 'workspace',
      appId: stringValue(body.appId),
      executionId: stringValue(body.executionId),
      jobId: stringValue(body.jobId),
      workspaceId: stringValue(body.workspaceId),
      type,
      subType: stringValue(body.subType),
      title: stringValue(body.title),
      description: stringValue(body.description),
      provider: stringValue(body.provider),
      model: stringValue(body.model),
      capability: stringValue(body.capability),
      traceId: stringValue(body.traceId),
      mimeType: decoded.mimeType ?? stringValue(body.mimeType),
      metadata: objectValue(body.metadata),
      content: decoded.content,
      contentUrl: decoded.contentUrl,
      status: enumParam(stringValue(body.status), ARTIFACT_STATUSES) ?? 'completed',
    })
    return NextResponse.json({ artifact }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Artifact persistence failed' },
      { status: 503 },
    )
  }
}

function enumParam<T extends readonly string[]>(value: string | null | undefined, values: T): T[number] | undefined {
  return value && values.includes(value) ? value as T[number] : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function decodeContent(body: Record<string, unknown>): {
  content?: Buffer
  contentUrl?: string
  mimeType?: string
} {
  const contentBase64 = stringValue(body.contentBase64)
  const contentUrl = stringValue(body.contentUrl)
  if (contentBase64) return { content: Buffer.from(contentBase64, 'base64') }
  if (contentUrl?.startsWith('data:')) {
    const match = contentUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (match) return { content: Buffer.from(match[2], 'base64'), mimeType: match[1] }
  }
  return { contentUrl }
}
