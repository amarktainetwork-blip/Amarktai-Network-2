import { NextRequest, NextResponse } from 'next/server'
import { filterArtifactsByAppPolicy } from '@/lib/artifact-policy'
import { listArtifacts } from '@/lib/artifact-store'
import { getSession } from '@/lib/session'

const MEDIA_TYPES = new Set(['image', 'audio', 'music', 'video', 'voice', 'avatar'])

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const appSlug = searchParams.get('appSlug') || undefined
  const provider = searchParams.get('provider') || undefined
  const capability = searchParams.get('capability') || undefined
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 200)
  try {
    const result = await listArtifacts({ appSlug, capability, limit: 200 })
    const policyVisible = await filterArtifactsByAppPolicy(result.artifacts)
    const artifacts = policyVisible
      .filter((artifact) => MEDIA_TYPES.has(artifact.type))
      .filter((artifact) => !provider || artifact.provider === provider)
      .slice(0, limit)
    return NextResponse.json({
      success: true,
      appSlug: appSlug ?? 'all',
      provider: provider ?? 'all',
      capability: capability ?? 'all',
      count: artifacts.length,
      artifacts,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      artifacts: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Artifact store unavailable',
    }, { status: 503 })
  }
}
